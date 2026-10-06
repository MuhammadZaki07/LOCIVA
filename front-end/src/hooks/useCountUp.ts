import { useEffect, useRef, useState } from "react";

export function useCountUp(value: number, duration = 650) {
  const [current, setCurrent] = useState(0);
  const latest = useRef(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      latest.current = value;
      setCurrent(value);
      return;
    }

    const from = latest.current;
    let frame = 0;
    let start: number | null = null;

    const tick = (time: number) => {
      if (start == null) start = time;
      const progress = Math.min(1, (time - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      const next = Math.round(from + (value - from) * eased);
      latest.current = next;
      setCurrent(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return current;
}
