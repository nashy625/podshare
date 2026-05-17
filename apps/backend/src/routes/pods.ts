import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { findServiceCatalogEntry } from "@podshare/shared";
import { prisma } from "../lib/prisma.js";
import {
  collectPendingPaymentsForPod,
  currentBillingCycle,
  ensurePodCyclePayments,
  refreshPodPurchaseStage,
} from "../lib/billing.js";
import { env } from "../config.js";
import { encrypt, decrypt } from "../lib/encryption.js";
import { isAdminEmail } from "../lib/admin.js";
import { createNotification, createNotifications } from "../lib/notifications.js";
import { optionalAuth, requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";

const tierSeatCounts: Record<string, number> = {
  INDIVIDUAL: 2,
  STANDARD: 4,
  FAMILY: 6,
  TEAM: 6,
};

function splitAmount(monthlyCost: Prisma.Decimal | number | string, activeMemberCount: number, platformFeePercent: Prisma.Decimal | number | string) {
  const memberCount = Math.max(activeMemberCount, 1);
  const base = Number(monthlyCost);
  const feeMultiplier = 1 + Number(platformFeePercent) / 100;
  return new Prisma.Decimal((base * feeMultiplier / memberCount).toFixed(2));
}

async function refreshPodSplitCost(podId: string) {
  const pod = await prisma.pod.findUniqueOrThrow({
    where: { id: podId },
    include: {
      subscription: true,
      members: {
        where: { status: "ACTIVE" },
      },
    },
  });

  return prisma.pod.update({
    where: { id: podId },
    data: {
      costPerMember: splitAmount(pod.subscription.monthlyCost, pod.members.length, pod.platformFeePercent),
    },
  });
}

async function userHasPaymentMethod(userId: string) {
  const count = await prisma.paymentMethodReference.count({
    where: { userId },
  });

  return count > 0;
}

const createPodSchema = z.object({
  name: z.string().min(1),
  subscriptionId: z.string().uuid(),
  subscriptionTier: z.enum(["INDIVIDUAL", "STANDARD", "FAMILY", "TEAM"]).default("STANDARD"),
  platformFeePercent: z.coerce.number().min(0).max(25).default(5),
  serviceAccountEmail: z.string().email().optional(),
  serviceAccountLogin: z.string().min(1).optional(),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).default("PRIVATE"),
  credentials: z.string().optional(),
});

const testMemberSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

export const podsRouter = Router();

async function requirePodOwner(podId: string, email: string) {
  const pod = await prisma.pod.findUniqueOrThrow({
    where: { id: podId },
    include: {
      owner: true,
      subscription: true,
    },
  });

  if (pod.owner.email !== email) {
    const error = new Error("Only the pod owner can perform this action.");
    (error as Error & { statusCode?: number }).statusCode = 403;
    throw error;
  }

  return pod;
}

podsRouter.get("/invites/incoming", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: req.user!.email },
    });

    const invites = await prisma.podInvite.findMany({
      where: {
        recipientId: user.id,
      },
      include: {
        pod: {
          include: {
            subscription: true,
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
                major: true,
                year: true,
              },
            },
          },
        },
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            major: true,
            year: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ invites });
  } catch (error) {
    next(error);
  }
});

podsRouter.get("/mine", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: req.user!.email },
    });

    const [ownedPods, memberPods] = await Promise.all([
      prisma.pod.findMany({
        where: {
          ownerId: user.id,
        },
        include: {
          subscription: true,
          members: {
            include: {
              user: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.podMember.findMany({
        where: {
          userId: user.id,
        },
        include: {
          pod: {
            include: {
              subscription: true,
              owner: true,
              members: {
                include: {
                  user: true,
                },
              },
            },
          },
        },
        orderBy: { joinedAt: "desc" },
      }),
    ]);

    res.json({
      ownedPods,
      memberPods,
    });
  } catch (error) {
    next(error);
  }
});

podsRouter.get("/operations/ready-to-purchase", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const admin = isAdminEmail(req.user!.email);
    const owner = admin
      ? null
      : await prisma.user.findUniqueOrThrow({
          where: { email: req.user!.email },
        });
    const pods = await prisma.pod.findMany({
      where: {
        ...(owner ? { ownerId: owner.id } : {}),
        purchaseStage: "READY_TO_PURCHASE",
      },
      include: {
        subscription: true,
        owner: true,
        members: {
          where: { status: "ACTIVE" },
          include: { user: true },
        },
        payments: {
          where: currentBillingCycle(),
        },
      },
      orderBy: { createdAt: "asc" },
    });

    res.json({ pods });
  } catch (error) {
    next(error);
  }
});

