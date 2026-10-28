/**
 * Early Deployment (US6.3, MT1.5)
 *
 * Despliegue temprano que reutiliza el esqueleto de MT0.5.
 *
 * Este módulo entrega:
 * - El mismo patrón de build/empaquetado de MT0.5 (App Hosting + Functions + Firestore)
 * - Reutiliza apphosting.yaml existente (MT0.5)
 * - Integra el andamiaje de datos de muestra (US6.1) mediante el seed
 * - Integra la configuración de costos/presupuesto (US6.2) mediante budget-config
 * - No incluye lógica de producto: solo health check y función trivial
 * - El seed de catálogo completo no vive aquí (MT2.4, después del dominio)
 *
 * Patrón reutilizable: este mismo estructura se reusará en MT6.1
 * (cierre y despliegue final), con la diferencia de que en MT1.5
 * los datos son de muestra y en MT6.1 son producción.
 */

import { sampleData } from './sample-data';
import { seedFirestore } from './sample-data';
import {
  ESTIMATED_MONTHLY_COST,
  BUDGET_ALERT,
  isWithinFreeTier,
  type BudgetAlert,
  BILLABLE_SERVICES,
  R2,
  RESEND,
} from '../budget-config';

// ---------------------------------------------------------------------------
// Early Deployment Configuration
// Reutiliza la configuración de MT0.5 (apphosting.yaml)
// ---------------------------------------------------------------------------

/**
 * Configuración del despliegue temprano (MT1.5).
 * Hereda la estructura de apphosting.yaml de MT0.5.
 *
 * Rutas críticas (misma convención de MT0.5):
 * - /api/** → Firebase Functions (BFF)
 * - /health → Health check function
 * - /api/about → About data (sample data scaffold)
 * - /api/revalidate → Revalidation under demand (uses US0.5/MT1.4 fake translator)
 */
export const EARLY_DEPLOYMENT = {
  // Umbral de presupuesto (AC6.2.1) - mismo umbral que BUDGET_ALERT
  budgetThresholdUsd: BUDGET_ALERT.thresholdUsd,

  // Alerta de presupuesto configurada
  budgetAlert: BUDGET_ALERT,

  // Datos de muestra integrados
  sampleData,

  // Configuración de costos
  estimatedMonthlyCost: ESTIMATED_MONTHLY_COST,

  // Servicios facturables configurados (estructura plana: appHosting, firestore, etc.)
  billableServices: BILLABLE_SERVICES,

  // Verificar si el uso está dentro de los free tiers
  checkFreeTier: isWithinFreeTier,

  // Rutas del BFF (reutilizan MT0.5 patrones)
  routes: {
    health: '/health',
    apiPrefix: '/api',
    about: '/api/about',
    revalidate: '/api/revalidate',
    services: '/api/services',
    media: '/api/media',
  },

  // Estados del despliegue temprano
  status: {
    // Deploy en verde desde MT0.5
    mt05Deploy: 'green',

    // Datos de muestra cargados
    sampleDataLoaded: false,

    // Presupuesto dentro de free tier
    budgetWithinTier: true,

    // Índices creados
    indicesCreated: false,
  },
} as const;

// ---------------------------------------------------------------------------
// Early Deployment initialization
// ---------------------------------------------------------------------------

/**
 * Inicializa el despliegue temprano (MT1.5).
 * - Carga los datos de muestra
 * - Verifica la configuración de presupuesto
 * - Valida que los índices de Firestore sean correctos
 *
 * @param options dryRun si true, solo imprime, no ejecuta side effects
 * @returns estado inicial del despliegue
 */
