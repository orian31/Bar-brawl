import { useEffect, useRef, useState } from "react";
import { socket, emitAsync } from "./socket";
import Leaderboard from "./Leaderboard";
import Timer from "./Timer";

export default function Host({ code, onExit }) {
  const [players, setPlayers] = useState([]);
  const [phase, setPhase] = useState("lobby");
  const [question, setQuestion] = useState(null);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [reveal, setReveal] = useState(null);
  const [error, setError] = useState("");
  const answeredRef = useRef(0);

  useEffect(() => {
    function onLobbyUpdate({ players }) {
      setPlayers(players);
    }
    function onQuestion(q) {
      setQuestion(q);
      setReveal(null);
      answeredRef.current = 0;
      setAnsweredCount(0);
      setPhase("question");
    }
    function onReveal(data) {
      setReveal(data);
      setPlayers(data.players);
      setPhase("reveal");
    }
    function onAnswerProgress({ answered }) {
      answeredRef.current = answered;
      setAnsweredCount(answered);
    }
    function onOver(data) {
      setPlayers(data.players);
      setPhase("over");
    }
    function onRoomClosed() {
      setError("Room closed");
    }

    socket.on("lobby:update", onLobbyUpdate);
    socket.on("game:question", onQuestion);
    socket.on("game:reveal", onReveal);
    socket.on("game:answer-progress", onAnswerProgress);
    socket.on("game:over", onOver);
    socket.on("room:closed", onRoomClosed);

    return () => {
      socket.off("lobby:update", onLobbyUpdate);
      socket.off("game:question", onQuestion);
      socket.off("game:reveal", onReveal);
      socket.off("game:answer-progress", onAnswerProgress);
      socket.off("game:over", onOver);
      socket.off("room:closed", onRoomClosed);
    };
  }, []);

  async function startGame() {
    const res = await emitAsync("host:start", {});
    if (!res.ok) setError(res.error);
  }

  async function nextQuestion() {
    const res = await emitAsync("host:next", {});
    if (!res.ok) setError(res.error);
  }

  const joinUrl = `${window.location.origin}${window.location.pathname}?code=${code}`;

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
          <p className="join-hint">
            Players join at <strong>{window.location.host}</strong> with this code, or scan/visit{" "}
            <span className="join-url">{joinUrl}</span>
          </p>

          <h2 className="section-title">Players ({players.length})</h2>
          <ul className="player-list">
            {players.length === 0 && <li className="muted">Waiting for players…</li>}
            {players.map((p) => (
              <li key={p.id}>{p.name}</li>
            ))}
          </ul>

          <button className="btn btn-primary" disabled={players.length === 0} onClick={startGame}>
            Start game
          </button>
        </>
      )}

      {phase === "question" && question && (
        <>
          <p className="eyebrow">
            Question {question.index + 1} / {question.total}
          </p>
          <h1 className="question-text">{question.text}</h1>
          <Timer durationMs={question.durationMs} />
          <ol className="choice-list display-only">
            {question.choices.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ol>
          <p className="muted">
            {answeredCount}/{players.length} answered
          </p>
        </>
      )}

      {phase === "reveal" && reveal && question && (
        <>
          <p className="eyebrow">Answer</p>
          <h1 className="question-text">{question.choices[reveal.correctIndex]}</h1>
          <Leaderboard players={reveal.players} />
          <button className="btn btn-primary" onClick={nextQuestion}>
            {question.index + 1 >= question.total ? "See final results" : "Next question"}
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
