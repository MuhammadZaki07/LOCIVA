import { useState, useCallback, useRef, useMemo } from "react";
import type { AnalysisResult } from "@/lib/analysisEngine";
import type { BusinessType } from "@/lib/umkmCatalog";
import {
  validateCandidateGeospatial,
  type Place,
} from "@/lib/LocalOsm";
import api, { classifyApiError } from "@/context/apiClient";

export function useLocationAnalysis() {
  const [analyzingMap, setAnalyzingMap] = useState<Record<string, boolean>>({});
  const [candidateErrors, setCandidateErrors] = useState<Record<string, string | null>>({});
  const [analysisStageMap, setAnalysisStageMap] = useState<Record<string, string>>({});
  const analysisCacheRef = useRef<Map<string, { result: AnalysisResult; timestamp: number }>>(new Map());
  const abortControllersRef = useRef<Record<string, AbortController | null>>({});
  const requestIdsRef = useRef<Record<string, number>>({});

  const isCandidateAnalyzing = useCallback(
    (candidateId: string) => Boolean(analyzingMap[candidateId]),
    [analyzingMap],
  );

  const getCandidateStage = useCallback(
    (candidateId: string) => analysisStageMap[candidateId] || "Mempersiapkan analisis...",
    [analysisStageMap],
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

      const cacheKey = `${candidateId}:${businessType.slug || businessType.id}:${lat.toFixed(5)}:${lng.toFixed(5)}:${radius}`;
      const cached = analysisCacheRef.current.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 60000) {
        setAnalyzingMap((prev) => ({ ...prev, [candidateId]: false }));
        return cached.result;
      }

      try {
        setAnalysisStageMap((prev) => ({ ...prev, [candidateId]: "Memvalidasi batas wilayah dan geospasial..." }));

        // 1. Real geospatial boundary validation (detects sea / open ocean / offshore)
        const geoCheck = await validateCandidateGeospatial(lat, lng, controller.signal);

        if (thisRequestId !== requestIdsRef.current[candidateId]) {
          return null;
        }

        if (geoCheck.isWaterOrOffshore) {
          // Inform backend of invalid water coordinate so it persists authoritative snapshot status
          let backendWaterRes: any = null;
          try {
            const waterRes = await api.post(
              "/analysis/location",
              {
                lat,
                lng,
                radius,
                business_type: businessType.slug || businessType.id,
                candidate_id: candidateId,
                is_water: true,
              },
              { signal: controller.signal },
            );
            backendWaterRes = waterRes.data?.data;
          } catch {}

          const waterResult: AnalysisResult = {
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
                "Titik kandidat berada di laut lepas atau perairan. Skor potensi dinonaktifkan untuk area non-daratan.",
            ],
            updatedAt: Date.now(),
            isValidLocation: false,
            isWaterOrOffshore: true,
            unsupportedReason:
              geoCheck.reason ||
              "Lokasi berada di perairan/laut lepas atau area non-layanan.",
            feasibility: backendWaterRes?.feasibility,
            overallRecommendation: backendWaterRes?.overall_recommendation ?? {
              status: "unsuitable",
              summary: "Lokasi tidak dapat digunakan secara fisik karena berada di perairan atau laut lepas.",
              blocking_reasons: ["Koordinat berada di perairan/laut lepas yang tidak memiliki daratan layak huni."],
              conditions: [],
            },
          };

          return waterResult;
        }

        // 2. Authoritative backend analysis (LOCIVA local POIs, businesses, civic reports, BPS)
        setAnalysisStageMap((prev) => ({ ...prev, [candidateId]: "Menghubungi engine analisis spasial & data BPS..." }));

        const res = await api.post(
          "/analysis/location",
          {
            lat,
            lng,
            radius,
            business_type: businessType.slug || businessType.id,
            candidate_id: candidateId,
          },
          { signal: controller.signal },
        );

        if (thisRequestId !== requestIdsRef.current[candidateId]) {
          return null; // A newer request for this candidate has superseded this one
        }

        const data = res.data?.data;
        if (!data) {
          throw new Error("Respon analisis tidak mengandung data yang valid.");
        }

        const relevantPlaces: Place[] = (data.relevant_poi || []).map((poi: any, idx: number) => ({
          id: poi.id || `poi-${candidateId}-${idx}-${poi.lat}-${poi.lng}`,
          name: poi.name || "POI",
          category: poi.category || "commercial",
          rawCategory: poi.raw_category || poi.category,
          lat: poi.lat || lat,
          lng: poi.lng || lng,
          source: poi.source || "lociva_internal",
        }));

        const finalRes: AnalysisResult = {
          candidateId,
          lat,
          lng,
          radius,
          businessTypeId: businessType.id,
          opportunityScore: data.opportunity_score,
          competitionScore: data.competition_score,
          accessibilityScore: data.accessibility_score,
          dataConfidence: data.data_confidence ?? 0,
          competitorCount: data.competitor_count ?? 0,
          nearestCompetitor: data.nearest_competitor ?? null,
          relevantPOI: (data.relevant_poi || []).map((poi: Record<string, unknown>) => ({
            id: String(poi.id ?? ""),
            name: String(poi.name ?? ""),
            category: String(poi.category ?? ""),
            distance: Number(poi.distance ?? 0),
            lat: Number(poi.lat ?? lat),
            lng: Number(poi.lng ?? lng),
            relevance: (poi.relevance as any) || "medium",
            source: String(poi.source ?? "lociva_internal"),
          })),
          allPlaces: knownPlaces && knownPlaces.length > 0 ? knownPlaces : relevantPlaces,
          factors: (data.factors || []).map((f: Record<string, unknown>) => ({
            key: String(f.key ?? ""),
            label: String(f.label ?? ""),
            value: Number(f.value ?? 0),
            impact: (f.impact as any) || "neutral",
            note: String(f.note ?? ""),
          })),
          dataWarnings: data.data_warnings || [],
          sources: data.sources || [],
          limitations: data.limitations,
          isTruncated: Boolean(data.is_truncated),
          isStaleOsm: Boolean(data.sources?.find((s: any) => s.id === "openstreetmap")?.status === "stale"),
          isValidLocation: data.is_valid_location !== false,
          isWaterOrOffshore: Boolean(data.is_water_or_offshore),
          unsupportedReason: data.unsupported_reason,
          analysisCompleteness: data.analysis_completeness ?? "full",
          algorithmVersion: data.algorithm_version ?? "1.0",
          feasibility: data.feasibility,
          overallRecommendation: data.overall_recommendation,
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
          updatedAt: Date.now(),
        };

        analysisCacheRef.current.set(cacheKey, { result: finalRes, timestamp: Date.now() });
        return finalRes;
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return null;
        }
        if ((err as any)?.name === "CanceledError" || (err as any)?.code === "ERR_CANCELED") {
          return null;
        }

        if (thisRequestId === requestIdsRef.current[candidateId]) {
          const classified = classifyApiError(err);
          const message = classified?.message || (err instanceof Error ? err.message : "Gagal menjalankan analisis lokasi");
          setCandidateErrors((prev) => ({ ...prev, [candidateId]: message }));
        }
        return null;
      } finally {
        if (thisRequestId === requestIdsRef.current[candidateId]) {
          setAnalyzingMap((prev) => ({ ...prev, [candidateId]: false }));
          setAnalysisStageMap((prev) => ({ ...prev, [candidateId]: "" }));
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
    getCandidateStage,
    error,
  };
}
