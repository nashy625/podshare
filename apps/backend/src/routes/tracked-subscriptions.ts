import { Prisma, type TrackedSubscription } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";

const trackedSubscriptionSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  provider: z.string().optional(),
  monthlyCost: z.coerce.number().positive(),
  billingDate: z.coerce.number().int().min(1).max(31).optional(),
  source: z.enum(["MANUAL", "LINKED", "PODSHARE"]).default("MANUAL"),
  isShared: z.boolean().default(false),
  estimatedRetailCost: z.coerce.number().positive().optional(),
  linkedSubscriptionId: z.string().uuid().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const trackedSubscriptionsRouter = Router();

trackedSubscriptionsRouter.use(requireAuth);

trackedSubscriptionsRouter.get("/", async (req: AuthenticatedRequest, res, next) => {
  try {
    const subscriptions = await prisma.trackedSubscription.findMany({
      where: { user: { email: req.user!.email } },
      include: {
        linkedSubscription: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ subscriptions });
  } catch (error) {
    next(error);
  }
});

trackedSubscriptionsRouter.get("/summary", async (req: AuthenticatedRequest, res, next) => {
  try {
    const subscriptions = await prisma.trackedSubscription.findMany({
      where: {
        user: { email: req.user!.email },
        isActive: true,
      },
    });

    const monthlySpend = subscriptions.reduce(
      (sum: number, subscription: TrackedSubscription) => sum + Number(subscription.monthlyCost),
      0,
    );
    const monthlyRetailValue = subscriptions.reduce(
      (sum: number, subscription: TrackedSubscription) =>
        sum + Number(subscription.estimatedRetailCost ?? subscription.monthlyCost),
      0,
    );

    res.json({
      activeCount: subscriptions.length,
      monthlySpend,
      monthlySavings: Math.max(monthlyRetailValue - monthlySpend, 0),
      sharedCount: subscriptions.filter((subscription: TrackedSubscription) => subscription.isShared).length,
    });
  } catch (error) {
    next(error);
  }
});

trackedSubscriptionsRouter.post("/", async (req: AuthenticatedRequest, res, next) => {
  try {
    const input = trackedSubscriptionSchema.parse(req.body);
    const { linkedSubscriptionId, ...subscriptionInput } = input;
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: req.user!.email },
    });

    const subscription = await prisma.trackedSubscription.create({
      data: {
        ...subscriptionInput,
        monthlyCost: new Prisma.Decimal(input.monthlyCost),
        estimatedRetailCost: input.estimatedRetailCost !== undefined
          ? new Prisma.Decimal(input.estimatedRetailCost)
          : undefined,
        user: {
          connect: { id: user.id },
        },
        linkedSubscription: linkedSubscriptionId
          ? {
              connect: { id: linkedSubscriptionId },
            }
          : undefined,
      },
    });

    res.status(201).json({ subscription });
  } catch (error) {
    next(error);
  }
});

trackedSubscriptionsRouter.put("/:id", async (req, res, next) => {
  try {
    const trackedSubscriptionId = z.string().parse(req.params.id);
    const input = trackedSubscriptionSchema.partial().parse(req.body);

    const subscription = await prisma.trackedSubscription.update({
      where: { id: trackedSubscriptionId },
      data: {
        ...input,
        monthlyCost: input.monthlyCost !== undefined ? new Prisma.Decimal(input.monthlyCost) : undefined,
        estimatedRetailCost: input.estimatedRetailCost !== undefined
          ? new Prisma.Decimal(input.estimatedRetailCost)
          : undefined,
      },
    });

    res.json({ subscription });
  } catch (error) {
    next(error);
  }
});

trackedSubscriptionsRouter.delete("/:id", async (req, res, next) => {
  try {
    const trackedSubscriptionId = z.string().parse(req.params.id);
    await prisma.trackedSubscription.delete({
      where: { id: trackedSubscriptionId },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
