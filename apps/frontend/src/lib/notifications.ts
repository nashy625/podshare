import { api } from "./api";

export type NotificationRecord = {
  id: string;
  userId: string;
  type:
    | "INVITE_RECEIVED"
    | "PAYMENT_FAILED"
    | "PAYMENTS_COLLECTED"
    | "SUBSCRIPTION_PURCHASED"
    | "MEMBER_LEFT"
    | "PRICE_CHANGED";
  title: string;
  body: string;
  href?: string | null;
  readAt?: string | null;
  createdAt: string;
};

export async function fetchNotifications() {
  const { data } = await api.get<{ notifications: NotificationRecord[]; unreadCount: number }>("/api/notifications");
  return data;
}

export async function markNotificationRead(id: string) {
  const { data } = await api.post<{ notification: NotificationRecord }>(`/api/notifications/${id}/read`);
  return data.notification;
}

export async function markAllNotificationsRead() {
  const { data } = await api.post<{ updated: number }>("/api/notifications/read-all");
  return data.updated;
}
