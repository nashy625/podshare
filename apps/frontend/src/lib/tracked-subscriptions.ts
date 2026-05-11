import { api } from "./api";

export type TrackedSubscription = {
  id: string;
  name: string;
  category: string;
  provider?: string | null;
  monthlyCost: number | string;
  billingDate?: number | null;
  source: "MANUAL" | "LINKED" | "PODSHARE";
  isShared: boolean;
  estimatedRetailCost?: number | string | null;
  linkedSubscriptionId?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TrackedSubscriptionSummary = {
  activeCount: number;
  monthlySpend: number;
  monthlySavings: number;
  sharedCount: number;
};

export type CreateTrackedSubscriptionInput = {
  name: string;
  category: string;
  provider?: string;
  monthlyCost: number;
  billingDate?: number;
  source: "MANUAL" | "LINKED" | "PODSHARE";
  isShared: boolean;
  estimatedRetailCost?: number;
  linkedSubscriptionId?: string;
  notes?: string;
};

export async function fetchTrackedSubscriptions() {
  const { data } = await api.get<{ subscriptions: TrackedSubscription[] }>("/api/tracked-subscriptions");
  return data.subscriptions;
}

export async function fetchTrackedSubscriptionSummary() {
  const { data } = await api.get<TrackedSubscriptionSummary>("/api/tracked-subscriptions/summary");
  return data;
}

export async function createTrackedSubscription(input: CreateTrackedSubscriptionInput) {
  const { data } = await api.post<{ subscription: TrackedSubscription }>("/api/tracked-subscriptions", input);
  return data.subscription;
}

export async function deleteTrackedSubscription(id: string) {
  await api.delete(`/api/tracked-subscriptions/${id}`);
}
