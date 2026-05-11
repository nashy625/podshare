export const APP_NAME = "PodShare";

export const subscriptionCategories = [
  "AI",
  "Music",
  "Software",
  "Streaming",
  "Productivity",
  "Education",
] as const;

export type SubscriptionCategory = (typeof subscriptionCategories)[number];

export const podStatuses = ["OPEN", "FULL", "ACTIVE", "CANCELLED"] as const;
export const memberStatuses = ["PENDING", "ACTIVE", "REMOVED", "LEFT"] as const;
export const paymentStatuses = ["PENDING", "PROCESSING", "COMPLETED", "FAILED", "REFUNDED"] as const;
