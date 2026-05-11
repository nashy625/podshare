import { api } from "./api";

export type SubscriptionRecord = {
  id: string;
  userId: string;
  name: string;
  category: string;
  monthlyCost: number | string;
  billingDate: number;
  isActive: boolean;
  createdAt: string;
};

export type CreateSubscriptionInput = {
  name: string;
  category: string;
  monthlyCost: number;
  billingDate: number;
  isActive?: boolean;
};

export async function fetchSubscriptions() {
  const { data } = await api.get<{ subscriptions: SubscriptionRecord[] }>("/api/subscriptions");
  return data.subscriptions;
}

export async function createSubscription(input: CreateSubscriptionInput) {
  const { data } = await api.post<{ subscription: SubscriptionRecord }>("/api/subscriptions", input);
  return data.subscription;
}
