import express from "express";
import Stripe from "stripe";
import { env, featureFlags } from "../config.js";
import { prisma } from "../lib/prisma.js";
import { stripe } from "../lib/stripe.js";

export const paymentsWebhookRouter = express.Router();

paymentsWebhookRouter.post("/stripe", express.raw({ type: "application/json" }), async (req, res, next) => {
  try {
    if (!featureFlags.stripeWebhooksEnabled || !stripe) {
      res.status(503).json({ error: "Stripe webhooks are not configured for this environment." });
      return;
    }

    const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      res.status(503).json({ error: "Stripe webhooks are not configured for this environment." });
      return;
    }

    const signature = req.header("stripe-signature");
    if (!signature) {
      res.status(400).json({ error: "Missing Stripe signature." });
      return;
    }

    const event = stripe.webhooks.constructEvent(
      req.body as Buffer,
      signature,
      webhookSecret,
    );

    switch (event.type) {
      case "payment_intent.succeeded": {
        const intent = event.data.object as Stripe.PaymentIntent;
        const paymentId = intent.metadata?.paymentId;
        if (paymentId) {
          await prisma.payment.update({
            where: { id: paymentId },
            data: {
              status: "COMPLETED",
              stripePaymentId: intent.id,
              paidAt: new Date(),
            },
          });
        }
        break;
      }
      case "payment_intent.payment_failed": {
        const intent = event.data.object as Stripe.PaymentIntent;
        const paymentId = intent.metadata?.paymentId;
        if (paymentId) {
          await prisma.payment.update({
            where: { id: paymentId },
            data: {
              status: "FAILED",
              stripePaymentId: intent.id,
            },
          });
        }
        break;
      }
      default:
        break;
    }

    res.json({ received: true });
  } catch (error) {
    next(error);
  }
});
