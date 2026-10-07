# Master Task Breakdown & Roadmap

## Fase 1: Setup & Monorepo Infrastructure
- [x] Inicializar Monorepo (pnpm workspaces).
- [ ] Definir `docs/openapi.yaml` con todos los esquemas de petición/respuesta.
- [ ] Configurar compilación automática en `packages/shared-types`.
- [ ] Configurar `.github/workflows/ci.yml` con TypeScript, ESLint, Vitest y npm audit.

## Dev 1 (Backend Lead)
- [ ] Implementar estructura Clean Architecture en `packages/functions`.
- [ ] Configurar Express App en Firebase Cloud Function.
- [ ] Crear cliente Firestore con borrado lógico (`status: 'DELETED'`).
- [ ] Implementar endpoints CRUD de Propiedades y validación Zod.
- [ ] Implementar generador de URLs firmadas para Cloudflare R2 (`GET /api/v1/media/presigned-url`).
- [ ] Integrar Pino Logger y middleware de tratamiento de errores con `requestId`.
- [ ] Configurar suite de pruebas unitarias/integración con Vitest + Supertest + SQLite temporal.

## Dev 2 (Frontend Lead)
- [ ] Inicializar app Next.js 16 con App Router en `packages/client`.
- [ ] Configurar Mantine UI v7 con CSS Modules y la paleta de colores corporativa.
- [ ] Construir layout principal (Header, Navbar con pestañas independientes, Footer con empresas aliadas).
- [ ] Implementar Buscador de Inmuebles sincronizado con URL (Query Params).
- [ ] Construir componentes de Ficha de Inmueble con SSR/SSG y renderizado de Puntos de Interés.
- [ ] Crear módulo "Consigne su Propiedad" con redirección a WhatsApp e integración con API.
- [ ] Construir catálogo y páginas individuales de Servicios de Ingeniería & Arquitectura.

## Fase Final de Integración
- [ ] Probar autenticación Google Auth en CMS de Administración para los 2 admins.
- [ ] Ejecutar auditoría Lighthouse (>90 en Mobile Vitals).
- [ ] Validar Pipeline de CI/CD al hacer Merge PR a `main`.