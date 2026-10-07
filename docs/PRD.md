# Product Requirement Document (PRD) - JF Propiedad Raíz

## 1. Visión y Objetivos
Posicionar a **JF Propiedad Raíz** como la inmobiliaria y constructora líder de gama media-alta en el Aburrá Sur mediante una experiencia digital premium, fluida y veloz.

## 2. Pilares de UX
1. **Diseño Editorial Premium:** Estética sobria, espacios amplios, fotografías de alta calidad y animaciones sutiles.
2. **Experiencia Audiovisual Optimizada:** Carga ultrarrápida de galerías y visores 360° bajo demanda.
3. **Navegación Sin Fricción:** Buscador con actualización dinámica de URL y fichas enriquecidas.

## 3. Flujo Principal de Conversión
- **Lead Directo a WhatsApp:** Generación de enlaces URI preformateados codificando únicamente el `ID` y `Título` del inmueble.

## 4. Estructura de Secciones
- **Inmuebles (Venta / Alquiler):** Fichas dinámicas con detalles (estrato, predial, admin, acabados) y Puntos de Interés Cercanos.
- **Servicios de Ingeniería & Arquitectura:** Tarjetas informativas en la página principal que enlazan a páginas de detalle navegables por servicio (remodelaciones, topografía, uso de suelos, cálculos estructurales, etc.).
- **Módulo Consigne su Propiedad:** Formulario interactivo con doble destino: WhatsApp (+57 302 4679380) y correo de respaldo mediante Resend.
- **Panel de Administración (CMS):** Acceso privado vía Firebase Auth (Google Login con Custom Claims) para 2 administradores.

## 5. Out of Scope (Fase 1)
- Pasarelas de pago online.
- Chatbots o cuentas de usuario para clientes finales.
- Notificaciones push o alertas al dueño fuera del formulario de consignación.
- Sistema de facturación (fiscal/no fiscal), gestión de contratos, cobros o cartera.