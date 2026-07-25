import { useEffect, useState } from "react";

export default function Timer({ durationMs }) {
  const [fraction, setFraction] = useState(1);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = Date.now() - start;
      setFraction(Math.max(0, 1 - elapsed / durationMs));
    }, 100);
    return () => clearInterval(id);
  }, [durationMs]);

  return (
    <div className="timer-track">
      <div className="timer-fill" style={{ width: `${fraction * 100}%` }} />
    </div>
  );
}
