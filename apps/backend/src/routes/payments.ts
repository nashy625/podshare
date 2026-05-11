import { type Response, Router } from "express";
import { Prisma, type Payment } from "@prisma/client";
import { z } from "zod";
import { featureFlags } from "../config.js";
import { collectPendingPaymentsForPod, currentBillingCycle, ensurePodCyclePayments } from "../lib/billing.js";
import { prisma } from "../lib/prisma.js";
import { stripe } from "../lib/stripe.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";

export const paymentsRouter = Router();

paymentsRouter.use(requireAuth);

const setupPaymentMethodSchema = z.object({
  stripePaymentMethodId: z.string().min(1),
  stripeCustomerId: z.string().optional(),
  brand: z.string().optional(),
  last4: z.string().min(4).max(4).optional(),
  expMonth: z.coerce.number().int().min(1).max(12).optional(),
  expYear: z.coerce.number().int().min(new Date().getFullYear()).max(2100).optional(),
  isDefault: z.boolean().default(true),
});

function requireStripe(res: Response) {
  if (stripe) {
    return true;
  }

  res.status(503).json({
    error: "Stripe is not configured for this environment.",
  });
  return false;
}

async function getOrCreateStripeCustomer(userId: string, email: string, name: string) {
  if (!stripe) {
    throw new Error("Stripe is not configured for this environment.");
  }

  const existingMethod = await prisma.paymentMethodReference.findFirst({
    where: {
      userId,
      stripeCustomerId: {
        not: null,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (existingMethod?.stripeCustomerId) {
    return existingMethod.stripeCustomerId;
  }

  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      podshareUserId: userId,
    },
  });

  return customer.id;
}

paymentsRouter.get("/", async (req: AuthenticatedRequest, res, next) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { user: { email: req.user!.email } },
      include: { pod: true },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    res.json({ payments });
  } catch (error) {
    next(error);
  }
});

paymentsRouter.get("/methods", async (req: AuthenticatedRequest, res, next) => {
  try {
    const methods = await prisma.paymentMethodReference.findMany({
      where: { user: { email: req.user!.email } },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    res.json({ methods });
  } catch (error) {
    next(error);
  }
});

paymentsRouter.post("/setup-intent", async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!stripe) {
      if (!requireStripe(res)) {
        return;
      }
      return;
    }

    if (!requireStripe(res)) {
      return;
    }

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: req.user!.email },
    });
    const customerId = await getOrCreateStripeCustomer(user.id, user.email, user.name);
    const intent = await stripe.setupIntents.create({
      customer: customerId,
      automatic_payment_methods: {
        enabled: true,
      },
      usage: "off_session",
      metadata: {
        podshareUserId: user.id,
      },
    });

    res.json({
      clientSecret: intent.client_secret,
      customerId,
    });
  } catch (error) {
    next(error);
  }
});

paymentsRouter.post("/setup", async (req: AuthenticatedRequest, res, next) => {
  try {
    const input = setupPaymentMethodSchema.parse(req.body);
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: req.user!.email },
    });

    if (input.isDefault) {
      await prisma.paymentMethodReference.updateMany({
        where: { userId: user.id },
        data: { isDefault: false },
      });
    }

    const method = await prisma.paymentMethodReference.upsert({
      where: {
        stripePaymentMethodId: input.stripePaymentMethodId,
      },
      update: {
        stripeCustomerId: input.stripeCustomerId,
        brand: input.brand,
        last4: input.last4,
        expMonth: input.expMonth,
        expYear: input.expYear,
        isDefault: input.isDefault,
      },
      create: {
        userId: user.id,
        stripeCustomerId: input.stripeCustomerId,
        stripePaymentMethodId: input.stripePaymentMethodId,
        brand: input.brand,
        last4: input.last4,
        expMonth: input.expMonth,
        expYear: input.expYear,
        isDefault: input.isDefault,
      },
    });

    res.status(202).json({
      message: "Payment method saved.",
      method,
    });
  } catch (error) {
    next(error);
  }
});

paymentsRouter.post("/methods/:id/default", async (req: AuthenticatedRequest, res, next) => {
  try {
    const methodId = z.string().parse(req.params.id);
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: req.user!.email },
    });

    await prisma.paymentMethodReference.updateMany({
      where: { userId: user.id },
      data: { isDefault: false },
    });

    const method = await prisma.paymentMethodReference.update({
      where: { id: methodId },
      data: { isDefault: true },
    });

    res.json({ method });
  } catch (error) {
    next(error);
  }
});

