import { useState, useCallback, useRef } from "react";
import { calculateAnalysis } from "@/lib/analysisEngine";
import type { AnalysisResult } from "@/lib/analysisEngine";
import type { BusinessType } from "@/lib/umkmCatalog";
import { fetchPlacesAround, type Place } from "@/lib/Osm";
import api, { classifyApiError } from "@/context/apiClient";

export function useLocationAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef<number>(0);

  const analyze = useCallback(
    async (
      candidateId: string,
      lat: number,
      lng: number,
      radius: number,
      businessType: BusinessType,
      knownPlaces?: Place[],
    ): Promise<AnalysisResult | null> => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const thisRequestId = ++requestIdRef.current;
      abortControllerRef.current = new AbortController();
      setIsAnalyzing(true);
      setError(null);

      try {
        let places = knownPlaces ?? [];
        if (!knownPlaces) {
          places = await fetchPlacesAround(lat, lng, radius, abortControllerRef.current.signal);
        }

        if (thisRequestId !== requestIdRef.current) {
          return null; // A newer request has started
        }

        const clientResult = calculateAnalysis(
          candidateId,
          lat,
          lng,
          radius,
          businessType,
          places,
        );

        try {
          const res = await api.post("/analysis/location", {
            lat,
            lng,
            radius,
            business_type: businessType.slug || businessType.id,
            candidate_id: candidateId,
            external_places: places.slice(0, 250).map((p) => ({
              id: p.id,
              name: p.name,
              category: p.category,
              lat: p.lat,
              lng: p.lng,
              source: "openstreetmap",
            })),
          });

          const data = res.data?.data;
          if (data && thisRequestId === requestIdRef.current) {
            return {
              ...clientResult,
              opportunityScore: data.opportunity_score ?? clientResult.opportunityScore,
              competitionScore: data.competition_score ?? clientResult.competitionScore,
              accessibilityScore: data.accessibility_score ?? clientResult.accessibilityScore,
              dataConfidence: data.data_confidence ?? clientResult.dataConfidence,
              competitorCount: data.competitor_count ?? clientResult.competitorCount,
              nearestCompetitor: data.nearest_competitor ?? clientResult.nearestCompetitor,
              relevantPOI: (data.relevant_poi ?? clientResult.relevantPOI).map((poi: Record<string, unknown>, index: number) => ({
                ...clientResult.relevantPOI[index],
                ...poi,
              })),
              factors: (data.factors ?? clientResult.factors).map((f: Record<string, unknown>) => ({
                key: String(f.key ?? ""),
                label: String(f.label ?? ""),
                value: Number(f.value ?? 0),
                impact: (f.impact as AnalysisResult["factors"][number]["impact"]) ?? "neutral",
                note: String(f.note ?? ""),
              })),
              dataWarnings: data.data_warnings ?? clientResult.dataWarnings,
              sources: data.sources,
              limitations: data.limitations,
              allPlaces: clientResult.allPlaces,
            };
          }
        } catch (apiErr) {
          const classified = classifyApiError(apiErr);
          clientResult.dataWarnings.push(
            `Analisis server tidak tersedia (${classified.message}). Skor di bawah memakai Overpass saja.`,
          );
        }

        if (thisRequestId !== requestIdRef.current) {
          return null;
        }

        return clientResult;
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return null;
        }
        if (thisRequestId === requestIdRef.current) {
          const message = err instanceof Error ? err.message : "Gagal melakukan analisis lokasi";
          setError(message);
        }
        return null;
      } finally {
        if (thisRequestId === requestIdRef.current) {
          setIsAnalyzing(false);
        }
      }
    },
    [],
  );

  return { analyze, isAnalyzing, error };
}