podsRouter.get("/operations/purchased", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const admin = isAdminEmail(req.user!.email);
    const owner = admin
      ? null
      : await prisma.user.findUniqueOrThrow({
          where: { email: req.user!.email },
        });
    const pods = await prisma.pod.findMany({
      where: {
        ...(owner ? { ownerId: owner.id } : {}),
        purchaseStage: "PURCHASED",
      },
      include: {
        subscription: true,
        members: {
          where: { status: "ACTIVE" },
          include: { user: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ pods });
  } catch (error) {
    next(error);
  }
});

podsRouter.post("/invites/:id/respond", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const inviteId = z.string().parse(req.params.id);
    const { action } = z.object({
      action: z.enum(["accept", "decline"]),
    }).parse(req.body);

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: req.user!.email },
    });

    const invite = await prisma.podInvite.findUniqueOrThrow({
      where: { id: inviteId },
      include: {
        pod: true,
      },
    });

    if (invite.recipientId !== user.id) {
      res.status(403).json({ error: "You cannot respond to this invite." });
      return;
    }

    const updatedInvite = await prisma.podInvite.update({
      where: { id: inviteId },
      data: {
        status: action === "accept" ? "ACCEPTED" : "DECLINED",
        respondedAt: new Date(),
      },
    });

    if (action === "accept") {
      if (!(await userHasPaymentMethod(user.id))) {
        res.status(402).json({ error: "Add a payment method before accepting a paid pod invite." });
        return;
      }

      await prisma.podMember.upsert({
        where: {
          podId_userId: {
            podId: invite.podId,
            userId: user.id,
          },
        },
        update: {
          status: "ACTIVE",
          joinedAt: new Date(),
        },
        create: {
          podId: invite.podId,
          userId: user.id,
          status: "ACTIVE",
          joinedAt: new Date(),
        },
      });
      await refreshPodSplitCost(invite.podId);
    }

    res.json({ invite: updatedInvite });
  } catch (error) {
    next(error);
  }
});

