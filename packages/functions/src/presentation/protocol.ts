import type { Response } from 'express';
import type { ApiErrorData, ApiFailure, ApiSuccess } from '@jf/shared-types';

import type { ErrorStatus, SuccessStatus } from './contractStatus';

export function writeSuccess<T>(
  res: Response,
  data: T,
  message: string,
  status: SuccessStatus = 200,
): void {
  const body: ApiSuccess<T> = { success: true, data, message };
  res.status(status).json(body);
}

export function writeError(
  res: Response,
  status: ErrorStatus,
  data: ApiErrorData,
  message: string,
): void {
  const body: ApiFailure = { success: false, data, message };
  res.status(status).json(body);
}
