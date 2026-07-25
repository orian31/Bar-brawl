import { useEffect, useState } from "react";
import { socket, emitAsync } from "./socket";
import Leaderboard from "./Leaderboard";
import Timer from "./Timer";

export default function Player({ code, name, onExit }) {
  const [players, setPlayers] = useState([]);
  const [phase, setPhase] = useState("lobby");
  const [question, setQuestion] = useState(null);
  const [selected, setSelected] = useState(null);
  const [reveal, setReveal] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    function onLobbyUpdate({ players }) {
      setPlayers(players);
    }
    function onQuestion(q) {
      setQuestion(q);
      setSelected(null);
      setReveal(null);
      setPhase("question");
    }
    function onReveal(data) {
      setReveal(data);
      setPlayers(data.players);
      setPhase("reveal");
    }
    function onOver(data) {
      setPlayers(data.players);
      setPhase("over");
    }
    function onRoomClosed() {
      setError("The host ended the game");
      setPhase("lobby");
    }

    socket.on("lobby:update", onLobbyUpdate);
    socket.on("game:question", onQuestion);
    socket.on("game:reveal", onReveal);
    socket.on("game:over", onOver);
    socket.on("room:closed", onRoomClosed);

    return () => {
      socket.off("lobby:update", onLobbyUpdate);
      socket.off("game:question", onQuestion);
      socket.off("game:reveal", onReveal);
      socket.off("game:over", onOver);
      socket.off("room:closed", onRoomClosed);
    };
  }, []);

  async function pickChoice(i) {
    if (selected !== null) return;
    setSelected(i);
    const res = await emitAsync("player:answer", { choice: i });
    if (!res.ok) setError(res.error);
  }

  const myScore = players.find((p) => p.name === name)?.score;

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

      {phase === "question" && question && (
        <>
          <p className="eyebrow">
            Question {question.index + 1} / {question.total}
          </p>
          <h1 className="question-text">{question.text}</h1>
          <Timer durationMs={question.durationMs} />
          <ol className="choice-list">
            {question.choices.map((c, i) => (
              <li key={i}>
                <button
                  className={`choice-btn ${selected === i ? "selected" : ""}`}
                  disabled={selected !== null}
                  onClick={() => pickChoice(i)}
                >
                  {c}
                </button>
              </li>
            ))}
          </ol>
          {selected !== null && <p className="muted">Answer locked in — waiting on the rest of the bar…</p>}
        </>
      )}

      {phase === "reveal" && reveal && question && (
        <>
          <p className="eyebrow">Answer</p>
          <h1 className={`question-text ${selected === reveal.correctIndex ? "correct" : "incorrect"}`}>
            {question.choices[reveal.correctIndex]}
          </h1>
          <p className="muted">
            {selected === reveal.correctIndex ? "Nice, you got it!" : "Better luck next round."}
            {typeof myScore === "number" && ` Your score: ${myScore}`}
          </p>
          <Leaderboard players={reveal.players} />
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