podsRouter.get("/", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const filters = z.object({
      visibility: z.enum(["PUBLIC", "PRIVATE"]).optional(),
      category: z.string().optional(),
    }).parse(req.query);

    const pods = await prisma.pod.findMany({
      where: {
        visibility: filters.visibility ?? "PUBLIC",
        ...(filters.category
          ? { subscription: { category: filters.category } }
          : {}),
      },
      include: {
        subscription: true,
        owner: {
          select: {
            id: true,
            name: true,
            major: true,
            year: true,
          },
        },
        members: {
          where: {
            status: "ACTIVE",
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ pods });
  } catch (error) {
    next(error);
  }
});

podsRouter.post("/", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const input = createPodSchema.parse(req.body);
    const owner = await prisma.user.findUniqueOrThrow({
      where: { email: req.user!.email },
    });
    const subscription = await prisma.subscription.findFirstOrThrow({
      where: {
        id: input.subscriptionId,
        userId: owner.id,
      },
    });
    const service = findServiceCatalogEntry(subscription.name);

    if (service && !service.eligibleForPaidPods) {
      res.status(422).json({
        error: `${service.name} is not eligible for paid PodShare pods under the current policy.`,
        policy: service.policy,
        notes: service.notes,
      });
      return;
    }

    const maxMembers = Math.min(tierSeatCounts[input.subscriptionTier], service?.maxSeats ?? tierSeatCounts[input.subscriptionTier]);
    const costPerMember = splitAmount(subscription.monthlyCost, maxMembers, input.platformFeePercent);

    const pod = await prisma.pod.create({
      data: {
        name: input.name,
        subscriptionId: input.subscriptionId,
        visibility: input.visibility,
        subscriptionTier: input.subscriptionTier,
        platformFeePercent: input.platformFeePercent,
        serviceAccountEmail: input.serviceAccountEmail,
        serviceAccountLogin: input.serviceAccountLogin,
        maxMembers,
        costPerMember,
        credentials: input.credentials ? encrypt(input.credentials) : undefined,
        ownerId: owner.id,
        members: {
          create: {
            userId: owner.id,
            status: "ACTIVE",
            joinedAt: new Date(),
          },
        },
      },
      include: {
        subscription: true,
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    res.status(201).json({ pod });
  } catch (error) {
    next(error);
  }
});

podsRouter.get("/:id", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const podId = z.string().parse(req.params.id);
    const pod = await prisma.pod.findUnique({
      where: { id: podId },
      include: {
        subscription: true,
        owner: true,
        invites: true,
        members: {
          include: { user: true },
        },
      },
    });

    if (!pod) {
      res.status(404).json({ error: "Pod not found" });
      return;
    }

    const currentUserEmail = req.user?.email;
    const currentUserId = req.user?.id;
    const isMember =
      currentUserEmail !== undefined &&
      (pod.owner.email === currentUserEmail || pod.members.some((member) => member.user.email === currentUserEmail));
    const isInvited =
      currentUserId !== undefined &&
      pod.invites.some((invite) => invite.status === "PENDING" && invite.recipientId === currentUserId);

    if (pod.visibility === "PRIVATE" && !isMember && !isInvited) {
      res.status(403).json({ error: "This pod is private." });
      return;
    }

    const canViewCredentials =
      isMember &&
      pod.credentials &&
      (pod.owner.email === currentUserEmail || pod.purchaseStage === "PURCHASED");
    const credentials = canViewCredentials ? decrypt(pod.credentials!) : null;

    res.json({
      pod: {
        ...pod,
        credentials,
      },
    });
  } catch (error) {
    next(error);
  }
});

podsRouter.post("/:id/join", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const podId = z.string().parse(req.params.id);
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: req.user!.email },
    });
    const pod = await prisma.pod.findUniqueOrThrow({
      where: { id: podId },
      include: {
        members: {
          where: {
            status: "ACTIVE",
          },
        },
      },
    });

    if (pod.visibility === "PRIVATE") {
      const invite = await prisma.podInvite.findFirst({
        where: {
          podId,
          recipientId: user.id,
          status: "PENDING",
        },
      });

      if (!invite) {
        res.status(403).json({ error: "Private pods require an invitation." });
        return;
      }
    }

    if (pod.members.length >= pod.maxMembers) {
      res.status(409).json({ error: "This pod is already full." });
      return;
    }

    const nextStatus = pod.visibility === "PUBLIC" ? "ACTIVE" : "PENDING";
    if (nextStatus === "ACTIVE" && !(await userHasPaymentMethod(user.id))) {
      res.status(402).json({ error: "Add a payment method before joining a paid pod." });
      return;
    }

    const membership = await prisma.podMember.upsert({
      where: {
        podId_userId: {
          podId,
          userId: user.id,
        },
      },
      update: {
        status: nextStatus,
        joinedAt: nextStatus === "ACTIVE" ? new Date() : undefined,
      },
      create: {
        podId,
        userId: user.id,
        status: nextStatus,
        joinedAt: nextStatus === "ACTIVE" ? new Date() : undefined,
      },
    });

    if (pod.visibility === "PRIVATE") {
      await prisma.podInvite.updateMany({
        where: {
          podId,
          recipientId: user.id,
          status: "PENDING",
        },
        data: {
          status: "ACCEPTED",
          respondedAt: new Date(),
        },
      });
    }

    if (nextStatus === "ACTIVE") {
      await refreshPodSplitCost(podId);
    }

    res.status(201).json({ membership });
  } catch (error) {
    next(error);
  }
});

