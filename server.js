import express from "express";
import cors from "cors";
import OpenAI from "openai";
import Stripe from "stripe";

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

/* ============================= */
/* OpenAI Setup */
/* ============================= */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* ============================= */
/* Stripe Setup */
/* ============================= */

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/* ============================= */
/* Test Route */
/* ============================= */

app.get("/", (req, res) => {
  res.send("Bible AI server is running.");
});

/* ============================= */
/* AI Endpoint */
/* ============================= */

app.post("/api/ask", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message required" });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You are Shalom, a friendly AI assistant that answers Bible questions clearly and kindly."
        },
        {
          role: "user",
          content: message
        }
      ]
    });

    res.json({
      reply: completion.choices[0].message.content
    });

  } catch (error) {
    console.error("AI ERROR:", error);
    res.status(500).json({ error: "AI request failed" });
  }
});

/* ============================= */
/* Stripe Subscription */
/* ============================= */

app.post("/create-checkout-session", async (req, res) => {
  try {

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",

      payment_method_types: ["card"],

      line_items: [
        {
          price: "price_1T9bVmC405SOjqqzlSFleCCe",
          quantity: 1
        }
      ],

      success_url: "https://outgoing-living-word-daily.com/success",
      cancel_url: "https://outgoing-living-word-daily.com/cancel"
    });

    res.json({ url: session.url });

  } catch (error) {
    console.error("Stripe ERROR:", error);
    res.status(500).json({ error: "Stripe session failed" });
  }
});

/* ============================= */
/* Start Server */
/* ============================= */

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
