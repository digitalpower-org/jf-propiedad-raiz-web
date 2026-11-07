import crypto from 'crypto';
import type { RequestHandler } from 'express';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;

export const requestId: RequestHandler = (req, res, next) => {
  const incoming = req.header('x-request-id');
  const requestIdValue =
    incoming !== undefined && REQUEST_ID_PATTERN.test(incoming) ? incoming : crypto.randomUUID();

  res.locals.requestId = requestIdValue;
  res.setHeader('X-Request-Id', requestIdValue);
  next();
};