podsRouter.post("/:id/start-sharing", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const podId = z.string().parse(req.params.id);
    const pod = await requirePodOwner(podId, req.user!.email);
    const activeMembers = await prisma.podMember.findMany({
      where: {
        podId,
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
    });

    if (activeMembers.length < 2) {
      res.status(409).json({ error: "Invite at least one active member before starting purchase sharing." });
      return;
    }

    const missingPaymentMethods = activeMembers.filter((member) => member.user.paymentMethods.length === 0);
    if (missingPaymentMethods.length > 0) {
      res.status(409).json({
        error: "Every active member needs a saved payment method before collection can start.",
        missingMembers: missingPaymentMethods.map((member) => ({
          id: member.user.id,
          name: member.user.name,
          email: member.user.email,
        })),
      });
      return;
    }

    const cycle = currentBillingCycle();
    const updatedPod = await prisma.pod.update({
      where: { id: pod.id },
      data: {
        status: "ACTIVE",
        purchaseStage: "COLLECTING",
        costPerMember: splitAmount(pod.subscription.monthlyCost, activeMembers.length, pod.platformFeePercent),
      },
      include: {
        subscription: true,
        members: {
          include: { user: true },
        },
      },
    });

    await ensurePodCyclePayments(podId, cycle);
    const collection = await collectPendingPaymentsForPod(podId, cycle, false);
    const stage = await refreshPodPurchaseStage(podId, cycle);

    res.json({ pod: stage.pod, collection, startedPod: updatedPod });
  } catch (error) {
    next(error);
  }
});

podsRouter.post("/:id/dev/test-member", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (env.NODE_ENV === "production") {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const podId = z.string().parse(req.params.id);
    const input = testMemberSchema.parse(req.body);
    const pod = await requirePodOwner(podId, req.user!.email);
    const activeMemberCount = await prisma.podMember.count({
      where: {
        podId,
        status: "ACTIVE",
      },
    });

    if (activeMemberCount >= pod.maxMembers) {
      res.status(409).json({ error: "This pod is already full." });
      return;
    }

    const user = await prisma.user.upsert({
      where: { email: input.email },
      update: {
        name: input.name,
      },
      create: {
        email: input.email,
        name: input.name,
        isVerified: true,
      },
    });

    const membership = await prisma.podMember.upsert({
      where: {
        podId_userId: {
          podId,
          userId: user.id,
        },
      },
      update: {
        status: "ACTIVE",
        joinedAt: new Date(),
        leftAt: null,
      },
      create: {
        podId,
        userId: user.id,
        status: "ACTIVE",
        joinedAt: new Date(),
      },
    });

    await prisma.paymentMethodReference.upsert({
      where: {
        stripePaymentMethodId: `pm_dev_${user.id}`,
      },
      update: {
        stripeCustomerId: `cus_dev_${user.id}`,
        brand: "Visa",
        last4: "4242",
        expMonth: 12,
        expYear: 2030,
        isDefault: true,
      },
      create: {
        userId: user.id,
        stripeCustomerId: `cus_dev_${user.id}`,
        stripePaymentMethodId: `pm_dev_${user.id}`,
        brand: "Visa",
        last4: "4242",
        expMonth: 12,
        expYear: 2030,
        isDefault: true,
      },
    });

    await refreshPodSplitCost(podId);

    res.status(201).json({
      user,
      membership,
    });
  } catch (error) {
    next(error);
  }
});

podsRouter.post("/:id/mark-purchased", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const podId = z.string().parse(req.params.id);
    const pod = await requirePodOwner(podId, req.user!.email);

    if (!["READY_TO_PURCHASE", "PURCHASED"].includes(pod.purchaseStage)) {
      res.status(409).json({ error: "Collect all member payments before marking this pod as purchased." });
      return;
    }

    const updatedPod = await prisma.pod.update({
      where: { id: podId },
      data: {
        purchaseStage: "PURCHASED",
        status: "ACTIVE",
      },
      include: {
        subscription: true,
        members: {
          include: { user: true },
        },
      },
    });
    await createNotifications(
      updatedPod.members.map((member) => ({
        userId: member.userId,
        type: "SUBSCRIPTION_PURCHASED",
        title: "Subscription purchased",
        body: `${updatedPod.name} has been purchased. Credentials are now available.`,
        href: `/pods/${updatedPod.id}`,
      })),
    );

    res.json({ pod: updatedPod });
  } catch (error) {
    next(error);
  }
});

