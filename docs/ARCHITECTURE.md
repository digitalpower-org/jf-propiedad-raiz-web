# Technical Architecture - JF Propiedad Raíz

## 1. Monorepo y Comunicación
- **Contrato:** `docs/openapi.yaml`.
- **Tipado:** `packages/shared-types` compila las interfaces TypeScript directamente desde `openapi.yaml` usando `openapi-typescript`.

## 2. Backend (Express.js Monolítico en Firebase Functions)
- **Aislamiento de Datos (Firestore):** Colección única `properties` aislada por campo `status` (`ACTIVE`, `HIDDEN`, `DELETED`). Soft delete por defecto.
- **Consultas Complejas:** Filtros nativos de Firestore aprovechando índices compuestos (`municipality`, `offerType`, `propertyType`, `priceRange`).
- **Autenticación:** Firebase Auth con Google Provider y Custom Claims `{ admin: true }`.
- **Carga de Archivos (Cloudflare R2):**
  1. Frontend solicita URL firmada al Backend: `GET /api/v1/media/presigned-url?fileName=...`
  2. Backend valida sesión de Admin y genera Presigned PUT URL.
  3. Frontend sube la imagen directamente a R2.
- **Logging:** Pino Logger formateado directamente hacia Google Cloud Logging.

## 3. Frontend (Next.js 16 + React 19)
- **Estrategia SEO:** SSR/SSG en fichas de propiedades y páginas de servicios.
- **Sistemas de Estilos:** Mantine UI + CSS Modules.
- **Accesibilidad & Responsividad:** Mobile-First, min target size `44x44px`, WCAG 2.2 AA.
- **Filtros de Búsqueda:** Sincronización bidireccional con Query Params (`?type=casa&city=envigado&minPrice=...`).