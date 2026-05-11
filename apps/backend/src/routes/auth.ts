import { Router } from "express";
import { z } from "zod";
import { env } from "../config.js";
import { prisma } from "../lib/prisma.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { syncAuthenticatedUser } from "../lib/users.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";

const magicLinkSchema = z.object({
  email: z.string().email().refine((value) => value.endsWith("@stanford.edu"), {
    message: "Only Stanford emails are allowed.",
  }),
});

const profileSchema = z.object({
  name: z.string().min(1),
  major: z.string().optional(),
  year: z.number().int().min(2024).max(2100).optional(),
  avatarUrl: z.string().url().optional(),
});

export const authRouter = Router();

authRouter.post("/magic-link", async (req, res, next) => {
  try {
    const { email } = magicLinkSchema.parse(req.body);

    await supabaseAdmin.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${env.APP_URL}/login/verify`,
      },
    });

    res.status(202).json({ message: "Magic link sent if the email is eligible." });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/verify", async (req, res, next) => {
  try {
    const { accessToken } = z.object({ accessToken: z.string().min(1) }).parse(req.body);
    const { data, error } = await supabaseAdmin.auth.getUser(accessToken);

    if (error || !data.user?.email) {
      res.status(401).json({ error: "Unable to verify session token" });
      return;
    }

    const user = await syncAuthenticatedUser({
      authUserId: data.user.id,
      email: data.user.email,
      name: data.user.user_metadata?.full_name ?? data.user.user_metadata?.name ?? null,
      avatarUrl: data.user.user_metadata?.avatar_url ?? null,
    });

    res.json({
      user,
    });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { email: req.user!.email },
      include: {
        subscriptions: true,
        memberships: true,
      },
    });

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

authRouter.put("/profile", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const input = profileSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { email: req.user!.email },
      data: input,
    });

    res.json({ user });
  } catch (error) {
    next(error);
  }
});
