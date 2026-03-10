import express from "express";
import cors from "cors";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/ask", async (req, res) => {
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
          content: "You are Shalom, a friendly Bible AI assistant.",
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
  } catch (error) {
    console.error("OpenAI server error:", error);
    res.status(500).json({
      reply: "There was an error talking to the AI server.",
    });
  }
});

app.listen(3001, () => {
  console.log("AI server running on port 3001");
});