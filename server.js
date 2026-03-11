import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import Stripe from "stripe";

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/* ---------------- AI Route ---------------- */

app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful Christian Bible teacher AI. Answer questions clearly and include Bible references when possible.",
          },
          {
            role: "user",
            content: message,
          },
        ],
      }),
    });

    const data = await response.json();

    res.json({
      reply: data.choices?.[0]?.message?.content || "No response",
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "AI server error" });
  }
});

/* ---------------- Stripe Subscription ---------------- */

app.post("/create-checkout-session", async (req, res) => {
  try {

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",

      payment_method_types: ["card"],

      line_items: [
        {
          price: "price_1T9bVmC405SOjqqzlSFleCCe",
          quantity: 1,
        },
      ],

      success_url: "https://outgoing-living-word-daily.com/success",
      cancel_url: "https://outgoing-living-word-daily.com/cancel",
    });

    res.json({ url: session.url });

  } catch (err) {
    console.error("Stripe error:", err);
    res.status(500).json({ error: "Stripe checkout failed" });
  }
});

/* ---------------- Test Route ---------------- */

app.get("/", (req, res) => {
  res.send("Bible AI server is running.");
});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
