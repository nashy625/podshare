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
  JWT_SECRET: z.string().min(1),
  ENCRYPTION_KEY: z.string().min(16),
  APP_URL: z.string().url(),
});

const parsedEnv = baseEnvSchema.parse(process.env);
const requireInProduction = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "SENDGRID_API_KEY"] as const;

if (parsedEnv.NODE_ENV === "production") {
  for (const key of requireInProduction) {
    if (!parsedEnv[key]) {
      throw new Error(`Missing required environment variable in production: ${key}`);
    }
  }
}

export const env = parsedEnv;
export const featureFlags = {
  stripeEnabled: Boolean(env.STRIPE_SECRET_KEY),
  stripeWebhooksEnabled: Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET),
  emailEnabled: Boolean(env.SENDGRID_API_KEY),
};
