import { describe, expect, it } from 'vitest';

import {
  CONSIGNMENT_KIND_TAG,
  CONSIGNMENT_REQUEST_ID_TAG,
  esNotificacionAdmin,
  type ResendEmailKind,
} from './resend-notification';

describe('ResendEmailKind', () => {
  it('solo admite admin y client', () => {
    const admin: ResendEmailKind = 'admin';
    const client: ResendEmailKind = 'client';
    expect(admin).toBe('admin');
    expect(client).toBe('client');
  });
});

describe('constantes de tag', () => {
  it('CONSIGNMENT_KIND_TAG es consignmentKind', () => {
    expect(CONSIGNMENT_KIND_TAG).toBe('consignmentKind');
  });

  it('CONSIGNMENT_REQUEST_ID_TAG es consignmentRequestId', () => {
    expect(CONSIGNMENT_REQUEST_ID_TAG).toBe('consignmentRequestId');
  });
});

describe('esNotificacionAdmin', () => {
  it('persiste solo notificaciones con tag admin', () => {
    expect(
      esNotificacionAdmin({
        [CONSIGNMENT_KIND_TAG]: 'admin',
        [CONSIGNMENT_REQUEST_ID_TAG]: 'req-1',
      }),
    ).toBe(true);
  });

  it('descarta notificaciones con tag client', () => {
    expect(
      esNotificacionAdmin({
        [CONSIGNMENT_KIND_TAG]: 'client',
        [CONSIGNMENT_REQUEST_ID_TAG]: 'req-1',
      }),
    ).toBe(false);
  });

  it('descarta notificaciones sin tag de tipo', () => {
    expect(esNotificacionAdmin({ [CONSIGNMENT_REQUEST_ID_TAG]: 'req-1' })).toBe(false);
  });

  it('descarta notificaciones sin tags', () => {
    expect(esNotificacionAdmin({})).toBe(false);
  });
});
