import type { RequestHandler } from 'express';

import { HEALTH_OK } from '../../health';

export const healthHandler: RequestHandler = (_req, res) => {
  res.status(200).json(HEALTH_OK);
};
