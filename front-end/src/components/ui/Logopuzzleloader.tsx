import { useEffect, useId, useRef } from "react";
import { gsap } from "gsap";

type Box = [number, number, number, number];

interface Piece {
  d: string;
  block: 0 | 1 | 2 | 3;
  clip?: Box;
}

const DEFAULT_COLOR = "#5e5ed8";
const CENTER = { x: 750, y: 750 };

const DIRECTIONS: { x: number; y: number }[] = [
  { x: -1, y: 0 },
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
];

const PIECES: Piece[] = [
  {
    block: 0,
    d: "M 394.21875 719.273438 C 394.21875 574.628906 276.960938 457.371094 132.316406 457.371094 L 132.316406 719.273438 Z",
    clip: [132.316406, 457, 395, 720],
  },
  {
    block: 0,
    d: "M 394.21875 134.308594 C 249.574219 134.308594 132.316406 251.566406 132.316406 396.214844 L 394.21875 396.214844 Z",
    clip: [132.316406, 134, 395, 397],
  },
  {
    block: 0,
    d: "M 715.949219 719.273438 L 715.949219 376.273438 C 715.949219 242.640625 607.621094 134.308594 473.988281 134.308594 L 473.988281 477.3125 C 473.988281 610.945312 582.316406 719.273438 715.949219 719.273438 Z",
  },
  {
    block: 1,
    d: "M 1042.628906 132.316406 L 780.722656 132.316406 L 780.722656 394.21875 C 925.367188 394.21875 1042.628906 276.960938 1042.628906 132.316406 Z",
    clip: [780, 132.316406, 1043, 395],
  },
  {
    block: 1,
    d: "M 1365.6875 394.21875 C 1365.6875 249.574219 1248.429688 132.316406 1103.78125 132.316406 L 1103.78125 394.21875 Z",
    clip: [1103, 132.316406, 1366, 395],
  },
  {
    block: 1,
    d: "M 1365.6875 473.988281 L 1022.683594 473.988281 C 889.050781 473.988281 780.722656 582.316406 780.722656 715.949219 L 1123.726562 715.949219 C 1257.355469 715.949219 1365.6875 607.621094 1365.6875 473.988281 Z",
  },
  {
    block: 2,
    d: "M 1105.777344 780.722656 C 1105.777344 925.367188 1223.035156 1042.628906 1367.679688 1042.628906 L 1367.683594 1042.628906 L 1367.683594 780.722656 Z",
    clip: [1105, 780, 1367.566406, 1043],
  },
  {
    block: 2,
    d: "M 1105.777344 1365.6875 C 1250.421875 1365.6875 1367.683594 1248.429688 1367.683594 1103.78125 L 1105.777344 1103.78125 Z",
    clip: [1105, 1103, 1367.566406, 1366],
  },
  {
    block: 2,
    d: "M 784.046875 780.722656 L 784.046875 1123.726562 C 784.046875 1257.355469 892.375 1365.6875 1026.007812 1365.6875 L 1026.007812 1022.683594 C 1026.007812 889.050781 917.679688 780.722656 784.046875 780.722656 Z",
  },
  {
    block: 3,
    d: "M 457.371094 1367.679688 L 457.371094 1367.683594 L 719.273438 1367.683594 L 719.273438 1105.777344 C 574.628906 1105.777344 457.371094 1223.035156 457.371094 1367.679688 Z",
    clip: [457, 1105, 720, 1367.566406],
  },
  {
    block: 3,
    d: "M 134.308594 1105.777344 C 134.308594 1250.421875 251.566406 1367.683594 396.214844 1367.683594 L 396.214844 1105.777344 Z",
    clip: [134, 1105, 397, 1367.566406],
  },
  {
    block: 3,
    d: "M 134.308594 1026.007812 L 477.3125 1026.007812 C 610.945312 1026.007812 719.273438 917.679688 719.273438 784.046875 L 376.273438 784.046875 C 242.640625 784.046875 134.308594 892.375 134.308594 1026.007812 Z",
  },
];

export type BlockColors = [string, string, string, string];

export interface LogoPuzzleLoaderProps {
  size?: number;
  duration?: number;
  pieceCount?: number;
  color?: string;
  colors?: BlockColors;
  className?: string;
}

