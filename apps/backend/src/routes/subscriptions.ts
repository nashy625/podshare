import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";

const subscriptionSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  monthlyCost: z.coerce.number().positive(),
  billingDate: z.number().int().min(1).max(31),
  isActive: z.boolean().optional(),
});

export const subscriptionsRouter = Router();

subscriptionsRouter.use(requireAuth);

subscriptionsRouter.get("/", async (req: AuthenticatedRequest, res, next) => {
  try {
    const subscriptions = await prisma.subscription.findMany({
      where: { user: { email: req.user!.email } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ subscriptions });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.post("/", async (req: AuthenticatedRequest, res, next) => {
  try {
    const input = subscriptionSchema.parse(req.body);
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: req.user!.email },
    });

    const subscription = await prisma.subscription.create({
      data: {
        ...input,
        monthlyCost: input.monthlyCost,
        userId: user.id,
      },
    });

    res.status(201).json({ subscription });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.put("/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const subscriptionId = z.string().parse(req.params.id);
    const input = subscriptionSchema.partial().parse(req.body);

    const subscription = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: input,
    });

    res.json({ subscription });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.delete("/:id", async (req, res, next) => {
  try {
    const subscriptionId = z.string().parse(req.params.id);
    await prisma.subscription.delete({
      where: { id: subscriptionId },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