podsRouter.post("/:id/invite", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const podId = z.string().parse(req.params.id);
    const { recipientEmail, message } = z.object({
      recipientEmail: z.string().email(),
      message: z.string().optional(),
    }).parse(req.body);

    const sender = await prisma.user.findUniqueOrThrow({
      where: { email: req.user!.email },
    });
    const pod = await requirePodOwner(podId, req.user!.email);
    const recipient = await prisma.user.findUniqueOrThrow({
      where: { email: recipientEmail },
    });

    const invite = await prisma.podInvite.upsert({
      where: {
        podId_recipientId: {
          podId,
          recipientId: recipient.id,
        },
      },
      update: {
        status: "PENDING",
        message,
        respondedAt: null,
      },
      create: {
        podId,
        senderId: sender.id,
        recipientId: recipient.id,
        message,
      },
    });
    await createNotification({
      userId: recipient.id,
      type: "INVITE_RECEIVED",
      title: "Pod invite received",
      body: `${sender.name} invited you to join ${pod.name}.`,
      href: "/invites",
    });

    res.status(201).json({ invite });
  } catch (error) {
    next(error);
  }
});

podsRouter.post("/:id/members/:userId/approve", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const podId = z.string().parse(req.params.id);
    const userId = z.string().parse(req.params.userId);
    await requirePodOwner(podId, req.user!.email);
    const membership = await prisma.podMember.update({
      where: {
        podId_userId: {
          podId,
          userId,
        },
      },
      data: {
        status: "ACTIVE",
        joinedAt: new Date(),
      },
    });
    await refreshPodSplitCost(podId);
    const approvedPod = await prisma.pod.findUniqueOrThrow({
      where: { id: podId },
      include: {
        members: {
          where: { status: "ACTIVE" },
        },
      },
    });
    await createNotifications(
      approvedPod.members
        .filter((member) => member.userId !== userId)
        .map((member) => ({
          userId: member.userId,
          type: "PRICE_CHANGED",
          title: "Pod share changed",
          body: `${approvedPod.name} member changes may adjust your monthly share.`,
          href: `/pods/${podId}`,
        })),
    );

    res.json({ membership });
  } catch (error) {
    next(error);
  }
});

podsRouter.post("/:id/members/:userId/remove", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const podId = z.string().parse(req.params.id);
    const userId = z.string().parse(req.params.userId);
    await requirePodOwner(podId, req.user!.email);
    const membership = await prisma.podMember.update({
      where: {
        podId_userId: {
          podId,
          userId,
        },
      },
      data: {
        status: "REMOVED",
        leftAt: new Date(),
      },
    });
    await refreshPodSplitCost(podId);
    const removedPod = await prisma.pod.findUniqueOrThrow({
      where: { id: podId },
      include: {
        members: {
          where: { status: "ACTIVE" },
        },
      },
    });
    await createNotifications(
      removedPod.members.map((member) => ({
        userId: member.userId,
        type: "PRICE_CHANGED",
        title: "Pod share changed",
        body: `${removedPod.name} member changes may adjust your monthly share.`,
        href: `/pods/${podId}`,
      })),
    );

    res.json({ membership });
  } catch (error) {
    next(error);
  }
});

podsRouter.post("/:id/leave", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const podId = z.string().parse(req.params.id);
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: req.user!.email },
    });

    const membership = await prisma.podMember.update({
      where: {
        podId_userId: {
          podId,
          userId: user.id,
        },
      },
      data: {
        status: "LEFT",
        leftAt: new Date(),
      },
    });
    await refreshPodSplitCost(podId);
    const leftPod = await prisma.pod.findUniqueOrThrow({
      where: { id: podId },
      include: {
        members: {
          where: { status: "ACTIVE" },
        },
      },
    });
    await createNotifications(
      leftPod.members.map((member) => ({
        userId: member.userId,
        type: "MEMBER_LEFT",
        title: "Member left pod",
        body: `A member left ${leftPod.name}. Your share may change next billing cycle.`,
        href: `/pods/${podId}`,
      })),
    );

    res.json({ membership });
  } catch (error) {
    next(error);
  }
});

podsRouter.delete("/:id", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const podId = z.string().parse(req.params.id);
    await requirePodOwner(podId, req.user!.email);
    await prisma.pod.delete({
      where: { id: podId },
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
