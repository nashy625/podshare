import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: error.errors[0]?.message ?? "Invalid request",
      issues: error.errors,
    });
    return;
  }

  const message = error instanceof Error ? error.message : "Unexpected server error";
  const statusCode = typeof error === "object" && error !== null && "statusCode" in error
    ? Number((error as { statusCode: number }).statusCode)
    : 500;

  res.status(statusCode).json({
    error: message,
  });
}
