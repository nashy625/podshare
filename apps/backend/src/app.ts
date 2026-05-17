import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { errorHandler } from "./middleware/error-handler.js";
import { authRouter } from "./routes/auth.js";
import { friendsRouter } from "./routes/friends.js";
import { healthRouter } from "./routes/health.js";
import { notificationsRouter } from "./routes/notifications.js";
import { paymentsRouter } from "./routes/payments.js";
import { paymentsWebhookRouter } from "./routes/payments-webhook.js";
import { podsRouter } from "./routes/pods.js";
import { subscriptionsRouter } from "./routes/subscriptions.js";
import { trackedSubscriptionsRouter } from "./routes/tracked-subscriptions.js";

export const app = express();

app.use(helmet());
app.use(cors());
app.use("/api/webhooks", paymentsWebhookRouter);
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (_req, res) => {
  res.json({
    name: "PodShare API",
    version: "0.1.0",
  });
});

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/friends", friendsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/subscriptions", subscriptionsRouter);
app.use("/api/tracked-subscriptions", trackedSubscriptionsRouter);
app.use("/api/pods", podsRouter);
app.use("/api/payments", paymentsRouter);

app.use(errorHandler);
