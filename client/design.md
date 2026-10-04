# JF Propiedad Raíz — Style Reference
> Maqueta arquitectónica bañada de sol. La precisión de un plano con la calidez y la luz natural del Valle de Aburrá.

**Theme:** light

Derivado del sistema de diseño Samara y adaptado a una inmobiliaria local del sur de Medellín y su área de influencia (Envigado, Sabaneta, Itagüí, La Estrella, Caldas, El Poblado y zonas aledañas). Los valores de color provienen del logo y materiales del cliente; los roles, componentes y recomendaciones son interpretados. Las listas de fuentes son independientes, no emparejadas por posición. Los ejemplos HTML son reconstrucciones, no componentes de origen.

El diseño se siente como un plano arquitectónico impreso sobre papel cálido y premium. La autoridad nace de la contención: mucho espacio negativo y una tipografía display de trazo finísimo (Regola Light) en los titulares, que se sienten amplios y serenos en vez de ruidosos. La paleta está estrictamente controlada: un blanco marfil elegante como fondo, tinta casi negra para el texto, un verde bosque profundo (#277730) para todas las acciones primarias, un verde hoja más claro (#559433) como apoyo secundario, y un único amarillo sol vibrante (#f9ea1b), el mismo del sol del logo, usado con extrema moderación como acento de alta visibilidad. El inmueble es el protagonista: fotografía luminosa, natural, rodeada de vegetación. Radios suaves de 12px en tarjetas y botones aportan un toque humano a la precisión geométrica de la tipografía.

## Principios para el sector inmobiliario

Estos principios gobiernan las decisiones del sistema por encima del gusto estético:

1. **La búsqueda es la protagonista.** El visitante llega a encontrar un inmueble, no a leer sobre la empresa. El buscador va dentro del hero, sobre el pliegue, en móvil y escritorio.
2. **Confianza antes que espectáculo.** Es una transacción de alto valor y alta confianza. Asesores con nombre y foto real, cifras verificables, testimonios reales y datos de contacto visibles en todo momento.
3. **Siempre una vía de contacto a la vista.** Ninguna pantalla debe permitir hacer scroll completo sin ver WhatsApp, llamada o formulario. Cada ficha de inmueble tiene su propio formulario y botón de WhatsApp.
4. **Móvil primero.** La mayoría del tráfico llega por celular: objetivos táctiles grandes (mínimo 44px), filtros operables con el pulgar, botones fijos de llamar/WhatsApp, navegación colapsable.
5. **Restricción como lujo.** Una tipografía, una paleta corta, espaciado consistente y generoso. La calidad percibida viene de la disciplina, no de efectos.
6. **Fotografía como contenido principal.** Imágenes de alta calidad, luz natural, consistentes entre sí. Una foto mala daña más que cualquier decisión de color.
7. **Vende el lugar, no solo el inmueble.** Páginas por municipio y barrio con contexto (movilidad, servicios, entorno) para posicionar la marca como experta local y capturar búsquedas locales.
8. **Interacciones sutiles.** Microanimaciones discretas que mejoran la experiencia; nunca abrumadoras ni distractoras.
9. **Legible para buscadores y asistentes de IA.** Fichas con URL propia, encabezados limpios (H1, H2, H3), datos estructurados (schema) y carga rápida. El contenido clave nunca vive dentro de iframes ni se renderiza solo con scripts pesados.

## Tokens — Colors

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

## Tokens — Typography

### regola — Fuente firma de todo el sistema. La variante 'light' se usa para titulares grandes y aireados, con una apariencia de confianza serena. Pesos 'book' y 'regular' para cuerpo y UI. Interletrado negativo ajustado en tamaños grandes. · `--font-regola`
- **Substitute:** Plus Jakarta Sans, Manrope (ambas con soporte completo de acentos y ñ)
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
- El español produce titulares más largos que el inglés: usar `display` solo en hero de escritorio y con máximo 4–5 palabras. Para titulares largos, bajar a `heading-lg` o `heading`.
- Escala responsiva recomendada en móvil (<640px): display→48px, heading-lg→40px, heading→36px, heading-sm→30px, subheading→26px. Mantener el tracking proporcional (≈ -0.04em en display).
- Precios: `heading-sm` o `body-lg` con `font-variant-numeric: tabular-nums lining-nums`. Formato colombiano con punto como separador de miles: `$ 450.000.000`. Precios de arriendo con sufijo en caption: `$ 2.800.000 / mes`.
- Teléfonos agrupados como en la marca: `302 467 93 80`.
- Unidades en caption: `m²`, `hab.`, `baños`, `parq.`, `estrato`.

## Tokens — Spacing & Shapes

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
- **Gutter móvil:** 16px a cada lado, sin scroll horizontal
- **Grillas:** listado de inmuebles 3 columnas (escritorio ≥1024px), 2 (tablet), 1 (móvil)

## Components

### Primary Button
**Role:** Llamada a la acción principal (Ver inmueble, Agendar visita, Buscar).

Background: #277730 (Verde Bosque). Text: #ffffff (Blanco Puro). Padding: 14px (mínimo 44px de alto táctil). Radius: 12px. Font: regola, 14–15px, peso 500. Hover/active: #1f6227 (Verde Profundo). Focus: anillo de 2px #277730 con offset de 2px.

### Accent CTA Button (Amarillo Sol)
**Role:** CTA de alta visibilidad sobre bandas verdes, el hero oscuro o el footer (Hablemos por WhatsApp, Cotiza tu inmueble). Uno por pantalla como máximo.

Background: #f9ea1b (Amarillo Sol). Text: #111611 (Tinta). Padding: ~8px 18px (14px si es botón principal de sección). Radius: 12px. Hover: oscurecer ~6%. Focus sobre verde: anillo de 2px #ffffff.

### Secondary Button
**Role:** Acción secundaria junto a un primario (Ver todos los inmuebles, Más información).

Background: #ddddd1 (Piedra Clara). Text: #111611 (Tinta). Radius: 12px. Padding: 14px. Hover: fondo #d3d3d3 o borde 1px Verde Bosque.

### Pill Ghost Button
**Role:** Acción sutil o enlace con forma de botón (Ver ubicación, Compartir).

Background: rgba(0, 0, 0, 0.04). Text: #111611 (Tinta). Radius: 24px. Padding variable.

### WhatsApp Button
**Role:** Contacto inmediato; el canal principal de conversión en el mercado local. Presente en header (escritorio), barra fija inferior (móvil), cada ficha y footer.

Fijo/flotante: Background #277730, ícono y texto blancos, Radius 24px (pill), altura 48px, shadow `--shadow-sm`. En fichas: variante primaria de ancho completo con el texto "Escribir por WhatsApp". El número se muestra en texto además del ícono (302 467 93 80). El mensaje precargado incluye el código y título del inmueble.

### Property Card (Tarjeta de inmueble)
**Role:** Unidad principal del sitio; se repite en listados, destacados y relacionados.

Background: #efefe6 (Arena Suave) o #ffffff sobre bandas Piedra Clara. Radius: 12px. Shadow: `rgba(0, 0, 0, 0.12) 0px 0.5px 2px 0px`; hover `rgba(0, 0, 0, 0.08) 0px 2px 10px 0px` con elevación de 2px. Padding de contenido: 18–24px.

Estructura de arriba hacia abajo:
1. **Imagen** en proporción 4:3 (esquinas superiores 12px), con carrusel discreto en hover/swipe, `loading="lazy"` y dimensiones explícitas.
2. **Insignia** superpuesta arriba a la izquierda: tipo de negocio (Venta / Arriendo) en pill blanco con texto Tinta; "Nuevo" o "Destacado" en pill Amarillo Sol con texto Tinta (máximo una insignia amarilla por tarjeta).
3. **Precio** en `body-lg` o `heading-sm`, peso 400, numerales tabulares. Administración (si aplica) en caption Grafito.
4. **Título/ubicación** en body-sm: tipo de inmueble + barrio, municipio.
5. **Fila de datos** con íconos lineales Verde Bosque 20px y texto caption: área m², habitaciones, baños, parqueaderos.
6. **Acción**: enlace "Ver inmueble" en Verde Bosque o botón de WhatsApp compacto. Toda la tarjeta es clicable.

### Warm Sand Card (Tarjeta Piedra)
**Role:** Variante más cálida y prominente para bloques de servicio, testimonios y asesores.

Background: #ddddd1 (Piedra Clara) o #efefe6. Radius: 18px. Shadow: `rgba(0, 0, 0, 0.12) 0px 0.5px 2px 0px`. Padding: 36px.

### Search Bar (Buscador del hero)
**Role:** Componente central del sitio; ancla del hero.

Contenedor flotante, Background #ffffff, Radius 18px, Shadow `--shadow-search`, Padding 12–18px. Campos en una fila (escritorio) o apilados (móvil): Negocio (Comprar / Arrendar), Tipo de inmueble (Apartamento, Casa, Lote, Local, Oficina), Municipio/Zona (Envigado, Sabaneta, Itagüí, La Estrella, Caldas, El Poblado), Presupuesto, y botón primario "Buscar". Filtros avanzados (habitaciones, baños, parqueaderos, área, estrato) en un panel desplegable "Más filtros". Resultados con ordenamiento y contador de inmuebles encontrados.

### Filter Chip
**Role:** Filtros rápidos y selección múltiple (habitaciones, características).

Reposo: Background rgba(0,0,0,0.04), Text Tinta, Radius 24px, Padding 8px 14px. Seleccionado: Background #e7efe3 (Bruma Verde), borde 1px #277730, Text #277730.

### Text Input Field
**Role:** Campo estándar de formulario (nombre, teléfono, correo, mensaje).

Background: rgba(0, 0, 0, 0.03). Border: 1px solid rgba(0, 0, 0, 0.1). Radius: 12px. Padding: 15px. Text: #111611 (Tinta). Focus: borde 1px #277730 y anillo de 2px rgba(39,119,48,0.25). Error: borde #b3261e con mensaje en caption debajo. Etiquetas siempre visibles (no solo placeholder). Formularios cortos: nombre, teléfono, mensaje; el correo es opcional.

### Hero Banner
**Role:** Introducción de la página principal.

Opción A (recomendada): fotografía a sangre completa de un inmueble o paisaje del sur del Valle de Aburrá, con degradado sutil oscuro en la parte inferior para legibilidad, titular blanco en `display`/`heading-lg`, y el Search Bar flotando sobre el borde inferior.
Opción B: banda en #277730 con titular blanco, CTA Amarillo Sol y buscador debajo; transiciona al fondo Marfil Elegante al hacer scroll.

El sol del logo puede insinuarse como un círculo Amarillo Sol suave de gran tamaño tras el titular, como único elemento gráfico decorativo permitido.

### Inline-Render Headline
**Role:** Componente firma que mezcla texto grande con pequeñas miniaturas de inmuebles.

Usa `display` o `heading-lg` con pequeñas fotos o renders redondeados (12px) de casas, apartamentos o fachadas intercaladas en el flujo del texto. Ejemplo: "Tu próximo [foto de sala] hogar en el sur [foto de fachada] del Valle." Usar solo en el hero o una sección destacada.

### Municipality / Zone Card
**Role:** Navegación por zona (Envigado, Sabaneta, Itagüí, La Estrella, Caldas, El Poblado).

Imagen a sangre dentro de tarjeta de 18px, nombre del municipio en `heading-sm` blanco sobre degradado oscuro, contador de inmuebles disponibles en caption, y enlace a la página de zona. Las páginas de zona incluyen descripción local, inmuebles disponibles y un mapa.

### Advisor Card (Asesor)
**Role:** Humanizar la marca y generar confianza.

Fotografía real y profesional (nunca de archivo), nombre, cargo, zonas que atiende, y botones de WhatsApp y llamada. Background Arena Suave, radius 12px.

### Trust Strip (Cifras de confianza)
**Role:** Prueba social sobria bajo el hero o antes del CTA final.

Fila de 3–4 cifras reales en `heading` (inmuebles gestionados, años de experiencia, familias acompañadas, municipios atendidos) con caption Grafito. Solo cifras verificables.

### Testimonial Card
**Role:** Prueba social con personas reales.

Warm Sand Card con cita en body-lg, nombre, zona y tipo de operación. Preferir testimonios reales de clientes, idealmente con foto o video autorizados.

### Detail Page Gallery & Sticky Contact
**Role:** Ficha de inmueble.

Galería con una imagen principal grande y 4 miniaturas (radius 12px), visor en pantalla completa. Columna lateral fija (escritorio) o barra inferior fija (móvil) con precio, botón primario "Agendar visita", botón de WhatsApp y teléfono. Debajo: tabla de características, descripción, ubicación en mapa, e inmuebles similares. Los datos usan numerales tabulares.

### Footer
**Role:** Cierre del sitio con contacto y navegación.

Background #277730 (Verde Bosque), texto blanco, enlaces con subrayado al hover, CTA Amarillo Sol (WhatsApp). Incluye logo, teléfono 302 467 93 80, sitio www.jfpropiedadraiz.com, municipios atendidos, enlaces legales y redes sociales. Radio de 0 en el borde superior del footer a sangre completa.

## Do's and Don'ts

### Do
- Usar `regola-light` con tracking negativo ajustado en todos los titulares sobre 30px.
- Fijar el fondo principal en #fbfbf6 (Marfil Elegante), nunca #ffffff en áreas grandes.
- Reservar #277730 (Verde Bosque) para elementos interactivos primarios: CTAs, enlaces, íconos activos, footer.
- Usar #559433 (Verde Hoja) como apoyo: hovers, gráficos y detalles, siempre respetando sus límites de contraste.
- Usar #f9ea1b (Amarillo Sol) como puntuación: una vez por pantalla, con texto Tinta.
- Aplicar un radio de 12px a casi todos los botones, campos y tarjetas.
- Dejar generoso espacio en blanco (96px–120px) entre secciones principales (64px en móvil).
- Usar sombras sutiles y cortas, como `rgba(0, 0, 0, 0.12) 0px 0.5px 2px 0px`, para elevar con delicadeza.
- Mezclar tipografía grande y aireada con fotografía de inmuebles de alta calidad bañada de luz natural.
- Mostrar siempre un camino de contacto (WhatsApp, llamada, formulario) en cada pantalla.
- Mostrar precios con formato colombiano, numerales tabulares y la moneda explícita (COP) cuando haya ambigüedad.
- Escribir en español claro y cercano (tuteo o usted, según defina la marca), directo, sin frases genéricas.
- Mantener la jerarquía de encabezados (un H1, luego H2/H3) y alt text descriptivo en cada imagen.

### Don't
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
- No mostrar cifras, testimonios ni inmuebles falsos o de relleno en producción.

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

El diseño se construye sobre un contenedor centrado de ancho máximo ~1280px, con generoso espacio blanco a los lados. La página abre con un hero a sangre completa (fotografía o banda verde) con el buscador, y continúa con una pila vertical de secciones sobre el fondo Marfil Elegante. Las separaciones de sección se definen con grandes espacios verticales (96–120px) y alternancia sutil de fondo Marfil/Piedra Clara en lugar de divisores visuales, creando un ritmo calmado y sin prisa. El contenido se organiza en columnas centradas simples para narrativa y en grillas de 2 o 3 columnas para inmuebles y servicios.

### Estructura recomendada de la página principal
1. Header: logo, navegación (Comprar, Arrendar, Vender o publicar tu inmueble, Zonas, Nosotros, Contacto), botón WhatsApp.
2. Hero con titular y buscador.
3. Inmuebles destacados (3–6 tarjetas).
4. Zonas que atendemos (tarjetas de municipio).
5. Servicios (comprar, arrendar, vender, administración, avalúos) en tarjetas Piedra.
6. Cifras de confianza.
7. Asesores.
8. Testimonios.
9. Formulario "Publica tu inmueble con nosotros" o "Cuéntanos qué buscas".
10. Footer verde.

### Navegación
Máximo tres clics hasta cualquier inmueble. Menú móvil colapsable con buscador accesible y botón fijo inferior de WhatsApp/llamar.

### Páginas clave
Inicio, Listado/Resultados (con filtros y mapa), Ficha de inmueble, Páginas por municipio y barrio, Vende/Arrienda con nosotros, Nosotros/Equipo, Contacto, Blog/Guías locales (opcional, con foco SEO), Páginas legales (política de tratamiento de datos, términos).

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
1. **Primary Button:** "Crea un botón con el texto 'Agendar visita'. Fondo #277730, texto blanco, radio de 12px, padding de 14px y altura mínima de 44px. Fuente regola (o Plus Jakarta Sans) de 15px, peso 500. En hover, fondo #1f6227."
2. **Display Headline:** "Crea un titular 'Tu hogar en el sur del Valle' con la fuente regola a 96px, peso 400 (light), color #111611, line-height 0.9 y letter-spacing -4.51px. En móvil, 48px."
3. **Property Card:** "Crea una tarjeta de inmueble con fondo #efefe6, radio de 12px y sombra `rgba(0,0,0,0.12) 0px 0.5px 2px 0px`. Imagen 4:3 arriba con insignia 'Venta' en pill blanco. Precio '$ 450.000.000' en 23px con numerales tabulares. Debajo, ubicación 'Apartamento en Envigado, Zona Centro' en 16px y una fila de íconos lineales verdes (#277730) con '85 m²', '3 hab.', '2 baños', '1 parq.'. Enlace 'Ver inmueble' en #277730."
4. **Search Hero:** "Genera un hero a sangre completa con una fotografía de un apartamento luminoso, degradado inferior oscuro, titular blanco en 60px, y un buscador flotante blanco con radio de 18px y sombra `rgba(0,0,0,0.08) 0px 8px 30px 0px`, con los campos Negocio, Tipo, Municipio, Presupuesto y un botón primario 'Buscar' (#277730)."
5. **Footer:** "Crea un footer con fondo #277730, texto blanco, el teléfono '302 467 93 80', el sitio 'www.jfpropiedadraiz.com', la lista de municipios atendidos y un botón con fondo #f9ea1b, texto #111611 y radio de 12px que diga 'Hablemos por WhatsApp'."
6. **Filter Chip:** "Crea chips de filtro (1, 2, 3, 4+ habitaciones) en pill de 24px; reposo con fondo rgba(0,0,0,0.04); seleccionado con fondo #e7efe3, borde 1px #277730 y texto #277730."

## Referencias

- **Samara** — Sistema base: arquitectura tipográfica, espaciado, radios, sombras y filosofía de contención.
- **Nakada Design (sección de inmobiliaria)** — Principios de conversión para inmobiliarias de alto nivel: búsqueda avanzada, atención al detalle, interacciones sutiles, captura de contactos y SEO local.
- **Infina** — Referencia de producto indicada por el cliente; el contenido del sitio no pudo leerse en la consulta, por lo que sus principios no están reflejados literalmente y las pautas de búsqueda, confianza y captura de leads provienen de buenas prácticas generales del sector.

## Quick Start

### CSS Custom Properties

```css
:root {
  /* Colors — Brand */
  --color-verde-bosque: #277730;
  --color-verde-hoja: #559433;
  --color-amarillo-sol: #f9ea1b;

  /* Colors — Neutrals & Surfaces */
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

  /* Typography — Font Families */
  --font-regola: 'regola', 'Plus Jakarta Sans', 'Manrope', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  /* Typography — Scale */
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

  /* Typography — Weights */
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
