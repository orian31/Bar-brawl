import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { pickQuestions } from "./questions.js";

const PORT = process.env.PORT || 4000;
const ALLOWED_ORIGIN = process.env.CLIENT_ORIGIN || "*";
const QUESTION_DURATION_MS = 15000;
const QUESTIONS_PER_GAME = 6;

const app = express();
app.use(cors({ origin: ALLOWED_ORIGIN }));
app.get("/health", (_req, res) => res.json({ ok: true }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: ALLOWED_ORIGIN, methods: ["GET", "POST"] }
});

/** @type {Map<string, Room>} */
const rooms = new Map();

function makeRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code;
  do {
    code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  } while (rooms.has(code));
  return code;
}

function publicPlayers(room) {
  return [...room.players.values()]
    .map((p) => ({ id: p.id, name: p.name, score: p.score }))
    .sort((a, b) => b.score - a.score);
}

function currentQuestionPayload(room) {
  const q = room.questions[room.currentIndex];
  return {
    index: room.currentIndex,
    total: room.questions.length,
    text: q.text,
    choices: q.choices,
    durationMs: QUESTION_DURATION_MS
  };
}

function clearRoomTimer(room) {
  if (room.timer) {
    clearTimeout(room.timer);
    room.timer = null;
  }
}

function revealQuestion(roomCode) {
  const room = rooms.get(roomCode);
  if (!room || room.phase !== "question") return;
  clearRoomTimer(room);
  room.phase = "reveal";
  const q = room.questions[room.currentIndex];

  for (const [socketId, ans] of room.answers.entries()) {
    const player = room.players.get(socketId);
    if (!player) continue;
    if (ans.choice === q.answer) {
      const remainingFraction = Math.max(0, 1 - ans.elapsedMs / QUESTION_DURATION_MS);
      player.score += Math.round(500 + 500 * remainingFraction);
    }
  }

  io.to(roomCode).emit("game:reveal", {
    correctIndex: q.answer,
    players: publicPlayers(room)
  });
}

function startQuestion(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;
  clearRoomTimer(room);
  room.phase = "question";
  room.answers = new Map();
  room.questionStartedAt = Date.now();

  io.to(roomCode).emit("game:question", currentQuestionPayload(room));
  room.timer = setTimeout(() => revealQuestion(roomCode), QUESTION_DURATION_MS);
}

io.on("connection", (socket) => {
  socket.on("host:create", (_payload, ack) => {
    const code = makeRoomCode();
    const room = {
      code,
      hostSocketId: socket.id,
      players: new Map(),
      questions: [],
      currentIndex: -1,
      phase: "lobby",
      answers: new Map(),
      timer: null,
      questionStartedAt: 0
    };
    rooms.set(code, room);
    socket.join(code);
    socket.data.role = "host";
    socket.data.roomCode = code;
    ack?.({ ok: true, code });
  });

  socket.on("player:join", ({ code, name }, ack) => {
    const roomCode = String(code || "").toUpperCase().trim();
    const playerName = String(name || "").trim().slice(0, 20);
    const room = rooms.get(roomCode);

    if (!room) return ack?.({ ok: false, error: "Room not found" });
    if (room.phase !== "lobby") return ack?.({ ok: false, error: "Game already started" });
    if (!playerName) return ack?.({ ok: false, error: "Enter a name" });

    room.players.set(socket.id, { id: socket.id, name: playerName, score: 0 });
    socket.join(roomCode);
    socket.data.role = "player";
    socket.data.roomCode = roomCode;

    ack?.({ ok: true, code: roomCode });
    io.to(roomCode).emit("lobby:update", { players: publicPlayers(room) });
  });

  socket.on("host:start", (_payload, ack) => {
    const roomCode = socket.data.roomCode;
    const room = rooms.get(roomCode);
    if (!room || room.hostSocketId !== socket.id) return ack?.({ ok: false, error: "Not host" });
    if (room.players.size === 0) return ack?.({ ok: false, error: "No players yet" });

    room.questions = pickQuestions(QUESTIONS_PER_GAME);
    room.currentIndex = 0;
    startQuestion(roomCode);
    ack?.({ ok: true });
  });

  socket.on("player:answer", ({ choice }, ack) => {
    const roomCode = socket.data.roomCode;
    const room = rooms.get(roomCode);
    if (!room || room.phase !== "question") return ack?.({ ok: false, error: "No active question" });
    if (room.answers.has(socket.id)) return ack?.({ ok: false, error: "Already answered" });

    room.answers.set(socket.id, {
      choice,
      elapsedMs: Date.now() - room.questionStartedAt
    });
    ack?.({ ok: true });
    io.to(roomCode).emit("game:answer-progress", { answered: room.answers.size, total: room.players.size });

    if (room.answers.size === room.players.size) {
      revealQuestion(roomCode);
    }
  });

  socket.on("host:next", (_payload, ack) => {
    const roomCode = socket.data.roomCode;
    const room = rooms.get(roomCode);
    if (!room || room.hostSocketId !== socket.id) return ack?.({ ok: false, error: "Not host" });

    room.currentIndex += 1;
    if (room.currentIndex >= room.questions.length) {
      room.phase = "ended";
      io.to(roomCode).emit("game:over", { players: publicPlayers(room) });
    } else {
      startQuestion(roomCode);
    }
    ack?.({ ok: true });
  });

  socket.on("disconnect", () => {
    const roomCode = socket.data.roomCode;
    const room = rooms.get(roomCode);
    if (!room) return;

    if (socket.data.role === "host" && room.hostSocketId === socket.id) {
      clearRoomTimer(room);
      io.to(roomCode).emit("room:closed");
      rooms.delete(roomCode);
    } else if (room.players.has(socket.id)) {
      room.players.delete(socket.id);
      room.answers.delete(socket.id);
      io.to(roomCode).emit("lobby:update", { players: publicPlayers(room) });
      if (room.phase === "question" && room.answers.size === room.players.size && room.players.size > 0) {
        revealQuestion(roomCode);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Bar Brawl server listening on :${PORT}`);
});
