import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";

const sendRequestSchema = z.object({
  email: z.string().email(),
});

const respondSchema = z.object({
  action: z.enum(["accept", "decline", "block"]),
});

export const friendsRouter = Router();

friendsRouter.use(requireAuth);

friendsRouter.get("/", async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: req.user!.email },
    });

    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { requesterId: user.id },
          { addresseeId: user.id },
        ],
      },
      include: {
        requester: true,
        addressee: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ friendships });
  } catch (error) {
    next(error);
  }
});

friendsRouter.post("/requests", async (req: AuthenticatedRequest, res, next) => {
  try {
    const { email } = sendRequestSchema.parse(req.body);
    const requester = await prisma.user.findUniqueOrThrow({
      where: { email: req.user!.email },
    });
    const addressee = await prisma.user.findUniqueOrThrow({
      where: { email },
    });

    if (requester.id === addressee.id) {
      res.status(400).json({ error: "You cannot add yourself as a friend." });
      return;
    }

    const friendship = await prisma.friendship.upsert({
      where: {
        requesterId_addresseeId: {
          requesterId: requester.id,
          addresseeId: addressee.id,
        },
      },
      update: {
        status: "PENDING",
        respondedAt: null,
      },
      create: {
        requesterId: requester.id,
        addresseeId: addressee.id,
      },
    });

    res.status(201).json({ friendship });
  } catch (error) {
    next(error);
  }
});

friendsRouter.post("/requests/:id/respond", async (req, res, next) => {
  try {
    const requestId = z.string().parse(req.params.id);
    const { action } = respondSchema.parse(req.body);

    const status = action === "accept" ? "ACCEPTED" : action === "decline" ? "DECLINED" : "BLOCKED";

    const friendship = await prisma.friendship.update({
      where: { id: requestId },
      data: {
        status,
        respondedAt: new Date(),
      },
    });

    res.json({ friendship });
  } catch (error) {
    next(error);
  }
});
