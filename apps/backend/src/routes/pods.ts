import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { encrypt, decrypt } from "../lib/encryption.js";
import { optionalAuth, requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";

const createPodSchema = z.object({
  name: z.string().min(1),
  subscriptionId: z.string().uuid(),
  maxMembers: z.coerce.number().int().min(2).max(6),
  costPerMember: z.coerce.number().positive(),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).default("PRIVATE"),
  credentials: z.string().optional(),
});

export const podsRouter = Router();

async function requirePodOwner(podId: string, email: string) {
  const pod = await prisma.pod.findUniqueOrThrow({
    where: { id: podId },
    include: {
      owner: true,
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

    const pod = await prisma.pod.create({
      data: {
        ...input,
        credentials: input.credentials ? encrypt(input.credentials) : undefined,
        ownerId: owner.id,
      },
      include: {
        subscription: true,
        members: true,
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

    const credentials = isMember && pod.credentials ? decrypt(pod.credentials) : null;

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

    const nextStatus = pod.visibility === "PUBLIC" ? "ACTIVE" : "PENDING";

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

    res.status(201).json({ membership });
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
    await requirePodOwner(podId, req.user!.email);
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
