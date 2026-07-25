import { useEffect, useRef } from "react";

/** Calls `fn` immediately and then every `intervalMs`, until unmounted or `enabled` goes false. */
export function usePolling(fn, intervalMs, enabled = true) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    async function tick() {
      if (!cancelled) await fnRef.current();
    }

    tick();
    const id = setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, enabled]);
}