paymentsRouter.delete("/methods/:id", async (req, res, next) => {
  try {
    const methodId = z.string().parse(req.params.id);
    await prisma.paymentMethodReference.delete({
      where: { id: methodId },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

paymentsRouter.post("/:podId/pay", async (req: AuthenticatedRequest, res, next) => {
  try {
    const podId = String(req.params.podId);
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: req.user!.email },
    });
    const pod = await prisma.pod.findUniqueOrThrow({
      where: { id: podId },
    });
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const existingPayment = await prisma.payment.findFirst({
      where: {
        podId,
        userId: user.id,
        month,
        year,
      },
    });

    const payment = existingPayment
      ? await prisma.payment.update({
          where: { id: existingPayment.id },
          data: {
            status: "COMPLETED",
            paidAt: now,
          },
        })
      : await prisma.payment.create({
          data: {
            podId,
            userId: user.id,
            amount: new Prisma.Decimal(pod.costPerMember),
            status: "COMPLETED",
            stripePaymentId: "scaffold_manual_payment",
            month,
            year,
            paidAt: now,
          },
        });

    res.status(202).json({
      message: "Payment recorded.",
      podId: pod.id,
      stripeConfigured: featureFlags.stripeEnabled,
      payment,
    });
  } catch (error) {
    next(error);
  }
});

paymentsRouter.get("/summary", async (req: AuthenticatedRequest, res, next) => {
  try {
    const [payments, methods] = await Promise.all([
      prisma.payment.findMany({
        where: { user: { email: req.user!.email } },
      }),
      prisma.paymentMethodReference.findMany({
        where: { user: { email: req.user!.email } },
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      }),
    ]);

    const completed = payments.filter((payment: Payment) => payment.status === "COMPLETED");
    const totalSpent = completed.reduce((sum: number, payment: Payment) => sum + Number(payment.amount), 0);

    res.json({
      totalSpent,
      totalSaved: 0,
      upcomingPayments: payments.filter((payment: Payment) => payment.status === "PENDING").length,
      paymentMethodCount: methods.length,
      defaultPaymentMethod: methods.find((method) => method.isDefault) ?? null,
    });
  } catch (error) {
    next(error);
  }
});

paymentsRouter.get("/automation/preview", async (req: AuthenticatedRequest, res, next) => {
  try {
    const owner = await prisma.user.findUniqueOrThrow({
      where: { email: req.user!.email },
    });
    const cycle = currentBillingCycle();
    const pods = await prisma.pod.findMany({
      where: { ownerId: owner.id },
      include: {
        subscription: true,
        members: {
          where: { status: "ACTIVE" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const preview = await Promise.all(
      pods.map(async (pod) => {
        const payments = await prisma.payment.findMany({
          where: {
            podId: pod.id,
            month: cycle.month,
            year: cycle.year,
          },
        });

        return {
          podId: pod.id,
          podName: pod.name,
          subscriptionName: pod.subscription.name,
          activeMembers: pod.members.length,
          existingPayments: payments.length,
          pendingPayments: payments.filter((payment) => payment.status === "PENDING").length,
          completedPayments: payments.filter((payment) => payment.status === "COMPLETED").length,
        };
      }),
    );

    res.json({
      cycle,
      preview,
    });
  } catch (error) {
    next(error);
  }
});

paymentsRouter.post("/automation/run", async (req: AuthenticatedRequest, res, next) => {
  try {
    const owner = await prisma.user.findUniqueOrThrow({
      where: { email: req.user!.email },
    });
    const { dryRun } = z.object({
      dryRun: z.boolean().default(false),
    }).parse(req.body ?? {});
    const cycle = currentBillingCycle();
    const pods = await prisma.pod.findMany({
      where: { ownerId: owner.id },
      orderBy: { createdAt: "desc" },
    });

    const results = [];
    for (const pod of pods) {
      await ensurePodCyclePayments(pod.id, cycle);
      const result = await collectPendingPaymentsForPod(pod.id, cycle, dryRun);
      results.push(result);
    }

    res.json({
      cycle,
      dryRun,
      results,
    });
  } catch (error) {
    next(error);
  }
});

paymentsRouter.get("/pods/:podId/summary", async (req: AuthenticatedRequest, res, next) => {
  try {
    const podId = z.string().parse(req.params.podId);
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: req.user!.email },
    });
    const pod = await prisma.pod.findUniqueOrThrow({
      where: { id: podId },
      include: {
        owner: true,
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    const canView =
      pod.ownerId === user.id ||
      pod.members.some((member) => member.userId === user.id && ["ACTIVE", "PENDING"].includes(member.status));

    if (!canView) {
      res.status(403).json({ error: "You do not have access to this pod's billing details." });
      return;
    }

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const payments = await prisma.payment.findMany({
      where: {
        podId,
        month,
        year,
      },
    });

    const activeMembers = pod.members.filter((member) => member.status === "ACTIVE");
    const pendingMembers = pod.members.filter((member) => member.status === "PENDING");
    const memberBilling = activeMembers.map((member) => {
      const payment = payments.find((entry) => entry.userId === member.userId);

      return {
        memberId: member.id,
        userId: member.user.id,
        name: member.user.name,
        email: member.user.email,
        amountDue: Number(pod.costPerMember),
        paymentStatus: payment?.status ?? "PENDING",
        paymentId: payment?.id ?? null,
        paidAt: payment?.paidAt ?? null,
      };
    });

    const totalCollected = payments
      .filter((payment) => payment.status === "COMPLETED")
      .reduce((sum, payment) => sum + Number(payment.amount), 0);

    res.json({
      podId: pod.id,
      month,
      year,
      splitAmount: Number(pod.costPerMember),
      totalCollected,
      activeMemberCount: activeMembers.length,
      pendingMemberCount: pendingMembers.length,
      memberBilling,
      currentUserPayment:
        memberBilling.find((entry) => entry.userId === user.id) ?? null,
      owner: {
        id: pod.owner.id,
        name: pod.owner.name,
        email: pod.owner.email,
      },
    });
  } catch (error) {
    next(error);
  }
});
