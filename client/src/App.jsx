import { useState } from "react";
import { createRoom, joinRoom } from "./api";
import Home from "./Home";
import Host from "./Host";
import Player from "./Player";

function initialCodeFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("code")?.toUpperCase() || "";
}

export default function App() {
  const [view, setView] = useState("home"); // home | host | player
  const [roomCode, setRoomCode] = useState("");
  const [hostToken, setHostToken] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  async function handleHost() {
    setJoinError("");
    const res = await createRoom();
    if (res.ok) {
      setRoomCode(res.code);
      setHostToken(res.hostToken);
      setView("host");
    } else {
      setJoinError(res.error || "Could not create room");
    }
  }

  async function handleJoin(code, name) {
    if (!code || !name) {
      setJoinError("Enter a room code and your name");
      return;
    }
    setJoining(true);
    setJoinError("");
    const res = await joinRoom(code.toUpperCase(), name);
    setJoining(false);
    if (res.ok) {
      setRoomCode(code.toUpperCase());
      setPlayerId(res.playerId);
      setPlayerName(name);
      setView("player");
    } else {
      setJoinError(res.error || "Could not join room");
    }
  }

  function handleExit() {
    setRoomCode("");
    setHostToken("");
    setPlayerId("");
    setJoinError("");
    setView("home");
  }

  if (view === "host") return <Host code={roomCode} hostToken={hostToken} onExit={handleExit} />;
  if (view === "player") return <Player code={roomCode} playerId={playerId} name={playerName} onExit={handleExit} />;

  return (
    <Home
      onHost={handleHost}
      onJoin={handleJoin}
      joining={joining}
      joinError={joinError}
      initialCode={initialCodeFromUrl()}
    />
  );
}
