import { Response } from 'express';

export const sendSuccess = (
  res: Response,
  data: unknown = null,
  message?: string,
  status: number = 200
) => {
  res.status(status).json({
    success: true,
    data,
    message,
    requestId: (res.req as any).id,
  });
};

export const sendError = (
  res: Response,
  error: string,
  status: number = 500
) => {
  res.status(status).json({
    success: false,
    error,
    requestId: (res.req as any).id,
  });
};