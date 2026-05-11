import type { NextFunction, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase.js";
import { syncAuthenticatedUser } from "../lib/users.js";

export type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    email: string;
    name?: string | null;
  };
};

async function resolveAuthenticatedUser(req: AuthenticatedRequest) {
  const authHeader = req.header("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false as const, reason: "Missing bearer token" };
  }

  const token = authHeader.slice("Bearer ".length).trim();

  if (!token) {
    return { ok: false as const, reason: "Invalid bearer token" };
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user?.email) {
    return { ok: false as const, reason: "Invalid or expired session" };
  }

  if (!data.user.email.endsWith("@stanford.edu")) {
    return { ok: false as const, reason: "Only Stanford emails are allowed", statusCode: 403 };
  }

  req.user = {
    id: data.user.id,
    email: data.user.email,
    name: data.user.user_metadata?.full_name ?? data.user.user_metadata?.name ?? null,
  };

  await syncAuthenticatedUser({
    authUserId: data.user.id,
    email: data.user.email,
    name: req.user.name,
    avatarUrl: data.user.user_metadata?.avatar_url ?? null,
  });

  return { ok: true as const };
}

export async function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  try {
    const result = await resolveAuthenticatedUser(req);

    if (!result.ok) {
      req.user = undefined;
    }

    next();
  } catch (error) {
    next(error);
  }
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await resolveAuthenticatedUser(req);

    if (!result.ok) {
      res.status(result.statusCode ?? 401).json({ error: result.reason });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
}
