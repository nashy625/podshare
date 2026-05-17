import { api } from "./api";

export type PodVisibility = "PUBLIC" | "PRIVATE";
export type PodStatus = "OPEN" | "FULL" | "ACTIVE" | "CANCELLED";
export type PodPurchaseStage = "INVITING" | "COLLECTING" | "READY_TO_PURCHASE" | "PURCHASED" | "PAUSED";

export type PodFeedItem = {
  id: string;
  name: string;
  maxMembers: number;
  costPerMember: number | string;
  visibility: PodVisibility;
  status: PodStatus;
  purchaseStage: PodPurchaseStage;
  subscriptionTier?: string | null;
  platformFeePercent: number | string;
  serviceAccountEmail?: string | null;
  serviceAccountLogin?: string | null;
  createdAt: string;
  subscription: {
    id: string;
    name: string;
    category: string;
    monthlyCost: number | string;
  };
  owner: {
    id: string;
    name: string;
    major?: string | null;
    year?: number | null;
  };
  members: Array<{
    id: string;
    status: string;
    userId: string;
  }>;
};

export type PodDetails = {
  id: string;
  name: string;
  maxMembers: number;
  costPerMember: number | string;
  visibility: PodVisibility;
  status: PodStatus;
  purchaseStage: PodPurchaseStage;
  subscriptionTier?: string | null;
  platformFeePercent: number | string;
  serviceAccountEmail?: string | null;
  serviceAccountLogin?: string | null;
  credentials?: string | null;
  createdAt: string;
  subscription: {
    id: string;
    name: string;
    category: string;
    monthlyCost: number | string;
  };
  owner: {
    id: string;
    name: string;
    email: string;
    major?: string | null;
    year?: number | null;
  };
  members: Array<{
    id: string;
    status: string;
    joinedAt?: string | null;
    user: {
      id: string;
      name: string;
      email: string;
      major?: string | null;
      year?: number | null;
    };
  }>;
  invites: Array<{
    id: string;
    recipientId: string;
    status: string;
    createdAt: string;
  }>;
};

export type PodOperationsItem = PodDetails & {
  payments?: Array<{
    id: string;
    userId: string;
    amount: number | string;
    status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "REFUNDED";
    month: number;
    year: number;
    paidAt?: string | null;
  }>;
};

export type PodInviteRecord = {
  id: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "REVOKED";
  message?: string | null;
  createdAt: string;
  respondedAt?: string | null;
  pod: {
    id: string;
    name: string;
    visibility: PodVisibility;
    costPerMember: number | string;
    purchaseStage: PodPurchaseStage;
    subscription: {
      id: string;
      name: string;
      category: string;
    };
    owner: {
      id: string;
      name: string;
      email: string;
      major?: string | null;
      year?: number | null;
    };
  };
  sender: {
    id: string;
    name: string;
    email: string;
    major?: string | null;
    year?: number | null;
  };
};

export type CreatePodInput = {
  name: string;
  subscriptionId: string;
  subscriptionTier: "INDIVIDUAL" | "STANDARD" | "FAMILY" | "TEAM";
  platformFeePercent?: number;
  serviceAccountEmail?: string;
  serviceAccountLogin?: string;
  visibility: PodVisibility;
  credentials?: string;
};

export async function fetchPublicPods(category?: string) {
  const { data } = await api.get<{ pods: PodFeedItem[] }>("/api/pods", {
    params: {
      visibility: "PUBLIC",
      ...(category ? { category } : {}),
    },
  });

  return data.pods;
}

export async function fetchPodDetails(id: string) {
  const { data } = await api.get<{ pod: PodDetails }>(`/api/pods/${id}`);
  return data.pod;
}

export async function joinPod(id: string) {
  const { data } = await api.post<{ membership: unknown }>(`/api/pods/${id}/join`);
  return data.membership;
}

export async function inviteToPod(id: string, recipientEmail: string, message?: string) {
  const { data } = await api.post<{ invite: unknown }>(`/api/pods/${id}/invite`, {
    recipientEmail,
    message,
  });
  return data.invite;
}

export async function createPod(input: CreatePodInput) {
  const { data } = await api.post<{ pod: PodFeedItem }>("/api/pods", input);
  return data.pod;
}

export async function startPodSharing(id: string) {
  const { data } = await api.post<{ pod: PodDetails }>(`/api/pods/${id}/start-sharing`);
  return data.pod;
}

export async function markPodPurchased(id: string) {
  const { data } = await api.post<{ pod: PodDetails }>(`/api/pods/${id}/mark-purchased`);
  return data.pod;
}

export async function addDevTestMember(id: string, input: { email: string; name: string }) {
  const { data } = await api.post<{ user: unknown; membership: unknown }>(`/api/pods/${id}/dev/test-member`, input);
  return data;
}

export async function fetchReadyToPurchasePods() {
  const { data } = await api.get<{ pods: PodOperationsItem[] }>("/api/pods/operations/ready-to-purchase");
  return data.pods;
}

export async function fetchPurchasedPods() {
  const { data } = await api.get<{ pods: PodOperationsItem[] }>("/api/pods/operations/purchased");
  return data.pods;
}

export async function fetchIncomingPodInvites() {
  const { data } = await api.get<{ invites: PodInviteRecord[] }>("/api/pods/invites/incoming");
  return data.invites;
}

export async function respondToPodInvite(id: string, action: "accept" | "decline") {
  const { data } = await api.post<{ invite: PodInviteRecord }>(`/api/pods/invites/${id}/respond`, { action });
  return data.invite;
}

export async function approvePodMember(podId: string, userId: string) {
  const { data } = await api.post<{ membership: unknown }>(`/api/pods/${podId}/members/${userId}/approve`);
  return data.membership;
}

export async function removePodMember(podId: string, userId: string) {
  const { data } = await api.post<{ membership: unknown }>(`/api/pods/${podId}/members/${userId}/remove`);
  return data.membership;
}
