import { useState, useCallback, useRef, useMemo } from "react";
import { calculateAnalysis } from "@/lib/analysisEngine";
import type { AnalysisResult } from "@/lib/analysisEngine";
import type { BusinessType } from "@/lib/umkmCatalog";
import {
  fetchPlacesAround,
  validateCandidateGeospatial,
  type Place,
} from "@/lib/Osm";
import api, { classifyApiError } from "@/context/apiClient";

export function useLocationAnalysis() {
  const [analyzingMap, setAnalyzingMap] = useState<Record<string, boolean>>({});
  const [candidateErrors, setCandidateErrors] = useState<Record<string, string | null>>({});
  const abortControllersRef = useRef<Record<string, AbortController | null>>({});
  const requestIdsRef = useRef<Record<string, number>>({});

  const isCandidateAnalyzing = useCallback(
    (candidateId: string) => Boolean(analyzingMap[candidateId]),
    [analyzingMap],
  );

  const getCandidateError = useCallback(
    (candidateId: string) => candidateErrors[candidateId] ?? null,
    [candidateErrors],
  );

  const isAnalyzing = useMemo(
    () => Object.values(analyzingMap).some(Boolean),
    [analyzingMap],
  );

  const error = useMemo(() => {
    const activeErrors = Object.values(candidateErrors).filter(Boolean);
    return activeErrors.length > 0 ? (activeErrors[0] as string) : null;
  }, [candidateErrors]);

  const analyze = useCallback(
    async (
      candidateId: string,
      lat: number,
      lng: number,
      radius: number,
      businessType: BusinessType,
      knownPlaces?: Place[],
    ): Promise<AnalysisResult | null> => {
      // Abort any active request specifically for this candidate
      if (abortControllersRef.current[candidateId]) {
        abortControllersRef.current[candidateId]?.abort();
      }

      const nextId = (requestIdsRef.current[candidateId] || 0) + 1;
      requestIdsRef.current[candidateId] = nextId;
      const thisRequestId = nextId;

      const controller = new AbortController();
      abortControllersRef.current[candidateId] = controller;

      setAnalyzingMap((prev) => ({ ...prev, [candidateId]: true }));
      setCandidateErrors((prev) => ({ ...prev, [candidateId]: null }));

      try {
        // 1. Real geospatial validation (detects sea / open ocean / offshore - Section 4)
        const geoCheck = await validateCandidateGeospatial(lat, lng, controller.signal);

        if (thisRequestId !== requestIdsRef.current[candidateId]) {
          return null;
        }

        if (geoCheck.isWaterOrOffshore) {
          // Inform backend of invalid water coordinate
          try {
            await api.post(
              "/analysis/location",
              {
                lat,
                lng,
                radius,
                business_type: businessType.slug || businessType.id,
                candidate_id: candidateId,
                is_water: true,
                external_places: [],
              },
              { signal: controller.signal },
            );
          } catch {}

          return {
            candidateId,
            lat,
            lng,
            radius,
            businessTypeId: businessType.id,
            opportunityScore: null,
            competitionScore: null,
            accessibilityScore: null,
            dataConfidence: 0,
            competitorCount: 0,
            nearestCompetitor: null,
            relevantPOI: [],
            allPlaces: [],
            factors: [],
            dataWarnings: [
              geoCheck.reason ||
                "Candidate location is in open sea or offshore water. Cannot calculate feasibility scores for non-land areas.",
            ],
            updatedAt: Date.now(),
            isValidLocation: false,
            isWaterOrOffshore: true,
            unsupportedReason:
              geoCheck.reason ||
              "Location is situated in the sea or unsupported offshore water.",
          };
        }

        let places = knownPlaces ?? [];
        if (!knownPlaces) {
          places = await fetchPlacesAround(lat, lng, radius, controller.signal);
        }

        if (thisRequestId !== requestIdsRef.current[candidateId]) {
          return null; // A newer request for this candidate has started
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
          const res = await api.post(
            "/analysis/location",
            {
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
            },
            { signal: controller.signal },
          );

          const data = res.data?.data;
          if (data && thisRequestId === requestIdsRef.current[candidateId]) {
            return {
              ...clientResult,
              opportunityScore:
                data.opportunity_score ?? clientResult.opportunityScore,
              competitionScore:
                data.competition_score ?? clientResult.competitionScore,
              accessibilityScore:
                data.accessibility_score ?? clientResult.accessibilityScore,
              dataConfidence:
                data.data_confidence ?? clientResult.dataConfidence,
              competitorCount:
                data.competitor_count ?? clientResult.competitorCount,
              nearestCompetitor:
                data.nearest_competitor ?? clientResult.nearestCompetitor,
              relevantPOI: (data.relevant_poi ?? clientResult.relevantPOI).map(
                (poi: Record<string, unknown>, index: number) => ({
                  ...clientResult.relevantPOI[index],
                  ...poi,
                }),
              ),
              factors: (data.factors ?? clientResult.factors).map(
                (f: Record<string, unknown>) => ({
                  key: String(f.key ?? ""),
                  label: String(f.label ?? ""),
                  value: Number(f.value ?? 0),
                  impact:
                    (f.impact as AnalysisResult["factors"][number]["impact"]) ??
                    "neutral",
                  note: String(f.note ?? ""),
                }),
              ),
              dataWarnings: data.data_warnings ?? clientResult.dataWarnings,
              sources: data.sources ?? clientResult.sources,
              internalBusinessCount: Number(data.internal_business_count ?? 0),
              limitations: data.limitations,
              allPlaces: clientResult.allPlaces,
              internalPoiCount: typeof data.internal_poi_total === "number" ? data.internal_poi_total : null,
              registeredBusinessCount:
                typeof data.registered_business_total === "number"
                  ? data.registered_business_total
                  : typeof data.internal_business_total === "number"
                  ? data.internal_business_total
                  : null,
              internalBusinessCount:
                typeof data.registered_business_total === "number"
                  ? data.registered_business_total
                  : typeof data.internal_business_total === "number"
                  ? data.internal_business_total
                  : typeof data.internal_poi_total === "number"
                  ? data.internal_poi_total
                  : null,
              reportCount: typeof data.report_count === "number" ? data.report_count : null,
              bpsData: data.bps_demographics
                ? {
                    regionName:
                      data.bps_demographics.region_name ||
                      (data.bps_demographics.status === "unsupported_region"
                        ? "Wilayah Belum Didukung BPS"
                        : undefined),
                    bpsCode: data.bps_demographics.domain_id || undefined,
                    population:
                      typeof data.bps_demographics.population === "number"
                        ? data.bps_demographics.population
                        : undefined,
                    densityPerKm2:
                      typeof data.bps_demographics.density_per_km2 === "number"
                        ? data.bps_demographics.density_per_km2
                        : undefined,
                    year: data.bps_demographics.year || undefined,
                    source: data.bps_demographics.source || "Badan Pusat Statistik (BPS)",
                    status: data.bps_demographics.status || undefined,
                  }
                : null,
            };
          }
        } catch (apiErr: any) {
          if (apiErr?.name === "CanceledError" || apiErr?.code === "ERR_CANCELED") {
            return null;
          }
          const classified = classifyApiError(apiErr);
          clientResult.dataWarnings.push(
            `Server analysis unavailable (${classified.message}). Preliminary scores estimated from OpenStreetMap data.`,
          );
        }

        if (thisRequestId !== requestIdsRef.current[candidateId]) {
          return null;
        }

        return clientResult;
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return null;
        }
        if ((err as any)?.name === "CanceledError" || (err as any)?.code === "ERR_CANCELED") {
          return null;
        }
        if (thisRequestId === requestIdsRef.current[candidateId]) {
          const message = err instanceof Error ? err.message : "Failed to perform location analysis";
          setCandidateErrors((prev) => ({ ...prev, [candidateId]: message }));
        }
        return null;
      } finally {
        if (thisRequestId === requestIdsRef.current[candidateId]) {
          setAnalyzingMap((prev) => ({ ...prev, [candidateId]: false }));
        }
      }
    },
    [],
  );

  return {
    analyze,
    isAnalyzing,
    isCandidateAnalyzing,
    getCandidateError,
    error,
  };
}
