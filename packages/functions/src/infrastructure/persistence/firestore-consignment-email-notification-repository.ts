// Adaptador Firestore de `ConsignmentEmailNotificationRepository` (T8).
//
// Persiste solo notificaciones de email de consignación con tag de admin.
// El id de documento es el `svix-id` del evento de Resend, lo que garantiza
// idempotencia ante replays del webhook. No se persiste PII.

import type { Firestore } from 'firebase-admin/firestore';
import { z } from 'zod';

import type { ConsignmentEmailNotificationRepository } from '../../application/ports/consignment-email-notification-repository';
import type { ResendNotification } from '../../application/consignments/resend-notification';

const COLECCION_NOTIFICACIONES = 'consignment_email_notifications';

const NotificacionFirestoreSchema = z.object({
  eventId: z.string().min(1),
  eventType: z.string().min(1),
  requestId: z.string().min(1),
  consignmentKind: z.literal('admin'),
  createdAt: z.string().datetime(),
  receivedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});

type NotificacionPersistida = ResendNotification & { readonly expiresAt: string };

function documentoANotificacion(snap: { id: string; data(): unknown }): NotificacionPersistida {
  const data = snap.data() as Record<string, unknown>;
  const parsed = NotificacionFirestoreSchema.parse(data);
  return {
    eventId: parsed.eventId,
    eventType: parsed.eventType,
    createdAt: parsed.createdAt,
    receivedAt: parsed.receivedAt,
    expiresAt: parsed.expiresAt,
  };
}

function esVigente(expiresAt: string, now: Date): boolean {
  return new Date(expiresAt) > now;
}

function esErrorDocumentoYaExiste(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { readonly code: unknown }).code === 'already-exists'
  );
}

export function createFirestoreConsignmentEmailNotificationRepository(
  db: Firestore,
  options: { readonly now?: () => Date } = {},
): ConsignmentEmailNotificationRepository {
  const coleccion = db.collection(COLECCION_NOTIFICACIONES);
  const obtenerAhora = options.now ?? (() => new Date());

  async function appendIfAbsent(input: {
    readonly svixId: string;
    readonly requestId: string;
    readonly notification: ResendNotification;
    readonly expiresAt: string;
  }): Promise<void> {
    try {
      await coleccion.doc(input.svixId).create({
        eventId: input.notification.eventId,
        eventType: input.notification.eventType,
        requestId: input.requestId,
        consignmentKind: 'admin',
        createdAt: input.notification.createdAt,
        receivedAt: input.notification.receivedAt,
        expiresAt: input.expiresAt,
      });
    } catch (error) {
      // Replay del webhook: el documento ya existe. No-op intencional para
      // garantizar idempotencia. Cualquier otro error se propaga.
      if (esErrorDocumentoYaExiste(error)) return;
      throw error;
    }
  }

  async function listByRequestId(requestId: string): Promise<readonly ResendNotification[]> {
    const snap = await coleccion.where('requestId', '==', requestId).get();
    const ahora = obtenerAhora();

    return snap.docs
      .map((doc) => documentoANotificacion(doc))
      .filter((n) => esVigente(n.expiresAt, ahora))
      .sort((a, b) => (a.receivedAt < b.receivedAt ? -1 : a.receivedAt > b.receivedAt ? 1 : 0))
      .map(({ expiresAt: _expiresAt, ...n }) => n);
  }

  return { appendIfAbsent, listByRequestId };
}
