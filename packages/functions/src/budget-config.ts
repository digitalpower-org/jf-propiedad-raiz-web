/**
 * Budget & Cost Configuration (US6.2, MT1.5)
 *
 * Configuración de alertas de presupuesto y control de costos para MT1.5
 * ("Operación base y despliegue temprano").
 *
 * AC6.2.1: Alerta de presupuesto creada cuando el proyecto está listo para desplegar (manual)
 * AC6.2.2: Índices compuestos solo para combinaciones documentadas; cero (0) AggregationQuery
 * AC6.2.3: Documentación que aclara que la alerta de presupuesto NO corta el consumo ni los cargos
 * AC6.2.4: Catálogo de servicios facturables; objetivo $0 mensual depende de mantenerse dentro
 *         de las cuotas gratuitas vigentes bajo uso normal
 * AC6.2.5: No hay secretos en texto plano en el repositorio
 */

// ---------------------------------------------------------------------------
// Billable services configuration (AC6.2.4)
// ---------------------------------------------------------------------------

/**
 * Servicios facturables en el proyecto Firebase Blaze.
 * El objetivo de $0 mensual depende de mantenerse dentro de las cuotas gratuitas
 * vigentes bajo uso normal (within free tier limits).
 *
 * Estructura plana: firebase, r2, resend son claves directas de BILLABLE_SERVICES.
 */
export const BILLABLE_SERVICES = {
  // Firebase services
  // Firebase App Hosting - charges based on bandwidth and function invocations
  appHosting: {
    name: 'Firebase App Hosting',
    // Free tier: ~10GB bandwidth + 100K function invocations/month
    // See: https://firebase.google.com/pricing
    monthlyFreeTier: {
      bandwidthGB: 10,
      functionInvocations: 100000,
    },
  },
  // Firebase Firestore - charges based on storage, reads, writes
  firestore: {
    name: 'Cloud Firestore',
    // Free tier: 1GB storage, 50K reads/writes/day
    // See: https://firebase.google.com/pricing
    monthlyFreeTier: {
      storageGB: 1,
      readsPerDay: 50000,
      writesPerDay: 20000,
    },
  },
  // Firebase Authentication - free (no charges for standard Auth)
  auth: {
    name: 'Firebase Authentication',
    // Completely free for standard usage
    monthlyFreeTier: {
      // No limits - free tier
    },
  },
  // Cloud Translation - charges per character translated
  cloudTranslation: {
    name: 'Google Cloud Translation',
    // Free tier: 500K characters/month
    // See: https://cloud.google.com/translation/pricing
    monthlyFreeTier: {
      charactersPerMonth: 500000,
    },
  },
} as const;

// Cloudflare R2 - charges based on storage and egress
export const R2 = {
  name: 'Cloudflare R2',
  // Free tier: 10GB storage + 1GB egress/month
  // See: https://www.cloudflare.com/racing/#r2
  monthlyFreeTier: {
    storageGB: 10,
    egressGB: 1,
  },
} as const;

// Resend - charges based on number of emails
export const RESEND = {
  name: 'Resend',
  // Free tier: 30,000 emails/month
  // See: https://resend.com/pricing
  monthlyFreeTier: {
    emailsPerMonth: 30000,
  },
} as const;

// Convenience: regroup under firebase key for backward compatibility
export const firebase = {
  appHosting: BILLABLE_SERVICES.appHosting,
  firestore: BILLABLE_SERVICES.firestore,
  auth: BILLABLE_SERVICES.auth,
  cloudTranslation: BILLABLE_SERVICES.cloudTranslation,
} as const;

// ---------------------------------------------------------------------------
// Estimated monthly cost (AC6.2.4)
// ---------------------------------------------------------------------------

/**
 * Presupuesto mensual estimado bajo uso dentro de los free tiers.
 * Este valor es orientativo; el costo real dependerá del uso real.
 */
