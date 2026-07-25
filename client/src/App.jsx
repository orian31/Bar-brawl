import { useEffect, useState } from "react";
import { socket, emitAsync } from "./socket";
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
  const [playerName, setPlayerName] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  useEffect(() => {
    socket.connect();
    return () => socket.disconnect();
  }, []);

  async function handleHost() {
    setJoinError("");
    const res = await emitAsync("host:create", {});
    if (res.ok) {
      setRoomCode(res.code);
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
    const res = await emitAsync("player:join", { code, name });
    setJoining(false);
    if (res.ok) {
      setRoomCode(res.code);
      setPlayerName(name);
      setView("player");
    } else {
      setJoinError(res.error || "Could not join room");
    }
  }

  function handleExit() {
    socket.disconnect();
    socket.connect();
    setRoomCode("");
    setJoinError("");
    setView("home");
  }

  if (view === "host") return <Host code={roomCode} onExit={handleExit} />;
  if (view === "player") return <Player code={roomCode} name={playerName} onExit={handleExit} />;

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
