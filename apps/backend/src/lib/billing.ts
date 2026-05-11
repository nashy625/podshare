import { Prisma, type PaymentStatus } from "@prisma/client";
import { prisma } from "./prisma.js";
import { stripe } from "./stripe.js";

export type BillingCycle = {
  month: number;
  year: number;
};

export function currentBillingCycle(): BillingCycle {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
}

export async function ensurePodCyclePayments(podId: string, cycle: BillingCycle) {
  const pod = await prisma.pod.findUniqueOrThrow({
    where: { id: podId },
    include: {
      members: {
        where: {
          status: "ACTIVE",
        },
        include: {
          user: {
            include: {
              paymentMethods: {
                orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
              },
            },
          },
        },
      },
    },
  });

  const existingPayments = await prisma.payment.findMany({
    where: {
      podId,
      month: cycle.month,
      year: cycle.year,
    },
  });

  const created = [];

  for (const member of pod.members) {
    const existing = existingPayments.find((payment) => payment.userId === member.userId);
    if (existing) {
      continue;
    }

    const payment = await prisma.payment.create({
      data: {
        podId,
        userId: member.userId,
        amount: new Prisma.Decimal(pod.costPerMember),
        status: "PENDING",
        month: cycle.month,
        year: cycle.year,
      },
    });

    created.push(payment);
  }

  return {
    pod,
    created,
  };
}

export async function collectPendingPaymentsForPod(podId: string, cycle: BillingCycle, dryRun = false) {
  await ensurePodCyclePayments(podId, cycle);

  const pod = await prisma.pod.findUniqueOrThrow({
    where: { id: podId },
    include: {
      members: {
        where: {
          status: "ACTIVE",
        },
        include: {
          user: {
            include: {
              paymentMethods: {
                orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
              },
            },
          },
        },
      },
    },
  });

  const payments = await prisma.payment.findMany({
    where: {
      podId,
      month: cycle.month,
      year: cycle.year,
    },
  });

  const results: Array<{
    userId: string;
    email: string;
    status: PaymentStatus | "SKIPPED";
    paymentId: string | null;
    reason?: string;
  }> = [];

  for (const member of pod.members) {
    const payment = payments.find((entry) => entry.userId === member.userId);
    const defaultMethod = member.user.paymentMethods.find((method) => method.isDefault) ?? member.user.paymentMethods[0];

    if (!payment) {
      results.push({
        userId: member.user.id,
        email: member.user.email,
        status: "SKIPPED",
        paymentId: null,
        reason: "No payment record available.",
      });
      continue;
    }

    if (payment.status === "COMPLETED") {
      results.push({
        userId: member.user.id,
        email: member.user.email,
        status: payment.status,
        paymentId: payment.id,
      });
      continue;
    }

    if (!defaultMethod?.stripeCustomerId || !defaultMethod.stripePaymentMethodId) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
        },
      });

      results.push({
        userId: member.user.id,
        email: member.user.email,
        status: "FAILED",
        paymentId: payment.id,
        reason: "No default payment method available.",
      });
      continue;
    }

    if (dryRun) {
      results.push({
        userId: member.user.id,
        email: member.user.email,
        status: payment.status,
        paymentId: payment.id,
        reason: "Dry run only.",
      });
      continue;
    }

    if (!stripe) {
      results.push({
        userId: member.user.id,
        email: member.user.email,
        status: "SKIPPED",
        paymentId: payment.id,
        reason: "Stripe is not configured for this environment.",
      });
      continue;
    }

    try {
      const intent = await stripe.paymentIntents.create({
        amount: Math.round(Number(payment.amount) * 100),
        currency: "usd",
        customer: defaultMethod.stripeCustomerId,
        payment_method: defaultMethod.stripePaymentMethodId,
        off_session: true,
        confirm: true,
        metadata: {
          podId,
          paymentId: payment.id,
          podshareUserId: member.user.id,
        },
      });

      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: intent.status === "succeeded" ? "COMPLETED" : "PROCESSING",
          stripePaymentId: intent.id,
          paidAt: intent.status === "succeeded" ? new Date() : null,
        },
      });

      results.push({
        userId: member.user.id,
        email: member.user.email,
        status: intent.status === "succeeded" ? "COMPLETED" : "PROCESSING",
        paymentId: payment.id,
      });
    } catch (error) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
        },
      });

      results.push({
        userId: member.user.id,
        email: member.user.email,
        status: "FAILED",
        paymentId: payment.id,
        reason: error instanceof Error ? error.message : "Stripe charge failed.",
      });
    }
  }

  return {
    podId,
    cycle,
    results,
  };
}
