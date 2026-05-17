import type { NotificationType } from "@prisma/client";
import { prisma } from "./prisma.js";

type NotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  href?: string;
};

export async function createNotification(input: NotificationInput) {
  return prisma.notification.create({
    data: input,
  });
}

export async function createNotifications(inputs: NotificationInput[]) {
  if (inputs.length === 0) {
    return { count: 0 };
  }

  return prisma.notification.createMany({
    data: inputs,
  });
}
