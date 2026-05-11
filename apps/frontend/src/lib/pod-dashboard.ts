import { api } from "./api";

export type DashboardPod = {
  id: string;
  name: string;
  visibility: "PUBLIC" | "PRIVATE";
  status: "OPEN" | "FULL" | "ACTIVE" | "CANCELLED";
  costPerMember: number | string;
  maxMembers: number;
  createdAt: string;
  subscription: {
    id: string;
    name: string;
    category: string;
  };
  members: Array<{
    id: string;
    status: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
};

export type MemberPodRecord = {
  id: string;
  status: string;
  joinedAt?: string | null;
  pod: DashboardPod & {
    owner: {
      id: string;
      name: string;
      email: string;
    };
  };
};

export async function fetchMyPods() {
  const { data } = await api.get<{ ownedPods: DashboardPod[]; memberPods: MemberPodRecord[] }>("/api/pods/mine");
  return data;
}
