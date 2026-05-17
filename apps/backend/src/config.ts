import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const baseEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  ADMIN_EMAILS: z.string().optional(),
  JWT_SECRET: z.string().min(1),
  ENCRYPTION_KEY: z.string().min(16),
  APP_URL: z.string().url(),
});

const parsedEnv = baseEnvSchema.parse(process.env);

export const env = parsedEnv;
export const adminEmails = new Set(
  (env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);

function hasRealSecret(value: string | undefined) {
  return Boolean(value && !value.includes("placeholder") && !value.includes("REPLACE_ME"));
}

export const featureFlags = {
  stripeEnabled: hasRealSecret(env.STRIPE_SECRET_KEY),
  stripeWebhooksEnabled: hasRealSecret(env.STRIPE_SECRET_KEY) && hasRealSecret(env.STRIPE_WEBHOOK_SECRET),
  emailEnabled: hasRealSecret(env.SENDGRID_API_KEY),
};
