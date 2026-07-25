import { useEffect, useRef, useState } from "react";
import { getRoom, submitAnswer } from "./api";
import { usePolling } from "./usePolling";
import Leaderboard from "./Leaderboard";
import Timer from "./Timer";

const POLL_MS = 1000;

export default function Player({ code, playerId, name, onExit }) {
  const [state, setState] = useState(null);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const lastQuestionIndex = useRef(-1);

  usePolling(async () => {
    const res = await getRoom(code, playerId);
    if (res.ok) {
      if (res.question && res.question.index !== lastQuestionIndex.current) {
        lastQuestionIndex.current = res.question.index;
        setSelected(null);
      }
      setState(res);
    } else if (res.error === "Room not found") {
      setError("The host ended the game");
    }
  }, POLL_MS);

  async function pickChoice(i) {
    if (selected !== null || state?.hasAnswered) return;
    setSelected(i);
    const res = await submitAnswer(code, playerId, i);
    if (res.ok) setState(res);
    else setError(res.error);
  }

  const phase = state?.phase || "lobby";
  const players = state?.players || [];
  const myScore = players.find((p) => p.id === playerId)?.score;
  const locked = selected !== null || Boolean(state?.hasAnswered);

  return (
    <div className="screen player-screen">
      <button className="btn btn-ghost back-btn" onClick={onExit}>
        ← Leave
      </button>

      {error && <p className="error">{error}</p>}

      {phase === "lobby" && (
        <>
          <p className="eyebrow">Room {code}</p>
          <h1 className="question-text">You're in, {name}!</h1>
          <p className="muted">Waiting for the host to start the game…</p>
          <h2 className="section-title">Players ({players.length})</h2>
          <ul className="player-list">
            {players.map((p) => (
              <li key={p.id}>{p.name}</li>
            ))}
          </ul>
        </>
      )}

      {phase === "question" && state.question && (
        <>
          <p className="eyebrow">
            Question {state.question.index + 1} / {state.question.total}
          </p>
          <h1 className="question-text">{state.question.text}</h1>
          <Timer startedAt={state.question.startedAt} durationMs={state.question.durationMs} now={state.now} />
          <ol className="choice-list">
            {state.question.choices.map((c, i) => (
              <li key={i}>
                <button
                  className={`choice-btn ${selected === i ? "selected" : ""}`}
                  disabled={locked}
                  onClick={() => pickChoice(i)}
                >
                  {c}
                </button>
              </li>
            ))}
          </ol>
          {locked && <p className="muted">Answer locked in — waiting on the rest of the bar…</p>}
        </>
      )}

      {phase === "reveal" && state.question && (
        <>
          <p className="eyebrow">Answer</p>
          <h1 className={`question-text ${selected === state.correctIndex ? "correct" : "incorrect"}`}>
            {state.question.choices[state.correctIndex]}
          </h1>
          <p className="muted">
            {selected === null
              ? ""
              : selected === state.correctIndex
                ? "Nice, you got it!"
                : "Better luck next round."}
            {typeof myScore === "number" && ` Your score: ${myScore}`}
          </p>
          <Leaderboard players={players} />
        </>
      )}

      {phase === "over" && (
        <>
          <h1 className="section-title">Final results 🏆</h1>
          <Leaderboard players={players} />
          <button className="btn btn-secondary" onClick={onExit}>
            Done
          </button>
        </>
      )}
    </div>
  );
}
