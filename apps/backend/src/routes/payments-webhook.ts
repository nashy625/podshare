import express from "express";
import Stripe from "stripe";
import { env, featureFlags } from "../config.js";
import { refreshPodPurchaseStage } from "../lib/billing.js";
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
          const payment = await prisma.payment.update({
            where: { id: paymentId },
            data: {
              status: "COMPLETED",
              stripePaymentId: intent.id,
              paidAt: new Date(),
            },
          });
          await refreshPodPurchaseStage(payment.podId, {
            month: payment.month,
            year: payment.year,
          });
        }
        break;
      }
      case "payment_intent.payment_failed": {
        const intent = event.data.object as Stripe.PaymentIntent;
        const paymentId = intent.metadata?.paymentId;
        if (paymentId) {
          const payment = await prisma.payment.update({
            where: { id: paymentId },
            data: {
              status: "FAILED",
              stripePaymentId: intent.id,
            },
          });
          await refreshPodPurchaseStage(payment.podId, {
            month: payment.month,
            year: payment.year,
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
