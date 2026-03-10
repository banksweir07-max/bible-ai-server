import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.get("/", (req, res) => {
  res.send("Bible AI server running");
});

app.post("/api/ask", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ reply: "Missing message." });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You are Shalom, a helpful Bible AI assistant. Answer clearly and warmly, and include scripture references when relevant.",
        },
        {
          role: "user",
          content: message,
        },
      ],
    });

    res.json({
      reply: completion.choices?.[0]?.message?.content || "No response from AI.",
    });
  } catch (err) {
    console.error("AI route error:", err);
    res.status(500).json({
      reply: "Server error while contacting OpenAI.",
    });
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
