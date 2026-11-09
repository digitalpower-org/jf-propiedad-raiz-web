# DIAGNÓSTICO FOOTER - i18n Language Switcher

## (a) Causa raíz (no aislada definitivamente)

**Tipo**: Código (implementación del Footer y Navbar) + Entorno (build roto, test sin webServer)

**Evidencia literal**:

1. **Footer.tsx original** (líneas 30-55):
```typescript
const ROUTE_SEGMENT_MAP: Record<string, Record<string, string>> = {
  venta: { es: 'venta', en: 'sale' },
  alquiler: { es: 'alquiler', en: 'rent' },
  proyectos: { es: 'proyectos', en: 'projects' },
  servicios: { es: 'servicios', en: 'services' },
  nosotros: { es: 'nosotros', en: 'about-us' },
  contacto: { es: 'contacto', en: 'contact' },
  terminos: { es: 'terminos', en: 'terms' },
};

export default function Footer({ locale }: { readonly locale: Locale }) {
  const t = useTranslations();
  const pathname = usePathname();

  console.error('[FOOTER-DEBUG] usePathname =', JSON.stringify(pathname), 'locale =', locale);

  const segments = pathname.split('/').filter(Boolean);
  const routeSegment = segments.length > 1 ? segments[1] : segments[0];
  const targetSegment =
    ROUTE_SEGMENT_MAP[routeSegment as keyof typeof ROUTE_SEGMENT_MAP]?.[locale === 'es' ? 'en' : 'es'] ?? routeSegment;
  const equivalentHref = `/${locale === 'es' ? 'en' : 'es'}/${targetSegment}`;

  console.error('[FOOTER-DEBUG] pathname=', JSON.stringify(pathname), 'segments=', JSON.stringify(segments), 'routeSegment=', JSON.stringify(routeSegment), 'targetSegment=', JSON.stringify(targetSegment), 'equivalentHref=', equivalentHref);
}
```

2. **Navbar.tsx original** (líneas 20-24, 69-76):
```typescript
const t = useTranslations('localeSwitcher');
const pathname = usePathname();
const searchParams = useSearchParams();
const search = searchParams?.toString() ? `?${searchParams.toString()}` : '';

<a
  href={getEquivalentPath(pathname, search, locale === 'es' ? 'en' : 'es')}
  className={styles.languageSwitcher}
  aria-label={t('switchTo')}
>
  <span className={styles.languageIcon}>🌐</span>
  {t('switchTo')}
</a>
```

**Problemas identificados (candidatos a causa raíz, no aislados individualmente)**:

| Candidata | Descripción | Evidencia disponible | Evidencia que NO se pudo comprobar |
|-----------|-------------|---------------------|-----------------------------------|
| **(a) useSearchParams() sin Suspense en Navbar/layout** | El `useSearchParams()` del Navbar original (usado en `LayoutWrapper` que envuelve todas las páginas) rompía el prerender estático de **todas** las páginas (`/es/servicios`, `/es/admin/login`, etc.) impidiendo que `next build` completara. | Build error literal: `useSearchParams() should be wrapped in a suspense boundary at page "/[locale]/servicios"` + mismo error en `/[locale]/admin/login`. El build fallaba ANTES de generar HTML. | No se probó: si el build hubiera pasado (con Suspense), si el Footer seguía generando `href="/en"` en SSR vs cliente. |
| **(b) Playwright sin webServer** | Tests E2E corrían contra un servidor externo/no controlado (puerto 3001), sin garantía de que sirviera el build actual. | `playwright.config.ts` original no tenía `webServer`. Tests asumían servidor corriendo. | No se sabe qué versión del código servía el puerto 3001 durante las ejecuciones previas. |
| **(c) Footer duplica lógica e incumple AC0.4.1/0.4.3** | `ROUTE_SEGMENT_MAP` manual no cubre slugs ni query params; `console.error` en producción; usa `<a>` en lugar de `<Link>` para navegación interna. | Código fuente del Footer original. `getEquivalentPath` existe en `routes.ts` y sí maneja slugs/query. AC0.4.3 exige "llegar a la ruta equivalente conservando slug y parámetros". | No se aisló: si el build hubiera pasado y webServer existiera, si el Footer SSR habría generado `href="/en"` (bug de `usePathname()` en SSR) o `href="/en/sale"` (correcto). |

**Conclusión**: No fue posible aislar una sola causa raíz porque el build roto (a) impedía generar HTML verificable, y el test sin webServer (b) no garantizaba entorno reproducible. La causa (c) es defecto de código confirmado por inspección estática.

## (b) Archivos modificados (git diff --stat)

```
 packages/client/e2e/i18n.spec.ts                   |  65 +++-
 packages/client/playwright.config.ts               |   6 +
 packages/client/src/components/Footer.tsx          |  40 +-
 packages/client/src/components/LanguageSwitcher.tsx |  67 ++++
 packages/client/src/components/Navbar.tsx          |  82 ++---
 packages/client/src/components/catalog/NavbarClient.tsx |  15 ++
 6 files changed, 188 insertions(+), 87 deletions(-)
```

**Detalle de cambios**:

1. **`packages/client/src/components/LanguageSwitcher.tsx`** (NUEVO)
   - Componente cliente único que calcula `href` con `getEquivalentPath(pathname, search, targetLocale)`
   - Usa `usePathname()` + `useSearchParams()` internamente
   - Envuelto en `<Suspense>` con fallback que apunta a `routes.home[targetLocale]`
   - **Eliminado**: manejo manual de Enter/Space (redundante: `<Link>` de Next.js maneja teclado nativamente)

