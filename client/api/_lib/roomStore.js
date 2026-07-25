import { pickQuestions } from "./questions.js";

export const QUESTION_DURATION_MS = 15000;
export const QUESTIONS_PER_GAME = 6;
const ROOM_TTL_SECONDS = 6 * 60 * 60;
const MAX_CAS_RETRIES = 8;

// Generic compare-and-swap: only writes newValue if the stored room's `rev`
// still matches expectedRev. Runs as a single atomic Redis command (Lua
// EVAL) so concurrent requests racing on the same room can't stomp on each
// other. The check is done via cjson.decode inside the script (rather than
// a raw string compare against what the JS side last read) because Redis
// clients — including @upstash/redis — may transparently JSON-parse GET
// results, so the exact string bytes the JS side "saw" aren't reliable to
// round-trip; the embedded rev counter is.
const CAS_SCRIPT = `
local cur = redis.call('GET', KEYS[1])
if not cur then return 0 end
local ok, curObj = pcall(cjson.decode, cur)
if not ok then return 0 end
if tostring(curObj.rev) ~= ARGV[1] then return 0 end
redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
return 1
`;

function roomKey(code) {
  return `bb:room:${code}`;
}

async function casSet(redis, key, expectedRev, newValue) {
  const result = await redis.eval(CAS_SCRIPT, [key], [String(expectedRev), newValue, String(ROOM_TTL_SECONDS)]);
  return result === 1;
}

/**
 * Load the room, apply `mutate(room) -> resultOrNull`, and write it back
 * only if nothing else changed the room in the meantime. Retries on
 * contention. `mutate` returning null means "precondition failed, don't
 * write" — the caller gets `{ room, result: null }` with the room as it
 * currently stands.
 */
async function updateRoom(redis, code, mutate) {
  const key = roomKey(code);
  for (let attempt = 0; attempt < MAX_CAS_RETRIES; attempt++) {
    const raw = await redis.get(key);
    if (raw === null || raw === undefined) return { room: null, result: undefined };
    const room = typeof raw === "string" ? JSON.parse(raw) : raw;
    const expectedRev = room.rev || 0;
    const result = mutate(room);
    if (result === null) return { room, result: null };
    room.rev = expectedRev + 1;
    const newRaw = JSON.stringify(room);
    const ok = await casSet(redis, key, expectedRev, newRaw);
    if (ok) return { room, result };
  }
  throw new Error("Room update contention exceeded retries");
}

