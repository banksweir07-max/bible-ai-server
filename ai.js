import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
const port = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.get("/", (req, res) => {
  res.send("Bible AI server is running.");
});

app.post("/api/ask", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required." });
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful Bible assistant named Shalom. Answer questions about the Bible clearly, kindly, and accurately.",
        },
        {
          role: "user",
          content: message,
        },
      ],
    });

    const reply = completion.choices?.[0]?.message?.content || "No response.";
    res.json({ reply });
  } catch (error) {
    console.error("API ERROR:", error);
    res.status(500).json({
      error: error.message || "Something went wrong on the server.",
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
