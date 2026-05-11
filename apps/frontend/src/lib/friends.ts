import { api } from "./api";

export type FriendUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  major?: string | null;
  year?: number | null;
};

export type Friendship = {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "BLOCKED";
  createdAt: string;
  respondedAt?: string | null;
  requester: FriendUser;
  addressee: FriendUser;
};

export async function fetchFriendships() {
  const { data } = await api.get<{ friendships: Friendship[] }>("/api/friends");
  return data.friendships;
}

export async function sendFriendRequest(email: string) {
  const { data } = await api.post<{ friendship: Friendship }>("/api/friends/requests", { email });
  return data.friendship;
}

export async function respondToFriendRequest(id: string, action: "accept" | "decline" | "block") {
  const { data } = await api.post<{ friendship: Friendship }>(`/api/friends/requests/${id}/respond`, { action });
  return data.friendship;
}