async function getRoomRaw(redis, code) {
  const raw = await redis.get(roomKey(code));
  if (raw === null || raw === undefined) return null;
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

function makeRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function randomToken() {
  return Array.from({ length: 24 }, () => Math.floor(Math.random() * 36).toString(36)).join("");
}

export async function createRoom(redis) {
  let code;
  for (let i = 0; i < 10; i++) {
    const candidate = makeRoomCode();
    const exists = await redis.get(roomKey(candidate));
    if (!exists) {
      code = candidate;
      break;
    }
  }
  if (!code) throw new Error("Could not allocate a room code");

  const hostToken = randomToken();
  const room = {
    code,
    hostToken,
    createdAt: Date.now(),
    rev: 0,
    phase: "lobby",
    players: {},
    questions: [],
    currentIndex: -1,
    questionStartedAt: 0,
    answers: {},
    revealCorrectIndex: null
  };
  await redis.set(roomKey(code), JSON.stringify(room), { ex: ROOM_TTL_SECONDS });
  return { code, hostToken };
}

function applyReveal(room, now) {
  if (room.phase !== "question") return null;
  const q = room.questions[room.currentIndex];
  const dueByTime = now - room.questionStartedAt >= QUESTION_DURATION_MS;
  const dueByAnswers = Object.keys(room.answers).length >= Object.keys(room.players).length;
  if (!dueByTime && !dueByAnswers) return null;

  for (const [playerId, ans] of Object.entries(room.answers)) {
    const player = room.players[playerId];
    if (!player) continue;
    if (ans.choice === q.answer) {
      const remainingFraction = Math.max(0, 1 - ans.elapsedMs / QUESTION_DURATION_MS);
      player.score += Math.round(500 + 500 * remainingFraction);
    }
  }
  room.phase = "reveal";
  room.revealCorrectIndex = q.answer;
  return true;
}

/** Reads current state, materializing a due reveal transition first if needed. */
export async function getRoomState(redis, code) {
  const now = Date.now();
  const existing = await getRoomRaw(redis, code);
  if (!existing) return null;

  if (existing.phase === "question") {
    const q = existing.questions[existing.currentIndex];
    const dueByTime = now - existing.questionStartedAt >= QUESTION_DURATION_MS;
    const dueByAnswers = Object.keys(existing.answers).length >= Object.keys(existing.players).length;
    if (dueByTime || dueByAnswers) {
      const { room } = await updateRoom(redis, code, (r) => applyReveal(r, Date.now()));
      return { room, now: Date.now() };
    }
  }
  return { room: existing, now };
}

export async function joinRoom(redis, code, name) {
  const playerId = randomToken();
  const { room, result } = await updateRoom(redis, code, (r) => {
    if (r.phase !== "lobby") return null;
    r.players[playerId] = { name, score: 0 };
    return true;
  });
  if (!room) return { ok: false, error: "Room not found" };
  if (result === null) return { ok: false, error: "Game already started" };
  return { ok: true, playerId, room };
}

export async function startGame(redis, code, hostToken) {
  const now = Date.now();
  const { room, result } = await updateRoom(redis, code, (r) => {
    if (r.hostToken !== hostToken) return null;
    if (r.phase !== "lobby") return null;
    if (Object.keys(r.players).length === 0) return null;
    r.questions = pickQuestions(QUESTIONS_PER_GAME);
    r.currentIndex = 0;
    r.phase = "question";
    r.questionStartedAt = now;
    r.answers = {};
    return true;
  });
  if (!room) return { ok: false, error: "Room not found" };
  if (result === null) {
    if (room.hostToken !== hostToken) return { ok: false, error: "Not host" };
    if (Object.keys(room.players).length === 0) return { ok: false, error: "No players yet" };
    return { ok: false, error: "Game already started" };
  }
  return { ok: true, room };
}

export async function submitAnswer(redis, code, playerId, choice) {
  const now = Date.now();
  const { room, result } = await updateRoom(redis, code, (r) => {
    if (r.phase !== "question") return null;
    if (!r.players[playerId]) return null;
    if (r.answers[playerId]) return null;
    r.answers[playerId] = { choice, elapsedMs: now - r.questionStartedAt };
    return true;
  });
  if (!room) return { ok: false, error: "Room not found" };
  if (result === null) return { ok: false, error: "Can't answer right now" };

  const state = await getRoomState(redis, code);
  return { ok: true, room: state.room };
}

export async function nextQuestion(redis, code, hostToken) {
  const now = Date.now();
  const { room, result } = await updateRoom(redis, code, (r) => {
    if (r.hostToken !== hostToken) return null;
    if (r.phase !== "reveal") return null;
    r.currentIndex += 1;
    if (r.currentIndex >= r.questions.length) {
      r.phase = "over";
    } else {
      r.phase = "question";
      r.questionStartedAt = now;
      r.answers = {};
    }
    return true;
  });
  if (!room) return { ok: false, error: "Room not found" };
  if (result === null) {
    if (room.hostToken !== hostToken) return { ok: false, error: "Not host" };
    return { ok: false, error: "Not ready for next question" };
  }
  return { ok: true, room };
}

export function publicPlayers(room) {
  return Object.entries(room.players)
    .map(([id, p]) => ({ id, name: p.name, score: p.score }))
    .sort((a, b) => b.score - a.score);
}

/** Shapes room state for API responses, hiding the answer key pre-reveal and the host token. */
export function viewRoom(room, now, { playerId } = {}) {
  const base = {
    code: room.code,
    phase: room.phase,
    players: publicPlayers(room),
    now
  };

  if (room.phase === "question" || room.phase === "reveal") {
    const q = room.questions[room.currentIndex];
    base.question = {
      index: room.currentIndex,
      total: room.questions.length,
      text: q.text,
      choices: q.choices,
      durationMs: QUESTION_DURATION_MS,
      startedAt: room.questionStartedAt
    };
  }

  if (room.phase === "reveal") {
    base.correctIndex = room.revealCorrectIndex;
  }

  if (playerId) {
    base.hasAnswered = Boolean(room.answers[playerId]);
  }
  base.answeredCount = Object.keys(room.answers).length;

  return base;
}
