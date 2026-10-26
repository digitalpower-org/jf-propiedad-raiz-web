# JF Propiedad Raíz: Referencia de diseño (DESIGN-SYSTEM)

> **Documento ESTÉTICO no vinculante.** El alcance y los AC vinculantes viven en `docs/TASKS.md`, la fuente de verdad del proyecto. Este archivo es la referencia estética del sitio: colores, tipografía, espaciado, formas y componentes. Cuando este documento se solape con un criterio de aceptación de TASKS, **los AC de TASKS son vinculantes y gana TASKS ante cualquier conflicto**. Nada de lo escrito aquí puede usarse para saltarse un AC.

**Theme:** light

Derivado del sistema de diseño Samara y adaptado a una inmobiliaria local del sur de Medellín y su área de influencia (Envigado, Sabaneta, Itagüí, La Estrella, Caldas, El Poblado y zonas aledañas). Los valores de color provienen del logo y materiales del cliente; los roles, componentes y recomendaciones son interpretados. Las listas de fuentes son independientes, no emparejadas por posición. Los ejemplos HTML son reconstrucciones, no componentes de origen.

El diseño se siente como un plano arquitectónico impreso sobre papel cálido y premium. La autoridad nace de la contención: mucho espacio negativo y una tipografía display de trazo finísimo (Regola Light) en los titulares, que se sienten amplios y serenos en vez de ruidosos. La paleta está estrictamente controlada: un blanco marfil elegante como fondo, tinta casi negra para el texto, un verde bosque profundo (#277730) para todas las acciones primarias, un verde hoja más claro (#559433) como apoyo secundario, y un único amarillo sol vibrante (#f9ea1b), el mismo del sol del logo, usado con extrema moderación como acento de alta visibilidad. El inmueble es el protagonista: fotografía luminosa, natural, rodeada de vegetación. Radios suaves de 12px en tarjetas y botones aportan un toque humano a la precisión geométrica de la tipografía.

## Relación con TASKS.md (vinculante)

Esta tabla armoniza la guía estética con las decisiones cerradas de TASKS. Cada fila es una regla que este documento acata; la guía nunca debe pedir lo que la columna de la derecha prohíbe:

| Tema | Regla vinculante de TASKS |
|---|---|
| Estructura de la portada | Orden cerrado: hero con accesos directos a Venta, Alquiler y Proyectos, franja «Destacadas», vista previa de servicios con CTA hacia `/contacto`, bloque «Nosotros» y, como última sección, los logos de empresas aliadas (AC2.6.1, AC2.6.2, AC2.6.6). |
| Contenido prohibido en portada | Sin mapa, sin estadísticas inventadas, sin testimonios ni carrusel con librería externa (AC2.6.7). |
| Mapa | No hay mapa en la ficha ni en ninguna otra página; el mapa interactivo está fuera de alcance (AC2.4.11). |
| Formularios | El formulario de consignación (`/consigne-su-propiedad`, US3.1) es el único del sitio. La ficha solo lleva su botón de WhatsApp (US2.5, AC2.5.5) y `/contacto` no tiene formulario (AC5.2.3). |
| Teléfonos y direcciones | El repositorio no contiene teléfonos, direcciones ni correos reales (T2) y no hay literales en el código (AC5.2.3). El número de WhatsApp sale de `NEXT_PUBLIC_WHATSAPP_NUMBER` (AC2.5.3), los datos del footer de `NEXT_PUBLIC_CONTACT_*` (AC5.2.1), y todo enlace se construye con el helper `buildWhatsAppUrl` (T3). |
| Navegación | Pestañas Venta, Alquiler, Proyectos y Servicios, más selector de idioma (D8, AC2.1.1). Nosotros y Contacto se alcanzan desde enlaces del footer (AC5.2.1); Contacto también desde el CTA de la portada (AC2.6.2). |
| Buscador | Sin campo de zona ni sector (D24) y sin control de orden (AC2.2.13). La ubicación se elige como departamento y municipio juntos (D9); el orden es fijo, destacados primero y más recientes después, con una etiqueta discreta que lo indica (AC2.2.7). |
| Fuera de alcance v1 | Mapa interactivo, páginas por municipio o barrio, filtro o catálogo de sector, blog, testimonios, cifras de confianza en portada, asesores en portada y formulario dentro de la ficha. |
| Fuentes | Solo `next/font`, subconjunto latino, máximo 2 familias y `font-display: swap` (PERFORMANCE §4, AC7.2.5). La decisión sobre Regola está pendiente (ver Tipografía). |

## Principios para el sector inmobiliario

Estos principios gobiernan las decisiones del sistema por encima del gusto estético, siempre sin contradecir un AC de TASKS:

1. **La búsqueda es la protagonista.** El visitante llega a encontrar un inmueble, no a leer sobre la empresa. El buscador va dentro del hero, sobre el pliegue, en móvil y escritorio.
2. **Confianza antes que espectáculo.** Es una transacción de alto valor y alta confianza. Esa confianza la construyen el contenido real de `/nosotros`, los datos de contacto siempre visibles y fotografía honesta de los inmuebles. Los bloques de testimonios, cifras de confianza y asesores en portada quedan fuera de alcance v1.
3. **Siempre una vía de contacto a la vista.** Ninguna pantalla debe permitir hacer scroll completo sin ver el botón de WhatsApp, construido con el helper `buildWhatsAppUrl` (T3) sobre `NEXT_PUBLIC_WHATSAPP_NUMBER`. La ficha tiene un único botón de WhatsApp (US2.5) y el sitio tiene un solo formulario, el de consignación (US3.1).
4. **Móvil primero.** La mayoría del tráfico llega por celular: objetivos táctiles grandes (mínimo 44px), filtros operables con el pulgar, botón fijo de WhatsApp, navegación colapsable.
5. **Restricción como lujo.** Una tipografía, una paleta corta, espaciado consistente y generoso. La calidad percibida viene de la disciplina, no de efectos.
6. **Fotografía como contenido principal.** Imágenes de alta calidad, luz natural, consistentes entre sí. Una foto mala daña más que cualquier decisión de color.
7. **Autoridad local sin páginas de zona.** El posicionamiento en el sur del Valle de Aburrá se construye con el contenido de `/nosotros`, los servicios y el SEO técnico (sitemap en ambos idiomas, AC2.7.3). Las páginas por municipio o barrio y el blog quedan fuera de alcance v1; si se menciona un barrio o sector, va como texto libre dentro de `descripcion` (D24).
8. **Interacciones sutiles.** Microanimaciones discretas que mejoran la experiencia; nunca abrumadoras ni distractoras.
9. **Legible para buscadores y asistentes de IA.** Fichas con URL propia, encabezados limpios (H1, H2, H3), datos estructurados (schema) y carga rápida. El contenido clave nunca vive dentro de iframes ni se renderiza solo con scripts pesados.

## Tokens: Colors

| Name | Value | Token | Role |
|------|-------|-------|------|
| Verde Bosque | `#277730` | `--color-verde-bosque` | Color principal de acento: CTAs primarios, enlaces, iconografía activa, footer, estados seleccionados. Contraste ≈5.5:1 sobre Marfil Elegante; apto para texto. |
| Verde Hoja | `#559433` | `--color-verde-hoja` | Acento secundario, similar pero más claro: hovers, gráficos, etiquetas, detalles decorativos, iconos grandes. Contraste ≈3.7:1 con blanco: solo para texto grande (≥24px, o ≥18.66px en negrita) y componentes de interfaz; nunca texto pequeño. |
| Amarillo Sol | `#f9ea1b` | `--color-amarillo-sol` | Acento de alta visibilidad, escaso. CTA sobre fondos verdes u oscuros, insignias "Nuevo"/"Destacado", resaltados puntuales. Siempre con texto Tinta. Nunca como texto sobre fondo claro. |
| Tinta | `#111611` | `--color-tinta` | Titulares, texto de cuerpo, etiquetas de interfaz. Negro con matiz verde casi imperceptible. |
| Blanco Puro | `#ffffff` | `--color-blanco-puro` | Texto sobre verde o fondos oscuros, texto de botones primarios. |
| Marfil Elegante | `#fbfbf6` | `--color-marfil-elegante` | Fondo principal de página: el blanco elegante del cliente, cálido y nunca clínico. Derivado del marfil `#ddddd1` aclarado. |
| Piedra Clara | `#ddddd1` | `--color-piedra-clara` | Color de marfil provisto por el cliente. Superficies de tarjetas, bandas de sección alternas, bordes marcados, botones terciarios. |
| Arena Suave | `#efefe6` | `--color-arena-suave` | Punto intermedio entre Marfil Elegante y Piedra Clara. Fondo de tarjetas estándar y campos de entrada. |
| Bruma Verde | `#e7efe3` | `--color-bruma-verde` | Tinte muy claro de Verde Bosque. Chips de filtro seleccionados, fondos de insignias informativas, resaltado de fila. |
| Verde Profundo | `#1f6227` | `--color-verde-profundo` | Estado hover/active del botón primario (Verde Bosque oscurecido). |
| Ceniza | `#d3d3d3` | `--color-ceniza` | Elementos decorativos, estados deshabilitados. |
| Piedra | `#999999` | `--color-piedra` | Bordes sutiles, texto de marcador de posición. |
| Grafito | `#666666` | `--color-grafito` | Texto secundario, metadatos (área, estrato, ubicación). |

### Reglas de uso del color
- Proporción aproximada por pantalla: Marfil/Piedra 80%, Tinta 12%, Verde Bosque 6%, Verde Hoja 1.5%, Amarillo Sol 0.5%.
- El amarillo aparece como máximo una vez por pantalla visible.
- Texto sobre Verde Hoja: solo blanco y solo en tamaños grandes. Para texto pequeño sobre verde, usar Verde Bosque.
- Texto Verde Bosque sobre Amarillo Sol ≈4.5:1: evitarlo; usar Tinta.
- Estado de error recomendado: `#b3261e` (fuera de la paleta de marca, solo para validación de formularios).

## Tokens: Typography

> **Decisión de fuente pendiente:** Regola es una fuente comercial: requiere licencia y self-host para usarse con `next/font`. La alternativa es Plus Jakarta Sans (Google Fonts, que `next/font` igualmente autohospedaja en build). Decidir antes de MT0.4. En cualquier caso se cumple PERFORMANCE §4 / AC7.2.5: solo `next/font`, máximo 2 familias, subconjunto latino y `font-display: swap`.

### regola: fuente firma de todo el sistema. La variante 'light' se usa para titulares grandes y aireados, con una apariencia de confianza serena. Pesos 'book' y 'regular' para cuerpo y UI. Interletrado negativo ajustado en tamaños grandes. `--font-regola`
- **Substitute:** Plus Jakarta Sans (primera alternativa), Manrope (ambas con soporte completo de acentos y ñ). Máximo 2 familias en todo el sitio (AC7.2.5).
- **Weights:** 400 (aliased as 'light', 'book', 'regular'); 500 solo para etiquetas pequeñas de UI y botones
- **Sizes:** 12px, 13px, 14px, 15px, 16px, 18px, 21px, 23px, 29px, 30px, 36px, 43px, 48px, 60px, 96px
- **Line height:** 0.90, 0.96, 1.00, 1.10, 1.12, 1.14, 1.16, 1.20, 1.25, 1.28, 1.33, 1.49, 1.50, 1.60
- **OpenType features:** `"lnum", "tnum"` (numerales lineales y tabulares: imprescindibles para precios, áreas y teléfonos)
- **Role:** Fuente firma del sistema. Titulares con peso ligero y tracking negativo; precios con numerales tabulares.

### Type Scale

| Role | Family | Weight | Size | Line Height | Letter Spacing | Token |
|------|--------|--------|------|-------------|----------------|-------|
| caption-sm | regola | 400 | 12px | 1.5 | -0.48px | `--text-caption-sm` |
| caption | regola | 400 | 14px | 1.5 | -0.56px | `--text-caption` |
| body-sm | regola | 400 | 16px | 1.49 | -0.22px | `--text-body-sm` |
| body | regola | 400 | 18px | 1.33 | -0.18px | `--text-body` |
| body-lg | regola | 400 | 23px | 1.25 | -0.46px | `--text-body-lg` |
| subheading | regola | 400 | 30px | 1.14 | -0.9px | `--text-subheading` |
| heading-sm | regola | 400 | 36px | 1.1 | -0.5px | `--text-heading-sm` |
| heading | regola | 400 | 48px | 1 | -1.3px | `--text-heading` |
| heading-lg | regola | 400 | 60px | 0.96 | -2.46px | `--text-heading-lg` |
| display | regola | 400 | 96px | 0.9 | -4.51px | `--text-display` |

### Adaptaciones para español y móvil
- El español produce titulares más largos que el inglés: usar `display` solo en hero de escritorio y con máximo 4 a 5 palabras. Para titulares largos, bajar a `heading-lg` o `heading`.
- Escala responsiva recomendada en móvil (<640px): display→48px, heading-lg→40px, heading→36px, heading-sm→30px, subheading→26px. Mantener el tracking proporcional (≈ -0.04em en display).
- Precios: `heading-sm` o `body-lg` con `font-variant-numeric: tabular-nums lining-nums`. Formato colombiano con punto como separador de miles: `$ 450.000.000`. Precios de arriendo con sufijo en caption: `$ 2.800.000 / mes`.
- Teléfonos: no se versiona ningún número real en el repo (T2) y no hay literales en el código (AC5.2.3). El valor visible se lee de `NEXT_PUBLIC_WHATSAPP_NUMBER` o `NEXT_PUBLIC_CONTACT_*`; si se formatea, agrupar en bloques de 3, 3 y 4 dígitos.
- Unidades en caption: `m²`, `hab.`, `baños`, `parq.`, `estrato`.

## Tokens: Spacing & Shapes

**Density:** comfortable

### Spacing Scale

| Name | Value | Token |
|------|-------|-------|
| 5 | 5px | `--spacing-5` |
| 6 | 6px | `--spacing-6` |
| 8 | 8px | `--spacing-8` |
| 9 | 9px | `--spacing-9` |
| 10 | 10px | `--spacing-10` |
| 12 | 12px | `--spacing-12` |
| 14 | 14px | `--spacing-14` |
| 15 | 15px | `--spacing-15` |
| 16 | 16px | `--spacing-16` |
| 18 | 18px | `--spacing-18` |
| 24 | 24px | `--spacing-24` |
| 30 | 30px | `--spacing-30` |
| 32 | 32px | `--spacing-32` |
| 36 | 36px | `--spacing-36` |
| 42 | 42px | `--spacing-42` |
| 54 | 54px | `--spacing-54` |

### Border Radius

| Element | Value |
|---------|-------|
| cards | 12px |
| pills | 24px |
| inputs | 12px |
| buttons | 12px |
| specialtyCards | 18px |
| property-media | 12px (imagen de tarjeta, esquinas superiores) |
| search-bar | 18px |

### Shadows

| Name | Value | Token |
|------|-------|-------|
| subtle | `rgba(0, 0, 0, 0.12) 0px 0.5px 2px 0px` | `--shadow-subtle` |
| md | `rgba(0, 0, 0, 0.08) 0px 2px 10px 0px` | `--shadow-md` |
| sm | `rgba(0, 0, 0, 0.2) 0px 2px 4px 0px` | `--shadow-sm` |
| sm-2 | `rgba(0, 0, 0, 0.12) 0px 2px 4px 0px` | `--shadow-sm-2` |
| subtle-2 | `rgba(0, 0, 0, 0.12) 0px 0.5px 1px 0px` | `--shadow-subtle-2` |
| subtle-3 | `rgba(0, 0, 0, 0.2) 0px 0.5px 2px 0px` | `--shadow-subtle-3` |
| search | `rgba(0, 0, 0, 0.08) 0px 8px 30px 0px` | `--shadow-search` (solo el buscador flotante del hero) |

### Layout

- **Page max-width:** 1280px
- **Gutter móvil:** 16px a cada lado, sin scroll horizontal (AC2.1.8)
- **Grillas:** listado de inmuebles 3 columnas (escritorio ≥1024px), 2 (tablet), 1 (móvil)

## Components

### Primary Button
**Role:** Llamada a la acción principal (Ver inmueble, Buscar, Consignar propiedad).

Background: #277730 (Verde Bosque). Text: #ffffff (Blanco Puro). Padding: 14px (mínimo 44px de alto táctil). Radius: 12px. Font: regola, 14 a 15px, peso 500. Hover/active: #1f6227 (Verde Profundo). Focus: anillo de 2px #277730 con offset de 2px.

### Accent CTA Button (Amarillo Sol)
**Role:** CTA de alta visibilidad sobre bandas verdes, el hero oscuro o el footer (Hablemos por WhatsApp, Cotiza tu inmueble). Uno por pantalla como máximo.

Background: #f9ea1b (Amarillo Sol). Text: #111611 (Tinta). Padding: ~8px 18px (14px si es botón principal de sección). Radius: 12px. Hover: oscurecer ~6%. Focus sobre verde: anillo de 2px #ffffff.

### Secondary Button
**Role:** Acción secundaria junto a un primario (Ver todos los inmuebles, Más información).

Background: #ddddd1 (Piedra Clara). Text: #111611 (Tinta). Radius: 12px. Padding: 14px. Hover: fondo #d3d3d3 o borde 1px Verde Bosque.

### Pill Ghost Button
**Role:** Acción sutil o enlace con forma de botón (Compartir, Ver en 360°).

Background: rgba(0, 0, 0, 0.04). Text: #111611 (Tinta). Radius: 24px. Padding variable.

### WhatsApp Button
**Role:** Contacto inmediato; el canal principal de conversión en el mercado local. Presente en header (escritorio), barra fija inferior (móvil), la ficha y footer.

Fijo/flotante: Background #277730, ícono y texto blancos, Radius 24px (pill), altura 48px, shadow `--shadow-sm`. En la ficha: el único botón de WhatsApp de la página, con el texto «Preguntar por este inmueble» (AC2.5.1). El número nunca aparece como literal: sale de `NEXT_PUBLIC_WHATSAPP_NUMBER` y todo enlace lo construye el helper `buildWhatsAppUrl` (T3, AC2.5.3). El mensaje precargado incluye el código y el título del inmueble, en el idioma de la página (AC2.5.2).

### Property Card (Tarjeta de inmueble)
**Role:** Unidad principal del sitio; se repite en listados y destacados.

Background: #efefe6 (Arena Suave) o #ffffff sobre bandas Piedra Clara. Radius: 12px. Shadow: `rgba(0, 0, 0, 0.12) 0px 0.5px 2px 0px`; hover `rgba(0, 0, 0, 0.08) 0px 2px 10px 0px` con elevación de 2px. Padding de contenido: 18 a 24px.

Estructura de arriba hacia abajo:
1. **Imagen** en proporción 4:3 (esquinas superiores 12px), con carrusel discreto en hover/swipe, `loading="lazy"` y dimensiones explícitas. Equivale al derivado de 640 del listado (AC2.2.11).
2. **Insignia** superpuesta arriba a la izquierda: tipo de negocio (Venta o Alquiler) en pill blanco con texto Tinta; "Nuevo" (cuando `isNewProperty(createdAt)` es `true` en el frontend, AC2.2.11) o "Destacado" en pill Amarillo Sol con texto Tinta (máximo una insignia amarilla por tarjeta).
3. **Precio** en `body-lg` o `heading-sm`, peso 400, numerales tabulares. Administración (si aplica) en caption Grafito.
4. **Código y título/ubicación** en body-sm: código del inmueble, tipo de inmueble y municipio (AC2.2.11).
5. **Fila de datos** con íconos lineales Verde Bosque 20px y texto caption: área m², dormitorios, baños y estrato (AC2.2.11).
6. **Acción**: enlace "Ver inmueble" en Verde Bosque o botón de WhatsApp compacto. Toda la tarjeta es clicable.

### Warm Sand Card (Tarjeta Piedra)
**Role:** Variante más cálida y prominente para bloques de servicio y contenido destacado.

Background: #ddddd1 (Piedra Clara) o #efefe6. Radius: 18px. Shadow: `rgba(0, 0, 0, 0.12) 0px 0.5px 2px 0px`. Padding: 36px.

### Search Bar (Buscador del hero)
**Role:** Componente central del sitio; ancla del hero.

Contenedor flotante, Background #ffffff, Radius 18px, Shadow `--shadow-search`, Padding 12 a 18px. Campos en una fila (escritorio) o apilados (móvil): Tipo de inmueble (Apartamento, Casa, Lote, Local, Oficina), Ubicación (departamento y municipio juntos, D9), Rango de precio, y botón primario "Buscar". La operación no es un campo del buscador: está fija en la pestaña (venta, alquiler o proyectos). **Sin campo de zona o sector (D24) y sin control de orden (AC2.2.13).** Filtros avanzados en un panel desplegable "Más filtros": los de base de datos (tipo, ubicación, precio) y los de frontend (dormitorios, baños, área construida, área de lote, estrato, parqueaderos, amenidades), según D9. Contador de resultados con el orden fijo «Destacados primero · Más recientes» (AC2.2.7) y sin menú de ordenamiento.

### Filter Chip
**Role:** Filtros rápidos y selección múltiple (habitaciones, características).

Reposo: Background rgba(0,0,0,0.04), Text Tinta, Radius 24px, Padding 8px 14px. Seleccionado: Background #e7efe3 (Bruma Verde), borde 1px #277730, Text #277730.

### Text Input Field
**Role:** Campo estándar de formulario. El único formulario del sitio es el de consignación (US3.1).

Background: rgba(0, 0, 0, 0.03). Border: 1px solid rgba(0, 0, 0, 0.1). Radius: 12px. Padding: 15px. Text: #111611 (Tinta). Focus: borde 1px #277730 y anillo de 2px rgba(39,119,48,0.25). Error: borde #b3261e con mensaje en caption debajo. Etiquetas siempre visibles (no solo placeholder). Campos según AC3.1.1: obligatorios nombre, teléfono, email, tipo de inmueble, ubicación y consentimiento; el resto es opcional.

### Hero Banner
**Role:** Introducción de la página principal.

Opción A (recomendada): fotografía a sangre completa de un inmueble o paisaje del sur del Valle de Aburrá, con degradado sutil oscuro en la parte inferior para legibilidad, titular blanco en `display`/`heading-lg`, y el Search Bar flotando sobre el borde inferior.
Opción B: banda en #277730 con titular blanco, CTA Amarillo Sol y buscador debajo; transiciona al fondo Marfil Elegante al hacer scroll.

El hero de la portada incluye accesos directos a Venta, Alquiler y Proyectos (AC2.6.1). El sol del logo puede insinuarse como un círculo Amarillo Sol suave de gran tamaño tras el titular, como único elemento gráfico decorativo permitido.

### Inline-Render Headline
**Role:** Componente firma que mezcla texto grande con pequeñas miniaturas de inmuebles.

Usa `display` o `heading-lg` con pequeñas fotos o renders redondeados (12px) de casas, apartamentos o fachadas intercaladas en el flujo del texto. Ejemplo: "Tu próximo [foto de sala] hogar en el sur [foto de fachada] del Valle." Usar solo en el hero o una sección destacada.

### Municipality / Zone Card
> **Fuera de alcance v1:** no existen páginas de zona o municipio (D24, FUERA DE ALCANCE). La especificación se conserva por si el alcance cambia en el futuro.

**Role:** Navegación por zona (Envigado, Sabaneta, Itagüí, La Estrella, Caldas, El Poblado).

Imagen a sangre dentro de tarjeta de 18px, nombre del municipio en `heading-sm` blanco sobre degradado oscuro, contador de inmuebles disponibles en caption. Las páginas de zona incluirían descripción local e inmuebles disponibles, **nunca un mapa** (AC2.4.11).

### Advisor Card (Asesor)
> **Fuera de alcance v1:** los asesores no aparecen en la portada (orden cerrado de AC2.6.2).

**Role:** Humanizar la marca y generar confianza.

Fotografía real y profesional (nunca de archivo), nombre, cargo, zonas que atiende, y botones de WhatsApp y llamada. Background Arena Suave, radius 12px.

### Trust Strip (Cifras de confianza)
> **Fuera de alcance v1 en portada:** AC2.6.7 prohíbe estadísticas inventadas y AC2.6.2 cierra el orden de la portada.

**Role:** Prueba social sobria bajo el hero o antes del CTA final.

Fila de 3 a 4 cifras reales en `heading` (inmuebles gestionados, años de experiencia, familias acompañadas, municipios atendidos) con caption Grafito. Solo cifras verificables.

### Testimonial Card
> **Fuera de alcance v1:** AC2.6.7 prohíbe testimonios en la portada.

**Role:** Prueba social con personas reales.

Warm Sand Card con cita en body-lg, nombre, zona y tipo de operación. Preferir testimonios reales de clientes, idealmente con foto o video autorizados.

### Detail Page Gallery & Sticky Contact
**Role:** Ficha de inmueble.

Galería con una imagen principal grande y 4 miniaturas (radius 12px), visor en pantalla completa (AC2.4.5). Columna lateral fija (escritorio) o barra inferior fija (móvil) con precio, botón primario y el único botón de WhatsApp («Preguntar por este inmueble», US2.5). Debajo: tabla de características, descripción en texto plano (nunca `dangerouslySetInnerHTML`, AC2.4.11), puntos de interés con íconos (AC2.4.4). **No hay mapa** (AC2.4.11). Los datos usan numerales tabulares.

### Footer
**Role:** Cierre del sitio con contacto y navegación.

Background #277730 (Verde Bosque), texto blanco, enlaces con subrayado al hover, CTA Amarillo Sol (WhatsApp). Incluye logo, enlaces a Nosotros y Contacto en el idioma actual (AC5.2.1), datos de contacto leídos de `NEXT_PUBLIC_CONTACT_*` (sin teléfonos, direcciones ni correos literales, AC5.2.1/AC5.2.3/T2), el sitio desde `NEXT_PUBLIC_SITE_URL`, enlaces legales, selector de idioma (AC0.4.3) y redes sociales si existen. Radio de 0 en el borde superior del footer a sangre completa.

## Do's and Don'ts

### Do
- Usar `regola-light` con tracking negativo ajustado en todos los titulares sobre 30px (o la familia resultante de la decisión pendiente de Tipografía).
- Fijar el fondo principal en #fbfbf6 (Marfil Elegante), nunca #ffffff en áreas grandes.
- Reservar #277730 (Verde Bosque) para elementos interactivos primarios: CTAs, enlaces, íconos activos, footer.
- Usar #559433 (Verde Hoja) como apoyo: hovers, gráficos y detalles, siempre respetando sus límites de contraste.
- Usar #f9ea1b (Amarillo Sol) como puntuación: una vez por pantalla, con texto Tinta.
- Aplicar un radio de 12px a casi todos los botones, campos y tarjetas.
- Dejar generoso espacio en blanco (96px a 120px) entre secciones principales (64px en móvil).
- Usar sombras sutiles y cortas, como `rgba(0, 0, 0, 0.12) 0px 0.5px 2px 0px`, para elevar con delicadeza.
- Mezclar tipografía grande y aireada con fotografía de inmuebles de alta calidad bañada de luz natural.
- Mostrar siempre un camino de contacto a la vista: el botón de WhatsApp construido con `buildWhatsAppUrl`. El formulario de consignación vive solo en `/consigne-su-propiedad`.
- Mostrar precios con formato colombiano, numerales tabulares y la moneda explícita (COP) cuando haya ambigüedad.
- Escribir en español claro y cercano (tuteo o usted, según defina la marca), directo, sin frases genéricas.
- Mantener la jerarquía de encabezados (un H1, luego H2/H3) y alt text descriptivo en cada imagen.
- Consultar `docs/TASKS.md` ante cualquier duda de alcance: los AC son vinculantes y este documento es solo referencia estética.

### Don't
- No contradecir un AC de TASKS: si esta guía y TASKS discrepan, manda TASKS (banner superior).
- No usar blanco puro (#ffffff) para grandes áreas de fondo.
- No usar pesos tipográficos bold o pesados en titulares; usar tamaño y peso ligero.
- No usar esquinas de 0px en componentes primarios como botones y tarjetas (el borde recto solo en bandas a sangre completa).
- No usar #559433 para texto pequeño ni #f9ea1b como texto sobre fondos claros.
- No saturar con más de un acento vibrante: nada de naranja, azul u otros colores fuera de la paleta.
- No usar sombras fuertes, profundas o coloreadas.
- No descuidar detalles tipográficos; los valores de interletrado y altura de línea son críticos.
- No juntar elementos; el diseño depende del aire.
- No usar fotos de archivo genéricas de personas, ni imágenes oscuras, saturadas o con filtros fuertes.
- No ocultar el buscador detrás de texto institucional ni obligar a registrarse para ver inmuebles.
- No usar carruseles automáticos que se mueven solos ni ventanas emergentes que bloqueen el contenido.
- No mostrar cifras, testimonios ni inmuebles falsos o de relleno en producción (AC2.6.7).
- No escribir teléfonos, direcciones o correos literales en el código (T2, AC5.2.3); leer siempre de variables de entorno.
- No añadir mapa, blog, páginas de sector ni control de orden en el buscador (AC2.4.11, AC2.6.7, D24, AC2.2.13).

## Elevation

- **Subtle Card/Button:** `rgba(0, 0, 0, 0.12) 0px 0.5px 2px 0px`
- **Elevated Card:** `rgba(0, 0, 0, 0.2) 0px 2px 4px 0px`
- **Hover/Active Interaction:** `rgba(0, 0, 0, 0.08) 0px 2px 10px 0px`
- **Search Bar flotante:** `rgba(0, 0, 0, 0.08) 0px 8px 30px 0px`

## Imagery

El lenguaje visual es una dicotomía entre aspiración cálida y objetividad limpia. La fotografía de inmuebles domina: casas y apartamentos en entornos luminosos, naturales, rodeados de vegetación, que evocan una vida tranquila y premium en las montañas del sur del Valle de Aburrá. Esto contrasta con renders 3D limpios y aislados (maquetas de casas, como la del material del cliente) integrados dentro de bloques de texto para explicar con claridad técnica.

- Fotografía de interior con luz natural diurna, líneas verticales corregidas, sin distorsión de gran angular excesiva.
- Una galería mínima por inmueble: fachada, sala, cocina, habitación principal, baños, zonas comunes y vista.
- Tratamiento cromático consistente: cálido y ligero, sin filtros. Las fotos con vegetación refuerzan la paleta verde de forma natural.
- Toda imagen vive en contenedores con radio de 12px (18px en tarjetas especiales); sin gráficos abstractos ni decorativos.
- Los íconos son lineales, de trazo fino (1.5px), en Verde Bosque o Tinta.
- El motivo de casa/tejado del logo y el sol amarillo pueden aparecer como marca de agua sutil o elemento decorativo único, nunca recargado.
- Formatos WebP/AVIF con tamaños responsivos y `loading="lazy"`; hero con prioridad de carga.

## Layout

El diseño se construye sobre un contenedor centrado de ancho máximo ~1280px, con generoso espacio blanco a los lados. La página abre con un hero a sangre completa (fotografía o banda verde) con el buscador, y continúa con una pila vertical de secciones sobre el fondo Marfil Elegante. Las separaciones de sección se definen con grandes espacios verticales (96 a 120px) y alternancia sutil de fondo Marfil/Piedra Clara en lugar de divisores visuales, creando un ritmo calmado y sin prisa. El contenido se organiza en columnas centradas simples para narrativa y en grillas de 2 o 3 columnas para inmuebles y servicios.

### Estructura de la página principal (orden cerrado por AC2.6)
1. Header: logo, navegación (Venta, Alquiler, Proyectos, Servicios), selector de idioma y botón WhatsApp.
2. Hero con titular, accesos directos a Venta, Alquiler y Proyectos (AC2.6.1) y buscador.
3. Franja «Destacadas» con inmuebles `destacada = true` y `status = ACTIVE` (AC2.6.2, AC2.6.3).
4. Vista previa de servicios con CTA hacia `/contacto` (AC2.6.2).
5. Bloque «Nosotros» con el `extracto` de la página Nosotros y enlace «Conocer más» hacia `/nosotros` (AC2.6.2, AC2.6.4).
6. Logos de empresas aliadas, como última sección (AC2.6.6).
7. Footer verde.

La portada **no** incluye testimonios, cifras de confianza, asesores, tarjetas de zona ni formulario (AC2.6.7 y orden cerrado de AC2.6.2). Si no hay destacados, servicios o extracto, la franja o el bloque correspondiente no se renderiza (AC2.6.5).

### Navegación
Máximo tres clics hasta cualquier inmueble. El menú principal son pestañas independientes (`/venta`, `/alquiler`, `/proyectos`, `/servicios`) más el selector de idioma en header y footer (D8, AC2.1.1, AC0.4.3). Nosotros y Contacto se enlazan desde el footer (AC5.2.1). Menú móvil colapsable con buscador accesible y botón fijo inferior de WhatsApp.

### Páginas clave
Portada, Venta, Alquiler y Proyectos (pestañas independientes), listado/resultados con filtros, ficha en `/propiedad/[slug]` (sin mapa), Servicios y detalle de servicio, Nosotros, Consigne su propiedad (único formulario del sitio), Contacto (página informativa con datos de contacto, botón de WhatsApp y enlace a «Consigne su propiedad», sin formulario) y páginas legales (aviso de privacidad, política de tratamiento de datos, términos). **Fuera de alcance v1:** páginas por municipio o barrio, blog y cualquier mapa interactivo.

## Agent Prompt Guide

### Quick Color Reference
- **Background**: `#fbfbf6` (Marfil Elegante)
- **Text**: `#111611` (Tinta)
- **Primary CTA**: `#277730` (Verde Bosque), hover `#1f6227`
- **Secondary accent**: `#559433` (Verde Hoja)
- **Highlight (escaso)**: `#f9ea1b` (Amarillo Sol)
- **Surface / Card**: `#efefe6` (Arena Suave) y `#ddddd1` (Piedra Clara)
- **Border**: `rgba(0, 0, 0, 0.1)`

### Example Component Prompts
1. **Primary Button:** "Crea un botón con el texto 'Consignar propiedad'. Fondo #277730, texto blanco, radio de 12px, padding de 14px y altura mínima de 44px. Fuente según la decisión pendiente de Tipografía (regola o Plus Jakarta Sans, máximo 2 familias vía next/font) de 15px, peso 500. En hover, fondo #1f6227."
2. **Display Headline:** "Crea un titular 'Tu hogar en el sur del Valle' con la fuente regola a 96px, peso 400 (light), color #111611, line-height 0.9 y letter-spacing -4.51px. En móvil, 48px."
3. **Property Card:** "Crea una tarjeta de inmueble con fondo #efefe6, radio de 12px y sombra `rgba(0,0,0,0.12) 0px 0.5px 2px 0px`. Imagen 4:3 arriba con insignia 'Venta' en pill blanco. Precio '$ 450.000.000' en 23px con numerales tabulares. Debajo, código del inmueble y ubicación 'Apartamento en Envigado' en 16px y una fila de íconos lineales verdes (#277730) con '85 m²', '3 hab.', '2 baños' y 'Estrato 4'. Enlace 'Ver inmueble' en #277730."
4. **Search Hero:** "Genera un hero a sangre completa con una fotografía de un apartamento luminoso, degradado inferior oscuro, titular blanco en 60px, accesos directos a Venta, Alquiler y Proyectos, y un buscador flotante blanco con radio de 18px y sombra `rgba(0,0,0,0.08) 0px 8px 30px 0px`, con los campos Tipo, Ubicación (departamento y municipio), Presupuesto y un botón primario 'Buscar' (#277730). Sin campo de zona ni control de orden."
5. **Footer:** "Crea un footer con fondo #277730, texto blanco, los datos de contacto leídos de NEXT_PUBLIC_CONTACT_* (sin teléfonos ni direcciones literales), el sitio desde NEXT_PUBLIC_SITE_URL, el selector de idioma, los enlaces legales y un botón con fondo #f9ea1b, texto #111611 y radio de 12px que diga 'Hablemos por WhatsApp'."
6. **Filter Chip:** "Crea chips de filtro (1, 2, 3, 4+ habitaciones) en pill de 24px; reposo con fondo rgba(0,0,0,0.04); seleccionado con fondo #e7efe3, borde 1px #277730 y texto #277730."

## Referencias

- **Samara**: sistema base; arquitectura tipográfica, espaciado, radios, sombras y filosofía de contención.
- **Nakada Design (sección de inmobiliaria)**: principios de conversión para inmobiliarias de alto nivel; búsqueda avanzada, atención al detalle, interacciones sutiles y SEO local.
- **Infina**: referencia de producto indicada por el cliente; el contenido del sitio no pudo leerse en la consulta, por lo que sus principios no están reflejados literalmente y las pautas de búsqueda, confianza y captura provienen de buenas prácticas generales del sector.
- **docs/TASKS.md**: fuente de verdad del alcance y de los AC vinculantes; este documento se armoniza contra ella.

## Quick Start

### CSS Custom Properties
- **estilos**: nunca por ninguna razon se debe usar tailwind css, solo css modules, incluso para editar o personalizar los componentes de librerias externas como mantine.
```css
:root {
  /* Colors - Brand */
  --color-verde-bosque: #277730;
  --color-verde-hoja: #559433;
  --color-amarillo-sol: #f9ea1b;

  /* Colors - Neutrals & Surfaces */
  --color-tinta: #111611;
  --color-blanco-puro: #ffffff;
  --color-marfil-elegante: #fbfbf6;
  --color-piedra-clara: #ddddd1;
  --color-arena-suave: #efefe6;
  --color-bruma-verde: #e7efe3;
  --color-verde-profundo: #1f6227;
  --color-ceniza: #d3d3d3;
  --color-piedra: #999999;
  --color-grafito: #666666;
  --color-error: #b3261e;

  /* Typography - Font Families */
  --font-regola: 'regola', 'Plus Jakarta Sans', 'Manrope', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  /* Typography - Scale */
  --text-caption-sm: 12px;
  --leading-caption-sm: 1.5;
  --tracking-caption-sm: -0.48px;
  --text-caption: 14px;
  --leading-caption: 1.5;
  --tracking-caption: -0.56px;
  --text-body-sm: 16px;
  --leading-body-sm: 1.49;
  --tracking-body-sm: -0.22px;
  --text-body: 18px;
  --leading-body: 1.33;
  --tracking-body: -0.18px;
  --text-body-lg: 23px;
  --leading-body-lg: 1.25;
  --tracking-body-lg: -0.46px;
  --text-subheading: 30px;
  --leading-subheading: 1.14;
  --tracking-subheading: -0.9px;
  --text-heading-sm: 36px;
  --leading-heading-sm: 1.1;
  --tracking-heading-sm: -0.5px;
  --text-heading: 48px;
  --leading-heading: 1;
  --tracking-heading: -1.3px;
  --text-heading-lg: 60px;
  --leading-heading-lg: 0.96;
  --tracking-heading-lg: -2.46px;
  --text-display: 96px;
  --leading-display: 0.9;
  --tracking-display: -4.51px;

  /* Typography - Weights */
  --font-weight-regular: 400;
  --font-weight-medium: 500;

  /* Spacing */
  --spacing-5: 5px;
  --spacing-6: 6px;
  --spacing-8: 8px;
  --spacing-9: 9px;
  --spacing-10: 10px;
  --spacing-12: 12px;
  --spacing-14: 14px;
  --spacing-15: 15px;
  --spacing-16: 16px;
  --spacing-18: 18px;
  --spacing-24: 24px;
  --spacing-30: 30px;
  --spacing-32: 32px;
  --spacing-36: 36px;
  --spacing-42: 42px;
  --spacing-54: 54px;

  /* Layout */
  --page-max-width: 1280px;
  --section-gap: 120px;
  --section-gap-mobile: 64px;

  /* Border Radius */
  --radius-sm: 2px;
  --radius-md: 6px;
  --radius-lg: 9px;
  --radius-xl: 12px;
  --radius-2xl: 18px;
  --radius-3xl: 24px;

  /* Named Radii */
  --radius-cards: 12px;
  --radius-pills: 24px;
  --radius-inputs: 12px;
  --radius-buttons: 12px;
  --radius-specialtycards: 18px;
  --radius-search: 18px;

  /* Shadows */
  --shadow-subtle: rgba(0, 0, 0, 0.12) 0px 0.5px 2px 0px;
  --shadow-md: rgba(0, 0, 0, 0.08) 0px 2px 10px 0px;
  --shadow-sm: rgba(0, 0, 0, 0.2) 0px 2px 4px 0px;
  --shadow-sm-2: rgba(0, 0, 0, 0.12) 0px 2px 4px 0px;
  --shadow-subtle-2: rgba(0, 0, 0, 0.12) 0px 0.5px 1px 0px;
  --shadow-subtle-3: rgba(0, 0, 0, 0.2) 0px 0.5px 2px 0px;
  --shadow-search: rgba(0, 0, 0, 0.08) 0px 8px 30px 0px;
}

body {
  background: var(--color-marfil-elegante);
  color: var(--color-tinta);
  font-family: var(--font-regola);
  font-variant-numeric: lining-nums tabular-nums;
}
```
