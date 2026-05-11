import type { NextFunction, Request, Response } from "express";

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  const message = error instanceof Error ? error.message : "Unexpected server error";
  const statusCode = typeof error === "object" && error !== null && "statusCode" in error
    ? Number((error as { statusCode: number }).statusCode)
    : 500;

  res.status(statusCode).json({
    error: message,
  });
}
