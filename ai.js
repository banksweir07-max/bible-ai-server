import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();

app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/*
   AI Route
   Accepts both:
   { question: "..." }
   OR
   { message: "..." }
   OR
   { messages: [...] } for conversation history
*/

app.post("/api/ask", async (req, res) => {
  try {

    const { question, message, messages } = req.body;

    // Determine what the user sent
    let userMessage = question || message;

    let chatMessages = [
      {
        role: "system",
        content:
          "You are Shalom, a helpful Bible AI that explains scripture, theology, and biblical history clearly. Provide thoughtful answers and reference scripture when helpful."
      }
    ];

    // If conversation history is provided
    if (Array.isArray(messages)) {
      chatMessages = chatMessages.concat(messages);
    }
    // Otherwise use the single question
    else if (userMessage) {
      chatMessages.push({
        role: "user",
        content: userMessage
      });
    }
    else {
      return res.status(400).json({ error: "No question provided" });
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: chatMessages
    });

    const reply = completion.choices?.[0]?.message?.content || "";

    res.json({
      answer: reply
    });

  } catch (error) {
    console.error("AI Error:", error);

    res.status(500).json({
      error: "AI server error"
    });
  }
});


/* Health check route (useful for debugging server status) */

app.get("/", (req, res) => {
  res.send("Living Word AI server is running.");
});


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("AI server running on port " + PORT);
});
