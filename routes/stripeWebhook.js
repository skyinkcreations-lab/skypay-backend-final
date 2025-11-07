import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Stripe webhook endpoint
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("⚠️ Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle event types
  switch (event.type) {
    case "invoice.payment_succeeded":
      console.log("✅ Payment successful:", event.data.object.id);
      break;

    case "invoice.payment_failed":
      console.log("❌ Payment failed:", event.data.object.id);
      break;

    case "customer.subscription.created":
      console.log("🆕 New subscription:", event.data.object.id);
      break;

    case "customer.subscription.deleted":
      console.log("🚫 Subscription cancelled:", event.data.object.id);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.status(200).send("Received webhook");
});

export default router;
