async function request(path, options) {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const data = await res.json().catch(() => ({ ok: false, error: "Bad response" }));
  if (!res.ok && !("ok" in data)) return { ok: false, error: `Request failed (${res.status})` };
  return data;
}

export function createRoom() {
  return request("/rooms", { method: "POST" });
}

export function joinRoom(code, name) {
  return request(`/rooms/${code}/join`, { method: "POST", body: JSON.stringify({ name }) });
}

export function getRoom(code, playerId) {
  const query = playerId ? `?playerId=${encodeURIComponent(playerId)}` : "";
  return request(`/rooms/${code}${query}`, { method: "GET" });
}

export function startGame(code, hostToken) {
  return request(`/rooms/${code}/start`, { method: "POST", body: JSON.stringify({ hostToken }) });
}

export function submitAnswer(code, playerId, choice) {
  return request(`/rooms/${code}/answer`, { method: "POST", body: JSON.stringify({ playerId, choice }) });
}

export function nextQuestion(code, hostToken) {
  return request(`/rooms/${code}/next`, { method: "POST", body: JSON.stringify({ hostToken }) });
}
