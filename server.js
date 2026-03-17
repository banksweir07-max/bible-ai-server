import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import Stripe from "stripe";
import http from "http";
import { WebSocketServer } from "ws";

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
      success_url: "https://outgoing-living-word-daily.com?success=true",
      cancel_url: "https://outgoing-living-word-daily.com?canceled=true",
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

/* ---------------- Bible Draw Multiplayer ---------------- */

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const rooms = {};
/*
rooms = {
  ABC12: {
    code: "ABC12",
    hostId: "p_xxx",
    status: "lobby",
    round: 1,
    drawerId: "p_xxx",
    prompt: "Noah's Ark",
    players: [
      { id, name, color, score }
    ],
    strokes: [],
    guesses: []
  }
}
*/

function randomPrompt() {
  const prompts = [
    "Noah's Ark",
    "The burning bush",
    "David and Goliath",
    "The parting of the Red Sea",
    "Jesus walking on water",
    "The Last Supper",
    "The Tower of Babel",
    "Jonah inside the whale",
    "Moses with the Ten Commandments",
    "The Garden of Eden",
    "Jesus on the cross",
    "The Empty Tomb",
    "Daniel in the lion's den",
    "The Star of Bethlehem",
    "Angels visiting Mary",
    "Jesus feeding 5000",
    "The Good Samaritan",
    "Samson and the pillars",
    "Joseph's coat of many colors",
    "The prodigal son",
    "Jesus baptism in the river",
    "The wise men with gifts",
    "A shepherd with sheep",
    "Zacchaeus in a tree",
    "The dove with olive branch",
    "Palm Sunday crowd",
    "Jesus healing the blind",
    "The fiery furnace",
    "Elijah and the ravens",
    "Jacob's ladder to heaven",
  ];

  return prompts[Math.floor(Math.random() * prompts.length)];
}

function safeSend(ws, data) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(data));
  }
}

function broadcastRoom(roomCode) {
  const room = rooms[roomCode];
  if (!room) return;

  const payload = {
    type: "room_update",
    payload: room,
  };

  wss.clients.forEach((client) => {
    if (client.readyState === 1 && client.roomCode === roomCode) {
      client.send(JSON.stringify(payload));
    }
  });
}

function removePlayerFromRoom(roomCode, playerId) {
  const room = rooms[roomCode];
  if (!room) return;

  room.players = room.players.filter((p) => p.id !== playerId);

  if (room.players.length === 0) {
    delete rooms[roomCode];
    return;
  }

  if (room.hostId === playerId) {
    room.hostId = room.players[0].id;
  }

  if (room.drawerId === playerId) {
    room.drawerId = room.players[0].id;
  }

  broadcastRoom(roomCode);
}

wss.on("connection", (ws) => {
  ws.playerId = null;
  ws.roomCode = null;

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message.toString());
      const { type, payload } = data;

      if (type === "join_room") {
        const {
          roomCode,
          playerId,
          playerName,
          color,
        } = payload;

        if (!roomCode || !playerId || !playerName) {
          return safeSend(ws, {
            type: "error",
            payload: "Missing room join info",
          });
        }

        ws.playerId = playerId;
        ws.roomCode = roomCode;

        if (!rooms[roomCode]) {
          rooms[roomCode] = {
            code: roomCode,
            hostId: playerId,
            status: "lobby",
            round: 1,
            drawerId: playerId,
            prompt: randomPrompt(),
            players: [],
            strokes: [],
            guesses: [],
          };
        }

        const room = rooms[roomCode];

        const existingPlayer = room.players.find((p) => p.id === playerId);
        if (!existingPlayer) {
          room.players.push({
            id: playerId,
            name: playerName,
            color: color || "#3b82f6",
            score: 0,
          });
        }

        broadcastRoom(roomCode);
        return;
      }

      if (!ws.roomCode || !rooms[ws.roomCode]) {
        return safeSend(ws, {
          type: "error",
          payload: "Room not found",
        });
      }

      const room = rooms[ws.roomCode];

      switch (type) {
        case "start_game": {
          room.status = "playing";
          room.round = 1;
          room.strokes = [];
          room.guesses = [];
          room.prompt = payload?.prompt || room.prompt || randomPrompt();
          broadcastRoom(ws.roomCode);
          break;
        }

        case "stroke": {
          const stroke = payload;
          if (!stroke) return;

          room.strokes.push(stroke);

          if (room.strokes.length > 400) {
            room.strokes = room.strokes.slice(-400);
          }

          wss.clients.forEach((client) => {
            if (client.readyState === 1 && client.roomCode === ws.roomCode) {
              client.send(
                JSON.stringify({
                  type: "stroke",
                  payload: stroke,
                })
              );
            }
          });
          break;
        }

        case "clear_canvas": {
          room.strokes = [];
          room.guesses = room.guesses || [];

          wss.clients.forEach((client) => {
            if (client.readyState === 1 && client.roomCode === ws.roomCode) {
              client.send(
                JSON.stringify({
                  type: "canvas_cleared",
                })
              );
            }
          });

          broadcastRoom(ws.roomCode);
          break;
        }

        case "submit_guess": {
          const guessText = payload?.text?.trim();
          if (!guessText) return;

          const player = room.players.find((p) => p.id === ws.playerId);
          if (!player) return;

          const prompt = (room.prompt || "").toLowerCase().trim();
          const normalizedGuess = guessText.toLowerCase().trim();

          const correct =
            normalizedGuess.includes(prompt) || prompt.includes(normalizedGuess);

          const guessEntry = {
            id: ws.playerId,
            player: player.name,
            text: guessText,
            correct,
          };

          room.guesses.push(guessEntry);

          if (correct) {
            player.score = (player.score || 0) + 10;

            const drawer = room.players.find((p) => p.id === room.drawerId);
            if (drawer) {
              drawer.score = (drawer.score || 0) + 5;
            }
          }

          broadcastRoom(ws.roomCode);
          break;
        }

        case "next_round": {
          const currentIndex = room.players.findIndex((p) => p.id === room.drawerId);
          const nextIndex =
            currentIndex === -1
              ? 0
              : (currentIndex + 1) % room.players.length;

          room.drawerId = room.players[nextIndex]?.id || room.drawerId;
          room.round = (room.round || 1) + 1;
          room.prompt = payload?.prompt || randomPrompt();
          room.strokes = [];
          room.guesses = [];

          wss.clients.forEach((client) => {
            if (client.readyState === 1 && client.roomCode === ws.roomCode) {
              client.send(
                JSON.stringify({
                  type: "canvas_cleared",
                })
              );
            }
          });

          broadcastRoom(ws.roomCode);
          break;
        }

        case "set_prompt": {
          const prompt = payload?.prompt?.trim();
          if (!prompt) return;
          room.prompt = prompt;
          broadcastRoom(ws.roomCode);
          break;
        }

        default:
          safeSend(ws, {
            type: "error",
            payload: "Unknown message type",
          });
      }
    } catch (err) {
      console.error("WebSocket message error:", err);
      safeSend(ws, {
        type: "error",
        payload: "Bad WebSocket message",
      });
    }
  });

  ws.on("close", () => {
    if (ws.roomCode && ws.playerId) {
      removePlayerFromRoom(ws.roomCode, ws.playerId);
    }
  });
});

/* ---------------- Start Server ---------------- */

server.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
