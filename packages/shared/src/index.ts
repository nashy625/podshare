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

export const servicePolicies = [
  "OFFICIAL_MEMBERS",
  "EXTRA_MEMBER",
  "HOUSEHOLD_ONLY",
  "TEAM_SEATS",
  "SHARED_LOGIN_ALLOWED",
  "NOT_ALLOWED",
  "UNKNOWN",
] as const;

export type ServicePolicy = (typeof servicePolicies)[number];

export type ServiceCatalogEntry = {
  name: string;
  category: SubscriptionCategory;
  policy: ServicePolicy;
  sharingModel: string;
  maxSeats: number;
  eligibleForPaidPods: boolean;
  notes: string;
};

export const serviceCatalog: ServiceCatalogEntry[] = [
  {
    name: "Spotify Premium Family",
    category: "Music",
    policy: "HOUSEHOLD_ONLY",
    sharingModel: "Family plan",
    maxSeats: 6,
    eligibleForPaidPods: false,
    notes: "Members generally need to live at the same address.",
  },
  {
    name: "Netflix",
    category: "Streaming",
    policy: "EXTRA_MEMBER",
    sharingModel: "Household plus extra member",
    maxSeats: 2,
    eligibleForPaidPods: true,
    notes: "Use the official extra-member option for anyone outside the household.",
  },
  {
    name: "Disney+",
    category: "Streaming",
    policy: "EXTRA_MEMBER",
    sharingModel: "Household plus extra member",
    maxSeats: 2,
    eligibleForPaidPods: true,
    notes: "Use eligible extra-member slots instead of sharing the main password.",
  },
  {
    name: "Max",
    category: "Streaming",
    policy: "EXTRA_MEMBER",
    sharingModel: "Household plus extra member",
    maxSeats: 2,
    eligibleForPaidPods: true,
    notes: "Use official extra-member access where available.",
  },
  {
    name: "Microsoft 365 Family",
    category: "Productivity",
    policy: "OFFICIAL_MEMBERS",
    sharingModel: "Family members",
    maxSeats: 6,
    eligibleForPaidPods: true,
    notes: "Each member uses their own Microsoft account.",
  },
  {
    name: "Apple One Family",
    category: "Productivity",
    policy: "OFFICIAL_MEMBERS",
    sharingModel: "Apple Family Sharing",
    maxSeats: 6,
    eligibleForPaidPods: true,
    notes: "Each member uses their own Apple Account in a Family Sharing group.",
  },
  {
    name: "Google One",
    category: "Productivity",
    policy: "OFFICIAL_MEMBERS",
    sharingModel: "Google family group",
    maxSeats: 6,
    eligibleForPaidPods: true,
    notes: "Each member joins through a Google family group.",
  },
  {
    name: "Dropbox Family",
    category: "Productivity",
    policy: "OFFICIAL_MEMBERS",
    sharingModel: "Family plan",
    maxSeats: 6,
    eligibleForPaidPods: true,
    notes: "Each member has a separate Dropbox account.",
  },
  {
    name: "1Password Families",
    category: "Software",
    policy: "OFFICIAL_MEMBERS",
    sharingModel: "Family members",
    maxSeats: 5,
    eligibleForPaidPods: true,
    notes: "Members have separate accounts and shared vault controls.",
  },
  {
    name: "Dashlane Friends & Family",
    category: "Software",
    policy: "OFFICIAL_MEMBERS",
    sharingModel: "Friends and family members",
    maxSeats: 10,
    eligibleForPaidPods: true,
    notes: "Members have independent password manager accounts.",
  },
  {
    name: "NordVPN",
    category: "Software",
    policy: "SHARED_LOGIN_ALLOWED",
    sharingModel: "Multi-device plan",
    maxSeats: 10,
    eligibleForPaidPods: true,
    notes: "Use within plan device limits and avoid publishing shared credentials broadly.",
  },
  {
    name: "ChatGPT Business",
    category: "AI",
    policy: "TEAM_SEATS",
    sharingModel: "Workspace seats",
    maxSeats: 50,
    eligibleForPaidPods: true,
    notes: "Invite each member to a workspace seat instead of sharing one login.",
  },
  {
    name: "ChatGPT Plus",
    category: "AI",
    policy: "NOT_ALLOWED",
    sharingModel: "Individual account",
    maxSeats: 1,
    eligibleForPaidPods: false,
    notes: "Individual account sharing is not supported.",
  },
];

export function findServiceCatalogEntry(name: string) {
  const normalizedName = name.trim().toLowerCase();
  return serviceCatalog.find((service) => service.name.toLowerCase() === normalizedName);
}
