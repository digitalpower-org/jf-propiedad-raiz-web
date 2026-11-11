/**
 * Entry point CLI del seed de catálogo (US6.1, MT2.4).
 *
 * Ejecuta `seedCatalog` contra Firestore usando la infraestructura real
 * (Admin App + createFirestore). Se invoca mediante `npm run seed:catalog`.
 *
 * Ejecutar: npm run seed:catalog
 * Requiere: emuladores de Firestore levantados (FIRESTORE_EMULATOR_HOST)
 * o variables de entorno de producción configuradas.
 */

import { seedCatalog } from './catalog-seed';

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');

  if (dryRun) {
    console.log('=== Seed de catálogo (US6.1, MT2.4) — modo dry-run ===');
  } else {
    console.log('=== Seed de catálogo (US6.1, MT2.4) — persistencia real ===');
  }

  const { createFirestore } = await import('../infrastructure/firebase/firestore.js');
  const { getAdminApp } = await import('../infrastructure/firebase/admin-app.js');
  const { loadEnv } = await import('../infrastructure/config/env.js');

  const config = loadEnv();
  const app = getAdminApp(config);
  const db = createFirestore(app);

  const resultado = await seedCatalog(db, dryRun);

  console.log('');
  console.log(`Propiedades creadas: ${resultado.propertiesCreated}`);
  console.log(`Servicios creados: ${resultado.servicesCreated}`);
  console.log(`Documento Nosotros: ${resultado.aboutUpserted ? 'sí' : 'no'}`);
  console.log(`Cambios totales: ${resultado.changes}`);
  console.log(`Idempotente: ${resultado.idempotent ? 'sí (0 cambios)' : 'no'}`);

  if (dryRun) {
    console.log('');
    console.log('Ejecutar sin --dry-run para persistir en Firestore.');
  }
}

main().catch((error: unknown) => {
  console.error('Error ejecutando el seed de catálogo:', error);
  process.exit(1);
});