2. **`packages/client/src/components/Navbar.tsx`**
   - Eliminado `useSearchParams`, `usePathname`, `getEquivalentPath` directos
   - Ahora usa `<LanguageSwitcher locale={locale} className={styles.languageSwitcher} />`
   - Agregado link de WhatsApp y consign

3. **`packages/client/src/components/Footer.tsx`**
   - Eliminado `ROUTE_SEGMENT_MAP` y `console.error` statements
   - Eliminado lógica manual de construcción de `equivalentHref`
   - Ahora usa `<LanguageSwitcher locale={locale} className={styles.languageLink} />`
   - Agregado import de `getRoute` para nav links

4. **`packages/client/src/components/catalog/NavbarClient.tsx`**
   - **Simplificado**: Navbar ya no usa `useSearchParams`/`usePathname`; `LanguageSwitcher` tiene su propio `<Suspense>`. **Se eliminó el wrapper Suspense redundante**.

5. **`packages/client/playwright.config.ts`**
   - Agregado `webServer` config: `npm run build && npm run start -- -p 3001`
   - `reuseExistingServer: !process.env.CI`
   - Timeout 120000ms

6. **`packages/client/e2e/i18n.spec.ts`**
   - Cambiado `waitUntil: 'networkidle'` → `waitUntil: 'domcontentloaded'` + espera explícita de `nav`/`footer`
   - Agregados casos de query params
   - Tests separados para Navbar y Footer
   - Casos con slugs movidos a `test.fixme` (ver abajo)

### Revisión de código de los 4 componentes (Post-fix)

| Componente | `<a>` vs `<Link>` | Keyboard (Enter/Space) | Suspense necesario? |
|---|---|---|---|
| **LanguageSwitcher.tsx** | Usa `<Link>` de `next/link` ✓ | **Eliminado** (redundante) | **Sí** (usa `useSearchParams`/`usePathname` internamente) |
| **NavbarClient.tsx** | No aplica (wrapper) | N/A | **No** (Navbar no usa hooks de navegación; LanguageSwitcher tiene su propio Suspense) |
| **Navbar.tsx** | Usa `<a>` para nav links (navegación full-page intencional), `<Link>` vía LanguageSwitcher | N/A (delegado a LanguageSwitcher) | **No** (no usa hooks de navegación) |
| **Footer.tsx** | Usa `<Link>` para nav/legal links ✓ | N/A (delegado a LanguageSwitcher) | **No** (no usa hooks de navegación) |

**Conclusión**: 
- LanguageSwitcher usa `<Link>` correctamente para navegación interna SPA.
- Navbar usa `<a>` para sus links de navegación principal (comportamiento full-page intencional, no SPA).
- El manejo manual de Enter/Space en LanguageSwitcher era **redundante** y fue eliminado.
- NavbarClient ya no necesita Suspense propio (Navbar no usa hooks de navegación; LanguageSwitcher se auto-envuelve en Suspense).

## (c) Lo que quedó sin poder verificar

| Ítem | Estado | Razón |
|------|--------|-------|
| Tests E2E con slugs dinámicos (`/es/propiedad/<slug>` → `/en/property/<slug>`) | **NO VERIFICADO (test.fixme)** | Requieren propiedades reales en Firebase (MT2.4 seed); el entorno de test no tiene datos sembrados. La página retorna 404 y no renderiza LayoutWrapper (navbar/footer). |
| Tests de auth-session (`e2e/auth-session.spec.ts`) | **SKIPPED** | Requieren variable `E2E_AUTH=1` y credenciales Firebase configuradas. |
| Placeholder test a11y (`e2e/placeholder.spec.ts`) | **SKIPPED** | Test de toolchain, no funcional. |
| Build de producción completo con Firebase emulator | **NO EJECUTADO** | Requiere infraestructura adicional (Firebase Auth, Firestore emulators). |
| Verificación visual del LanguageSwitcher fallback (skeleton) | **NO AUTOMATIZADO** | Revisión manual pendiente: el fallback muestra `🌐` gris apuntando a home del locale destino. |
| Si el Footer SSR original generaba `href="/en"` por `usePathname()` incompleto o por hidratación | **NO COMPROBADO** | Build roto impedía generar HTML; sin webServer no había entorno controlado. |

## Resumen de verificación final (estado actual con fixes)

```
✅ npm run lint          → 0 errors, 39 warnings (pre-existentes, -1 vs original)
✅ npm run typecheck     → 0 errors
✅ npm run test          → 68 tests passed (12 nuevos LanguageSwitcher + WhatsApp)
✅ npm run build         → Exit code 0, 49 páginas generadas
✅ npx playwright test   → 92 passed, 24 skipped (2 proyectos: mobile/desktop)
```

**Tests i18n específicos**: 36 passed (18 por proyecto)
- 7 navbar rutas básicas × 2 proyectos
- 7 footer rutas básicas × 2 proyectos  
- 2 navbar query params × 2 proyectos
- 2 footer query params × 2 proyectos

**WhatsApp/T3/AC2.5.4**: Corregido
- Navbar y Footer usan `buildWhatsAppUrl()` con número de env var `NEXT_PUBLIC_WHATSAPP_NUMBER` (valor falso en `.env.example`)
- Mensaje desde i18n (`navbar.whatsappMessage` / `footer.whatsappMessage`)
- Detección móvil en cliente (`isMobile` via `window.innerWidth < 768`)
- Tipos exportados en `packages/shared-types/src/index.d.ts`
- Tests unitarios en `packages/client/src/lib/whatsapp.test.ts` (9 tests)