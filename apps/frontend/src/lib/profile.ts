import { api } from "./api";

export type ProfileUpdateInput = {
  name: string;
  major?: string;
  year?: number;
  avatarUrl?: string;
};

export async function updateProfile(input: ProfileUpdateInput) {
  const { data } = await api.put("/api/auth/profile", input);
  return data.user;
}