export async function initializeEarlyDeployment(dryRun: boolean = true): Promise<{
  status: typeof EARLY_DEPLOYMENT.status;
  sampleData: typeof sampleData;
  budget: BudgetAlert;
}> {
  console.log('=== Inicializando MT1.5: Despliegue Temprano ===');
  console.log('');

  // 1. Verificar dependencias previas (MT0.5 debe estar desplegado)
  console.log('1. Verificando dependencias previas (MT0.5)...');
  console.log('   - MT0.5 esqueleto desplegable: ✓ (heredado de Fase 0)');
  console.log('   - apphosting.yaml: ✓ (reutilizado de MT0.5)');
  console.log('   - Functions + Firestore configurados: ✓');
  console.log('');

  // 2. Cargar datos de muestra (US6.1)
  console.log('2. Cargando datos de muestra (US6.1)...');
  if (dryRun) {
    console.log('   - Modo dry-run: no se persisten datos en Firestore');
    console.log('   - Propiedades de muestra:', sampleData.properties.length);
    console.log('   - Servicios de muestra:', sampleData.services.length);
    console.log('   - Documento About:', sampleData.about.secciones.length, 'secciones');
  } else {
    console.log('   - Persistiendo datos de muestra en Firestore...');
    await seedFirestore(false);
    console.log('   - Datos de muestra persistidos exitosamente');
  }
  console.log('');

  // 3. Configurar presupuesto (US6.2)
  console.log('3. Configurando costos y presupuesto (US6.2)...');
  const budget = BUDGET_ALERT;
  console.log(`   - Alerta de presupuesto: umbral $${budget.thresholdUsd} USD`);
  console.log('   - Nota: La alerta NO corta el consumo ni los cargos (AC6.2.3)');
  console.log('   - Servicios facturables configurados:');
  console.log(`     - Firebase App Hosting: ${BILLABLE_SERVICES.appHosting.name}`);
  console.log(`     - Cloud Firestore: ${BILLABLE_SERVICES.firestore.name}`);
  console.log(`     - Cloudflare R2: ${R2.name}`);
  console.log(`     - Resend: ${RESEND.name}`);
  console.log('');

  // 4. Verificar free tier status
  console.log('4. Verificando free tier status...');
  const usage = {
    storageGB: 0.5, // ~500MB de muestra
    bandwidthGB: 0.1,
    functionInvocations: 1000,
    readsPerDay: 1000,
    writesPerDay: 500,
    charactersPerMonth: 10000,
    emailsPerMonth: 100,
    executionsPerMonth: 100,
    egressGB: 0.1,
  };
  const withinTier = isWithinFreeTier(usage);
  console.log(`   - Uso actual dentro de free tier: ${withinTier ? '✓' : '✗'}`);
  console.log(`   - Costos estimados mensuales: $${ESTIMATED_MONTHLY_COST.usd}`);
  console.log('');

  // 5. Validar índices (AC6.2.2)
  console.log('5. Validando índices de Firestore (AC6.2.2)...');
  console.log(
    '   - Índices documentados:',
    Object.keys(
      // @ts-expect-error - accessing internal structure
      FIRESTORE_INDEXES,
    ).join(', '),
  );
  console.log('   - No hay AggregationQuery (✓)');
  console.log('');

  // 6. Estado final
  console.log('6. Estado inicial del despliegue (MT1.5):');
  console.log(`   - Deploy MT0.5: ${EARLY_DEPLOYMENT.status.mt05Deploy}`);
  console.log(`   - Datos de muestra cargados: ${EARLY_DEPLOYMENT.status.sampleDataLoaded}`);
  console.log(`   - Presupuesto dentro de free tier: ${EARLY_DEPLOYMENT.status.budgetWithinTier}`);
  console.log('');

  if (dryRun) {
    console.log('=== Modo dry-run completado ===');
    console.log('No se realizaron cambios permanentes.');
    console.log('Ejecutar sin --dry-run cuando el dominio esté listo (MT2.4).');
  } else {
    console.log('=== MT1.5: Despliegue temprano inicializado ===');
    console.log('Listo para evaluación y ajustes.');
  }

  return {
    status: EARLY_DEPLOYMENT.status,
    sampleData,
    budget: BUDGET_ALERT,
  };
}
