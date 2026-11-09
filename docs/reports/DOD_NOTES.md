# DOD Notes — Ola 2 (MT2.3, MT2.4, MT3.2)

> Generado: 2026-11-09T21:12:44.471Z
> Git: cfb2607
> Escrito a mano: este archivo contiene notas cualitativas que no se derivan automáticamente.

## Alcance

Este informe cubre la **Ola 2** del plan de desarrollo: MT2.3 (Catálogo público UI), MT2.4 (Seed catálogo) y MT3.2 (Páginas legales).
MT5.1 (Páginas públicas de contenido) está en **Ola 5** y depende de MT2.4 + MT2.3.

## Deudas Abiertas

1. **MT2.4 Seed de catálogo** — Bloquea AC2.1.3, AC2.3.x, AC2.4.x, tests e2e con slugs.
2. **Helper WhatsApp en shared-types (D35)** — Solo tipos `.d.ts`; implementación runtime en `packages/client/src/lib/whatsapp.ts`.
3. **Script `check:i18n` (§2.5)** — No existe; no verificable `jsx-no-literals`.
4. **Lighthouse CI** — No ejecutable en este entorno (Chrome no disponible / servidor inestable).
5. **Axe violations en páginas legales** — Véase §6 para detalles reales.

## Decisiones

- **WhatsApp helper**: `buildWhatsAppUrl` pura en `packages/client/src/lib/whatsapp.ts`; detección móvil en `onClick`.
- **BRAND_NAME**: Constante única en `packages/client/src/lib/brand.ts` (T1).
- **NEXT_PUBLIC_WHATSAPP_NUMBER**: Valor falso en `.env.example` (T2); enlace no renderiza si `null`.
- **Tests skip/fixme**: Usados solo cuando requieren infraestructura pendiente (seed, auth, hamburger).

## Auditoría de IDs de AC

- **AC2.5.1–2.5.4**: Todos tienen IDs en títulos de `whatsapp.test.ts` y se verifican correctamente.
- **AC2.1.1**: Desktop test verifica visibilidad real; mobile test solo comprueba existencia en DOM (CSS display:none) — **PARTIAL**.
- **AC2.1.2**: Timeout en mobile cuando el menú hamburguesa no está implementado (enlace no alcanzable).

## Causa de lhci

Lighthouse CI no puede ejecutarse porque el servidor Next.js no mantiene el puerto abierto de forma estable en este entorno de desarrollo.
