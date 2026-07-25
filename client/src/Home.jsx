import { useState } from "react";

export default function Home({ onHost, onJoin, joining, joinError, initialCode }) {
  const [code, setCode] = useState(initialCode || "");
  const [name, setName] = useState("");

  function submitJoin(e) {
    e.preventDefault();
    onJoin(code, name);
  }

  return (
    <div className="screen home-screen">
      <h1 className="logo">🍻 Bar Brawl</h1>
      <p className="tagline">Pub trivia. Real people. One winner.</p>

      <button className="btn btn-primary" onClick={onHost}>
        Host a game
      </button>

      <div className="divider">or join one</div>

      <form className="join-form" onSubmit={submitJoin}>
        <input
          className="input code-input"
          placeholder="ROOM CODE"
          maxLength={4}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          autoCapitalize="characters"
        />
        <input
          className="input"
          placeholder="Your name"
          maxLength={20}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="btn btn-secondary" type="submit" disabled={joining}>
          {joining ? "Joining…" : "Join game"}
        </button>
        {joinError && <p className="error">{joinError}</p>}
      </form>
    </div>
  );
}