export const ESTIMATED_MONTHLY_COST = {
  // When within free tiers: $0
  // Beyond free tiers: variable, depends on usage
  usd: 0, // Within free tier limits
  // Nota: Si se exceden los free tiers, los costos varian según consumo real.
  // Ver BILLABLE_SERVICES para detalles por servicio.
} as const;

// ---------------------------------------------------------------------------
// Firestore indices configuration (AC6.2.2)
// Índices compuestos SOLO para combinaciones documentadas.
// Cero (0) AggregationQuery.
// ---------------------------------------------------------------------------

/**
 * Índices documentados para Firestore.
 * Este es el catálogo completo de índices compuestos que deben existir.
 * NO agregar índices que no estén documentados aquí (AC6.2.2).
 *
 * Formato: colección -> [[campo ASC/DESC, ...]]
 */
export const FIRESTORE_INDEXES = {
  // Properties collection indices (AC1.10.4, US1.10)
  properties: [
    // Filter by status and operation (common list query)
    ['status', 'ASC', 'operacion', 'ASC'],
    // Filter by municipality and status
    ['municipio', 'ASC', 'status', 'ASC'],
    // Filter by department and operation
    ['departamento', 'ASC', 'operacion', 'ASC'],
    // Sort by createdAt descending (common list query)
    ['createdAt', 'DESC'],
  ],

  // Services collection indices
  services: [
    // Filter by status
    ['status', 'ASC'],
    // Sort by order then status
    ['orden', 'ASC', 'status', 'ASC'],
  ],

  // About collection indices
  about: [
    // No composite indices needed - single document
  ],
} as const;

// ---------------------------------------------------------------------------
// Budget alert configuration (AC6.2.1)
// ---------------------------------------------------------------------------

/**
 * Configuración de la alerta de presupuesto de Firebase.
 * Se crea manualmente cuando el proyecto está listo para desplegar.
 * La alerta NO corta el consumo ni los cargos (AC6.2.3) - solo alerta.
 *
 * NOTA: Esto es una configuración de ejemplo. En producción se crea a través
 * de la consola de Firebase o la CLI de Firebase:
 *   firebase budget:create --threshold=100
 *
 * Umbral recomendado: $10 USD (alertar antes de llegar al límite de free tier)
 */
export const BUDGET_ALERT = {
  // Umbral en USD para lanzar alerta
  // Se recomienda $10 para proyectos en desarrollo
  thresholdUsd: 10,

  // Nombre de la alerta
  name: 'JF Propiedad Raíz - Budget Alert',

  // Nota: La alerta SOMA los gastos y emite una notificación cuando se alcanza el umbral.
  // No detiene ni limita el consumo (AC6.2.3).
  // El desarrollador/deploy debe actuar sobre la alerta manualmente.
};

// ---------------------------------------------------------------------------
// Check if usage is within free tiers
// ---------------------------------------------------------------------------

/**
 * Verifica si el costo estimado está dentro de los free tiers.
 * @param usage Uso real actual (en GB, caracteres, ejecuciones, etc.)
 * @returns true si está dentro de los free tiers, false si se excedió
 */
