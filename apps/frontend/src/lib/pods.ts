import { api } from "./api";

export type PodVisibility = "PUBLIC" | "PRIVATE";
export type PodStatus = "OPEN" | "FULL" | "ACTIVE" | "CANCELLED";

export type PodFeedItem = {
  id: string;
  name: string;
  maxMembers: number;
  costPerMember: number | string;
  visibility: PodVisibility;
  status: PodStatus;
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
  maxMembers: number;
  costPerMember: number;
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
