import { useCallback, useEffect, useRef, useState } from "react";
import {
  recommendBusinesses,
  type RecommendationResult,
} from "@/lib/recommendation";
import { classifyApiError } from "@/context/apiClient";

type Status = "idle" | "loading" | "done" | "error";

export function useBusinessRecommendation() {
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [data, setData] = useState<RecommendationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const run = useCallback(async (lat: number, lng: number) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setStatus("loading");
    setError(null);
    setProgress({ done: 0, total: 0 });

    try {
      const result = await recommendBusinesses({
        lat,
        lng,
        signal: controller.signal,
        onProgress: (done, total) => {
          if (!controller.signal.aborted) setProgress({ done, total });
        },
      });
      if (controller.signal.aborted) return;
      setData(result);
      setStatus("done");
    } catch (err) {
      if (
        controller.signal.aborted ||
        (err as { code?: string })?.code === "ERR_CANCELED" ||
        (err as { name?: string })?.name === "AbortError"
      ) {
        return;
      }
      const message =
        err instanceof Error && err.name === "UnsupportedLocationError"
          ? err.message
          : err instanceof Error && !("isAxiosError" in err)
            ? err.message
            : classifyApiError(err).message;
      setError(message);
      setStatus("error");
    }
  }, []);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    setStatus("idle");
    setData(null);
    setError(null);
  }, []);

  return { status, progress, data, error, run, reset };
}