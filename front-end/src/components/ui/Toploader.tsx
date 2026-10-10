import { useEffect, useSyncExternalStore } from "react";

interface LoaderState {
  visible: boolean;
  progress: number;
}

type Timer = ReturnType<typeof setTimeout> | undefined;

const SHOW_DELAY = 120;
const TRICKLE_INTERVAL = 220;
const COMPLETE_HOLD = 220;
const FADE_OUT = 320;
const WATCHDOG = 30000;
const START_PROGRESS = 0.08;
const MAX_TRICKLE = 0.94;

let state: LoaderState = { visible: false, progress: 0 };
let pending = 0;
let showTimer: Timer;
let trickleTimer: ReturnType<typeof setInterval> | undefined;
let hideTimer: Timer;
let resetTimer: Timer;
let watchdogTimer: Timer;

const listeners = new Set<() => void>();

function setState(next: Partial<LoaderState>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

function trickle() {
  if (state.progress >= MAX_TRICKLE) return;
  const step = (1 - state.progress) * (0.04 + Math.random() * 0.08);
  setState({ progress: Math.min(state.progress + step, MAX_TRICKLE) });
}

function finish() {
  clearTimeout(showTimer);
  clearInterval(trickleTimer);
  clearTimeout(watchdogTimer);
  if (!state.visible) return;
  setState({ progress: 1 });
  hideTimer = setTimeout(() => setState({ visible: false }), COMPLETE_HOLD);
  resetTimer = setTimeout(
    () => setState({ progress: 0 }),
    COMPLETE_HOLD + FADE_OUT,
  );
}

function reset() {
  pending = 0;
  finish();
}

function start() {
  pending += 1;
  if (pending > 1) return;
  clearTimeout(hideTimer);
  clearTimeout(resetTimer);
  if (state.visible || state.progress > 0) {
    setState({ visible: false, progress: 0 });
  }
  showTimer = setTimeout(() => {
    setState({ visible: true, progress: START_PROGRESS });
    trickleTimer = setInterval(trickle, TRICKLE_INTERVAL);
  }, SHOW_DELAY);
  watchdogTimer = setTimeout(reset, WATCHDOG);
}

function done() {
  if (pending === 0) return;
  pending -= 1;
  if (pending === 0) finish();
}

function track<T>(promise: Promise<T>): Promise<T> {
  start();
  return promise.finally(done);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getState() {
  return state;
}

export const topLoader = { start, done, track, getState };

export function useTopLoading(active: boolean) {
  useEffect(() => {
    if (!active) return;
    start();
    return done;
  }, [active]);
}

export function TopLoader() {
  const { visible, progress } = useSyncExternalStore(
    subscribe,
    getState,
    getState,
  );

  return (
    <div
      role="progressbar"
      aria-label="Page loading"
      aria-hidden={!visible}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-1 motion-reduce:transition-none"
      style={{
        opacity: visible ? 1 : 0,
        transition: `opacity ${FADE_OUT}ms ease`,
      }}
    >
      <div
        className="h-full w-full origin-left rounded-r-full bg-linear-to-r from-[#9a9af2] via-primary to-primary-deep shadow-[0_0_10px_rgba(91,91,214,0.5)] motion-reduce:transition-none"
        style={{
          transform: `scaleX(${progress})`,
          transition: "transform 260ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />
    </div>
  );
}

export default TopLoader;
