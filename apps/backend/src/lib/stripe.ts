import Stripe from "stripe";
import { env, featureFlags } from "../config.js";

export const stripe = featureFlags.stripeEnabled
  ? new Stripe(env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-08-27.basil",
    })
  : null;
