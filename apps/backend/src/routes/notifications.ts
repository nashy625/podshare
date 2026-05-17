import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

notificationsRouter.get("/", async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: req.user!.email },
    });
    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const unreadCount = await prisma.notification.count({
      where: {
        userId: user.id,
        readAt: null,
      },
    });

    res.json({ notifications, unreadCount });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.post("/:id/read", async (req: AuthenticatedRequest, res, next) => {
  try {
    const notificationId = z.string().parse(req.params.id);
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: req.user!.email },
    });
    const existing = await prisma.notification.findUniqueOrThrow({
      where: { id: notificationId },
    });
    if (existing.userId !== user.id) {
      res.status(403).json({ error: "You cannot update this notification." });
      return;
    }

    const notification = await prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });

    res.json({ notification });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.post("/read-all", async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: req.user!.email },
    });
    const result = await prisma.notification.updateMany({
      where: {
        userId: user.id,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    res.json({ updated: result.count });
  } catch (error) {
    next(error);
  }
});
