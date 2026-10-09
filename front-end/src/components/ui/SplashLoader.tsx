import { useEffect, useState } from "react";
import LogoPuzzleLoader from "./Logopuzzleloader";

interface SplashLoaderProps {
  delay?: number;
  label?: string;
}

export default function SplashLoader({
  delay = 150,
  label = "Loading",
}: SplashLoaderProps) {
  const [show, setShow] = useState(delay === 0);

  useEffect(() => {
    if (delay === 0) return;
    const timer = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 grid place-items-center bg-canvas"
    >
      <span className="sr-only">{label}</span>
      <div
        className={`clay grid size-44 place-items-center rounded-[48px] transition-opacity duration-300 ${
          show ? "opacity-100" : "opacity-0"
        }`}
      >
        {show && <LogoPuzzleLoader size={96} color="#5b5bd6" />}
      </div>
    </div>
  );
}
