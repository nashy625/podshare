import { adminEmails } from "../config.js";

export function isAdminEmail(email: string) {
  return adminEmails.has(email.toLowerCase());
}
