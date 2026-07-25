import { useEffect, useState } from "react";

/**
 * Countdown bar anchored to server time so it stays in sync across polls
 * and reloads, instead of restarting from whatever moment this component
 * happened to mount.
 */
export default function Timer({ startedAt, durationMs, now }) {
  const [clockOffset] = useState(() => now - Date.now());
  const [fraction, setFraction] = useState(1);

  useEffect(() => {
    function tick() {
      const estimatedServerNow = Date.now() + clockOffset;
      const elapsed = estimatedServerNow - startedAt;
      setFraction(Math.max(0, 1 - elapsed / durationMs));
    }
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [startedAt, durationMs, clockOffset]);

  return (
    <div className="timer-track">
      <div className="timer-fill" style={{ width: `${fraction * 100}%` }} />
    </div>
  );
}