const BLOCKS = [0, 1, 2, 3] as const;
const TRAVEL = 430;

const jitter = () => 0.92 + Math.random() * 0.2;

export default function LogoPuzzleLoader({
  size = 120,
  duration = 3,
  pieceCount = 12,
  color = DEFAULT_COLOR,
  colors,
  className = "",
}: LogoPuzzleLoaderProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const ctx = gsap.context(() => {
      const logo = svg.querySelector<SVGGElement>("[data-logo]");
      const blocks = BLOCKS.map((b) =>
        gsap.utils.toArray<SVGGElement>(`[data-block="${b}"]`, svg)
      );
      const all = gsap.utils.toArray<SVGGElement>("[data-block]", svg);

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.set(all, { opacity: 1 });
        return;
      }

      gsap.set(logo, { svgOrigin: `${CENTER.x} ${CENTER.y}` });

      let from = BLOCKS.map(() => jitter() * TRAVEL);
      let to = BLOCKS.map(() => jitter() * TRAVEL);

      const T = Math.max(1.2, duration);
      const detailed = pieceCount >= 12;
      const pStag = detailed ? T * 0.03 : 0;

      const tIn = T * 0.42;
      const durIn = tIn * 0.6;
      const gapIn = (tIn - durIn - 2 * pStag) / 3;

      const tPulse = T * 0.12;
      const tHold = T * 0.18;

      const tOut = T * 0.28;
      const durOut = tOut * 0.6;
      const gapOut = (tOut - durOut - 2 * pStag) / 3;

      const outAt = tIn + tPulse + tHold;

      const tl = gsap.timeline({ repeat: -1 });

      tl.eventCallback("onRepeat", () => {
        from = BLOCKS.map(() => jitter() * TRAVEL);
        to = BLOCKS.map(() => jitter() * TRAVEL);
        tl.invalidate();
      });

      BLOCKS.forEach((b) => {
        const els = blocks[b];
        const dir = DIRECTIONS[b];

        tl.fromTo(
          els,
          { x: () => dir.x * from[b], y: () => dir.y * from[b] },
          {
            x: 0,
            y: 0,
            duration: durIn,
            ease: "back.out(1.15)",
            stagger: pStag,
          },
          b * gapIn
        );
        tl.fromTo(
          els,
          { opacity: 0 },
          {
            opacity: 1,
            duration: durIn * 0.35,
            ease: "power1.out",
            stagger: pStag,
          },
          b * gapIn
        );

        tl.to(
          els,
          {
            x: () => dir.x * to[b],
            y: () => dir.y * to[b],
            duration: durOut,
            ease: "power3.in",
            stagger: pStag,
          },
          outAt + b * gapOut
        );
        tl.to(
          els,
          {
            opacity: 0,
            duration: durOut * 0.45,
            ease: "power1.in",
            stagger: pStag,
          },
          outAt + b * gapOut + durOut * 0.55
        );
      });

      tl.to(logo, { scale: 1.045, duration: tPulse * 0.45, ease: "power2.out" }, tIn);
      tl.to(
        logo,
        { scale: 1, duration: tPulse * 0.55, ease: "power2.inOut" },
        tIn + tPulse * 0.45
      );
    }, svg);

    return () => ctx.revert();
  }, [duration, pieceCount]);

  return (
    <div
      className={`inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    >
      <svg
        ref={svgRef}
        viewBox="100 100 1300 1300"
        width={size}
        height={size}
        style={{ overflow: "visible" }}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          {PIECES.map((p, i) =>
            p.clip ? (
              <clipPath id={`${uid}-c-${i}`} key={i}>
                <rect
                  x={p.clip[0]}
                  y={p.clip[1]}
                  width={p.clip[2] - p.clip[0]}
                  height={p.clip[3] - p.clip[1]}
                />
              </clipPath>
            ) : null
          )}
        </defs>

        <g data-logo>
          {PIECES.map((p, i) => (
            <g key={i} data-block={p.block} style={{ opacity: 0 }}>
              <g clipPath={p.clip ? `url(#${uid}-c-${i})` : undefined}>
                <path
                  d={p.d}
                  fill={colors?.[p.block] ?? color}
                  fillRule="nonzero"
                />
              </g>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}