export function isWithinFreeTier(usage: {
  storageGB?: number;
  bandwidthGB?: number;
  functionInvocations?: number;
  readsPerDay?: number;
  writesPerDay?: number;
  charactersPerMonth?: number;
  emailsPerMonth?: number;
  egressGB?: number;
}): boolean {
  // Check Firestore storage
  if (
    usage.storageGB &&
    usage.storageGB > (BILLABLE_SERVICES.firestore?.monthlyFreeTier?.storageGB ?? 1)
  ) {
    return false;
  }

  // Check Firestore reads
  if (
    usage.readsPerDay &&
    usage.readsPerDay > (BILLABLE_SERVICES.firestore?.monthlyFreeTier?.readsPerDay ?? 50000)
  ) {
    return false;
  }

  // Check Firestore writes
  if (
    usage.writesPerDay &&
    usage.writesPerDay > (BILLABLE_SERVICES.firestore?.monthlyFreeTier?.writesPerDay ?? 20000)
  ) {
    return false;
  }

  // Check App Hosting bandwidth
  if (
    usage.bandwidthGB &&
    usage.bandwidthGB > (BILLABLE_SERVICES.appHosting?.monthlyFreeTier?.bandwidthGB ?? 10)
  ) {
    return false;
  }

  // Check App Hosting function invocations
  if (
    usage.functionInvocations &&
    usage.functionInvocations >
      (BILLABLE_SERVICES.appHosting?.monthlyFreeTier?.functionInvocations ?? 100000)
  ) {
    return false;
  }

  // Check Cloud Translation characters
  if (
    usage.charactersPerMonth &&
    usage.charactersPerMonth >
      (BILLABLE_SERVICES.cloudTranslation?.monthlyFreeTier?.charactersPerMonth ?? 500000)
  ) {
    return false;
  }

  // Check R2 storage
  if (usage.storageGB && usage.storageGB > (R2?.monthlyFreeTier?.storageGB ?? 10)) {
    return false;
  }

  // Check R2 egress
  if (usage.egressGB && usage.egressGB > (R2?.monthlyFreeTier?.egressGB ?? 1)) {
    return false;
  }

  // Check Resend emails
  if (
    usage.emailsPerMonth &&
    usage.emailsPerMonth > (RESEND?.monthlyFreeTier?.emailsPerMonth ?? 30000)
  ) {
    return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// No secrets in repo check (AC6.2.5)
// ---------------------------------------------------------------------------

/**
 * Patterns that should NOT exist in the repository (AC6.2.5).
 * This is a checklist for code review - no secret should be committed in plain text.
 */
export const SECRET_PATTERNS = [
  // Firebase API keys (never commit)
  /AIza[0-9A-Za-z_-]{35}/,

  // Firebase auth projectId
  /projectId\s*[:=]\s*['"][^'"]+['"]/i,

  // Firestore private keys
  /privatekey\s*[:=]\s*['"][^'"]+['"]/i,

  // Resend API keys
  /resend['"]?\s*[:=]\s*['"][^'"]+['"]/i,

  // Cloudflare API tokens
  /['"]?api['"]?\s*[:=]\s*['"][^'"]{20,}['"]/i,

  // Generic JWT secrets
  /jwt['"]?\s*[:=]\s*['"][^'"]{16,}['"]/i,

  // Password literals
  /password\s*[:=]\s*['"][^'"]{8,}['"]/i,

  // Google Cloud credentials
  /type\s*[:=]\s*['"]service_account['"]/i,
] as const;

/**
 * Verifica si algún patrón de secreto está presente en el contenido de un archivo.
 * @param content Contenido del archivo a revisar
 * @returns true si se encontró algún patrón de secreto, false en caso contrario
 */
export function containsSecretPatterns(content: string): boolean {
  return SECRET_PATTERNS.some((pattern) => pattern.test(content));
}

// Export types for external use
export type BillableServiceKey = keyof typeof BILLABLE_SERVICES;
export type FirestoreIndexKey = keyof typeof FIRESTORE_INDEXES;
export type BudgetAlert = typeof BUDGET_ALERT;
export type SecretPattern = string | RegExp;

/**
 * Invoice checklist for MT1.5 delivery (AC6.2):
 * - [ ] Alerta de presupuesto configurada (umbral $10, manual creation)
 * - [ ] Índices compuestos revisados - solo los documentados en FIRESTORE_INDEXES
 * - [ ] Documentación AC6.2.3: alerta NO corta consumo/cargos
 * - [ ] Catálogo de servicios facturables listado en BILLABLE_SERVICES
 * - [ ] Objetivo $0 mensual documentado (depende de free tiers)
 * - [ ] Verificación AC6.2.5: ningún secreto en texto plano en el repositorio
 */
