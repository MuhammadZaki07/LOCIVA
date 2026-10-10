import { useEffect, useId, useMemo, useRef } from "react";
import { gsap } from "gsap";

type Box = [number, number, number, number];

interface Piece {
  d: string;
  block: 0 | 1 | 2 | 3;
  clip?: Box;
}

interface BrushConfig {
  origin: [number, number];
  orient: "h" | "v";
  flipX: boolean;
  flipY: boolean;
}

const DEFAULT_COLOR = "#5e5ed8";
const BLOCKS = [0, 1, 2, 3] as const;
const SIZE = 586;
const ROWS = 5;
const ROW_STEP = 125;
const ROW_START = 20;
const EXTEND = 90;
const OFFSETS = [-42, 0, 42];
const WIDTHS = [96, 110, 96];
const HIDDEN_IN = 1.01;
const HIDDEN_OUT = -1.01;

const BRUSHES: BrushConfig[] = [
  { origin: [132.3, 134.3], orient: "h", flipX: false, flipY: false },
  { origin: [780.7, 132.3], orient: "v", flipX: true, flipY: false },
  { origin: [784, 780.7], orient: "h", flipX: true, flipY: true },
  { origin: [134.3, 784], orient: "v", flipX: false, flipY: true },
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

function buildBrushPath(cfg: BrushConfig): string {
  const pts: [number, number][] = [];
  for (let i = 0; i < ROWS; i++) {
    const y = ROW_START + ROW_STEP * i;
    const forward = i % 2 === 0;
    const a = forward ? -EXTEND : SIZE + EXTEND;
    const b = forward ? SIZE + EXTEND : -EXTEND;
    pts.push([a, y], [b, y]);
  }
  return pts
    .map(([u, v], i) => {
      let x = cfg.orient === "h" ? u : v;
      let y = cfg.orient === "h" ? v : u;
      if (cfg.flipX) x = SIZE - x;
      if (cfg.flipY) y = SIZE - y;
      return `${i === 0 ? "M" : "L"} ${(x + cfg.origin[0]).toFixed(1)} ${(
        y + cfg.origin[1]
      ).toFixed(1)}`;
    })
    .join(" ");
}

export type BlockColors = [string, string, string, string];

export interface LogoBrushLoaderProps {
  size?: number;
  duration?: number;
  color?: string;
  colors?: BlockColors;
  roughness?: number;
  className?: string;
}

export default function LogoBrushLoader({
  size = 120,
  duration = 2.8,
  color = DEFAULT_COLOR,
  colors,
  roughness = 26,
  className = "",
}: LogoBrushLoaderProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const brushPaths = useMemo(() => BRUSHES.map(buildBrushPath), []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const ctx = gsap.context(() => {
      const strokes = BLOCKS.map((b) =>
        gsap.utils.toArray<SVGPathElement>(`[data-stroke="${b}"]`, svg)
      );

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.set(strokes.flat(), { attr: { "stroke-dashoffset": 0 } });
        return;
      }

      const T = Math.max(1.2, duration);
      const lag = T * 0.018;
      const lagTotal = lag * (OFFSETS.length - 1);

      const tIn = T * 0.46;
      const durIn = tIn * 0.55;
      const gapIn = (tIn - durIn - lagTotal) / 3;

      const tHold = T * 0.14;

      const tOut = T * 0.3;
      const durOut = tOut * 0.55;
      const gapOut = (tOut - durOut - lagTotal) / 3;

      const outAt = tIn + tHold;

      const tl = gsap.timeline({ repeat: -1 });

      BLOCKS.forEach((b) => {
        strokes[b].forEach((el, k) => {
          tl.fromTo(
            el,
            { attr: { "stroke-dashoffset": HIDDEN_IN } },
            {
              attr: { "stroke-dashoffset": 0 },
              duration: durIn,
              ease: "power2.inOut",
            },
            b * gapIn + k * lag
          );
          tl.fromTo(
            el,
            { attr: { "stroke-dashoffset": 0 } },
            {
              attr: { "stroke-dashoffset": HIDDEN_OUT },
              duration: durOut,
              ease: "power2.inOut",
              immediateRender: false,
            },
            outAt + b * gapOut + k * lag
          );
        });
      });

      tl.set({}, {}, T);
    }, svg);

    return () => ctx.revert();
  }, [duration]);

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

          {BLOCKS.map((b) => (
            <filter
              key={`f${b}`}
              id={`${uid}-f-${b}`}
              filterUnits="userSpaceOnUse"
              x={0}
              y={0}
              width={1500}
              height={1500}
              colorInterpolationFilters="sRGB"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.035"
                numOctaves={2}
                seed={b + 3}
                result="noise"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale={roughness}
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          ))}

          {BLOCKS.map((b) => (
            <mask
              key={`m${b}`}
              id={`${uid}-m-${b}`}
              maskUnits="userSpaceOnUse"
              x={0}
              y={0}
              width={1500}
              height={1500}
            >
              <g filter={`url(#${uid}-f-${b})`}>
                {OFFSETS.map((off, k) => (
                  <path
                    key={k}
                    data-stroke={b}
                    d={brushPaths[b]}
                    transform={
                      BRUSHES[b].orient === "h"
                        ? `translate(0 ${off})`
                        : `translate(${off} 0)`
                    }
                    fill="none"
                    stroke="#fff"
                    strokeWidth={WIDTHS[k]}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    pathLength={1}
                    strokeDasharray="1 3"
                    strokeDashoffset={HIDDEN_IN}
                  />
                ))}
              </g>
            </mask>
          ))}
        </defs>

        {BLOCKS.map((b) => (
          <g key={b} mask={`url(#${uid}-m-${b})`}>
            {PIECES.map((p, i) =>
              p.block === b ? (
                <g
                  key={i}
                  clipPath={p.clip ? `url(#${uid}-c-${i})` : undefined}
                >
                  <path
                    d={p.d}
                    fill={colors?.[b] ?? color}
                    fillRule="nonzero"
                  />
                </g>
              ) : null
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
