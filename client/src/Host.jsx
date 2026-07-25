import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { getRoom, startGame, nextQuestion } from "./api";
import { usePolling } from "./usePolling";
import Leaderboard from "./Leaderboard";
import Timer from "./Timer";

const POLL_MS = 1000;

export default function Host({ code, hostToken, onExit }) {
  const [state, setState] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  usePolling(async () => {
    const res = await getRoom(code);
    if (res.ok) {
      setState(res);
    } else if (res.error === "Room not found") {
      setError("Room closed or expired");
    }
  }, POLL_MS);

  async function handleStart() {
    setBusy(true);
    const res = await startGame(code, hostToken);
    setBusy(false);
    if (res.ok) setState(res);
    else setError(res.error);
  }

  async function handleNext() {
    setBusy(true);
    const res = await nextQuestion(code, hostToken);
    setBusy(false);
    if (res.ok) setState(res);
    else setError(res.error);
  }

  const joinUrl = `${window.location.origin}${window.location.pathname}?code=${code}`;
  const phase = state?.phase || "lobby";
  const players = state?.players || [];

  return (
    <div className="screen host-screen">
      <button className="btn btn-ghost back-btn" onClick={onExit}>
        ← Leave
      </button>

      {error && <p className="error">{error}</p>}

      {phase === "lobby" && (
        <>
          <p className="eyebrow">Room code</p>
          <h1 className="room-code">{code}</h1>

          <div className="qr-card">
            <QRCodeSVG value={joinUrl} size={192} marginSize={2} />
          </div>
          <p className="join-hint">
            Scan to join, or go to <strong>{window.location.host}</strong> and enter the code.
          </p>

          <h2 className="section-title">Players ({players.length})</h2>
          <ul className="player-list">
            {players.length === 0 && <li className="muted">Waiting for players…</li>}
            {players.map((p) => (
              <li key={p.id}>{p.name}</li>
            ))}
          </ul>

          <button className="btn btn-primary" disabled={players.length === 0 || busy} onClick={handleStart}>
            Start game
          </button>
        </>
      )}

      {phase === "question" && state.question && (
        <>
          <p className="eyebrow">
            Question {state.question.index + 1} / {state.question.total}
          </p>
          <h1 className="question-text">{state.question.text}</h1>
          <Timer startedAt={state.question.startedAt} durationMs={state.question.durationMs} now={state.now} />
          <ol className="choice-list display-only">
            {state.question.choices.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ol>
          <p className="muted">
            {state.answeredCount}/{players.length} answered
          </p>
        </>
      )}

      {phase === "reveal" && state.question && (
        <>
          <p className="eyebrow">Answer</p>
          <h1 className="question-text">{state.question.choices[state.correctIndex]}</h1>
          <Leaderboard players={players} />
          <button className="btn btn-primary" disabled={busy} onClick={handleNext}>
            {state.question.index + 1 >= state.question.total ? "See final results" : "Next question"}
          </button>
        </>
      )}

      {phase === "over" && (
        <>
          <h1 className="section-title">Final results 🏆</h1>
          <Leaderboard players={players} />
          <button className="btn btn-secondary" onClick={onExit}>
            New game
          </button>
        </>
      )}
    </div>
  );
}
