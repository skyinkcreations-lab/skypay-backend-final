// ================================
// DEPENDENCIES
// ================================
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pkg from "pg";
import Stripe from "stripe";
import bodyParser from "body-parser";

dotenv.config();
const { Pool } = pkg;

// ================================
// INITIALIZE APP
// ================================
const app = express();

// Stripe requires the raw body for webhook verification
app.use("/webhook", bodyParser.raw({ type: "application/json" }));
app.use(express.json());
app.use(cors());

// ================================
// DATABASE CONNECTION (SUPABASE)
// ================================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

pool
  .connect()
  .then(() => console.log("✅ Connected to Supabase database"))
  .catch((err) => console.error("❌ Database connection error:", err.message));

// ================================
// STRIPE INITIALIZATION
// ================================
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ================================
// ROOT TEST ENDPOINT
// ================================
app.get("/", (req, res) => {
  res.send("🚀 SkyPay API is running and connected");
});

// ================================
// DATABASE TEST ENDPOINT
// ================================
app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      message: "Database connected successfully!",
      time: result.rows[0].now,
    });
  } catch (error) {
    console.error("Database test error:", error);
    res.status(500).json({ error: "Database connection failed" });
  }
});

// ================================
// STRIPE PAYMENT INTENT ENDPOINT
// ================================
app.post("/create-payment-intent", async (req, res) => {
  try {
    const { amount, currency } = req.body;

    if (!amount || !currency) {
      return res.status(400).json({ error: "Missing amount or currency" });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      automatic_payment_methods: { enabled: true },
    });

    res.send({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error("Stripe error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ================================
// STRIPE WEBHOOK ENDPOINT
// ================================
app.post("/webhook", (req, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    console.log("✅ Webhook verified:", event.type);
  } catch (err) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle Stripe event types
  switch (event.type) {
    case "payment_intent.succeeded":
      console.log("💰 Payment successful:", event.data.object.id);
      break;

    case "payment_intent.payment_failed":
      console.log("❌ Payment failed:", event.data.object.id);
      break;

    default:
      console.log(`⚠️ Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});

// ================================
// START SERVER
// ================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

export { pool };
