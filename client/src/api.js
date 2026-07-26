async function request(path, options) {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const text = await res.text();
  try {
    const data = JSON.parse(text);
    if (!res.ok && !("ok" in data)) return { ok: false, error: `Request failed (${res.status})` };
    return data;
  } catch {
    // The API always returns JSON, so a non-JSON body (HTML, usually) means
    // something in front of it intercepted the request — most commonly
    // Vercel's Deployment Protection redirecting to a login page.
    const looksLikeAuthWall = /vercel|authenticat/i.test(text);
    const error = looksLikeAuthWall
      ? `Blocked by Vercel authentication (HTTP ${res.status}) — check Deployment Protection settings`
      : `Unexpected response (HTTP ${res.status})`;
    return { ok: false, error };
  }
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
