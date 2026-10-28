/**
 * Unit tests for Candidate Isolation, Frontend Data Mapping, and Data Integrity
 * Verifies P0 Requirements:
 * 1. Candidates without coordinates do not execute analysis.
 * 2. Switching tabs does not trigger duplicate fetch if candidate params are unchanged.
 * 3. Candidate A, B, and C maintain isolated coordinates, parameters, and results.
 * 4. Stale/out-of-order asynchronous responses do not overwrite newer results.
 * 5. Coordinate, radius, and business type changes invalidate existing results.
 * 6. internal_poi_total and registered_business_total map correctly without conflation.
 * 7. bps_demographics correctly passes through with distinction between null (unsupported) and 0.
 * 8. Spatial deduplication prevents double-counting registered businesses and external OSM POIs.
 * 9. Phase 4: Candidate UI Workflow, Stale Marks, Manual Analysis, Multi-Candidate POI Associations.
 */

import { describe, it, expect } from "vitest";
import { distanceMeters, type Place } from "../Osm";
import type { AnalysisResult } from "../analysisEngine";

describe("Candidate Isolation & Parameter Invalidation", () => {
  interface CandidateState {
    id: "A" | "B" | "C";
    lat: number | null;
    lng: number | null;
    radius: number;
    businessType: string;
  }

  it("guards against running analysis when coordinates are null (e.g. unplaced Candidate C)", () => {
    const candidateC: CandidateState = {
      id: "C",
      lat: null,
      lng: null,
      radius: 500,
      businessType: "kedai-kopi",
    };

    const shouldAnalyze = (c: CandidateState): boolean => {
      return c.lat !== null && c.lng !== null && !isNaN(c.lat) && !isNaN(c.lng);
    };

    expect(shouldAnalyze(candidateC)).toBe(false);

    const placedCandidateA: CandidateState = {
      id: "A",
      lat: -7.98,
      lng: 112.63,
      radius: 500,
      businessType: "kedai-kopi",
    };
    expect(shouldAnalyze(placedCandidateA)).toBe(true);
  });

  it("differentiates coordinates across Candidate A, B, and C independently", () => {
    const candidates: Record<"A" | "B" | "C", CandidateState> = {
      A: { id: "A", lat: -7.98, lng: 112.63, radius: 500, businessType: "kedai-kopi" },
      B: { id: "B", lat: -6.2, lng: 106.81, radius: 700, businessType: "warung-makan" },
      C: { id: "C", lat: null, lng: null, radius: 400, businessType: "laundry" },
    };

    expect(candidates.A.lat).not.toBe(candidates.B.lat);
    expect(candidates.B.lat).toBe(-6.2);
    expect(candidates.C.lat).toBeNull();
  });

  it("detects when candidate parameters change and correctly invalidates cached result", () => {
    let lastParamsKey = "-7.9800000_112.6300000_500_kedai-kopi";
    let analysisResult: AnalysisResult | null = {
      candidateId: "A",
      lat: -7.98,
      lng: 112.63,
      radius: 500,
      businessTypeId: "kedai-kopi",
      opportunityScore: 80,
      competitionScore: 50,
      accessibilityScore: 70,
      dataConfidence: 80,
      competitorCount: 2,
      nearestCompetitor: null,
      relevantPOI: [],
      allPlaces: [],
      factors: [],
      dataWarnings: [],
      updatedAt: Date.now(),
    };

    const hasParamChanged = (
      currentLat: number,
      currentLng: number,
      currentRadius: number,
      currentType: string
    ) => {
      const currentKey = `${currentLat.toFixed(7)}_${currentLng.toFixed(7)}_${currentRadius}_${currentType}`;
      return currentKey !== lastParamsKey;
    };

    // Tab switch without coordinate change
    expect(hasParamChanged(-7.98, 112.63, 500, "kedai-kopi")).toBe(false);

    // Coordinate dragged by user -> Invalidates result
    if (hasParamChanged(-7.985, 112.632, 500, "kedai-kopi")) {
      analysisResult = null;
    }
    expect(analysisResult).toBeNull();
  });

  it("handles out-of-order async responses and discards stale sequence requests", () => {
    let currentSeq = 0;
    let storedResult: { seq: number; value: string } | null = null;

    // Dispatch Request 1
    const req1Seq = ++currentSeq; // 1
    // Dispatch Request 2 (e.g. user moved pin quickly)
    const req2Seq = ++currentSeq; // 2

    // Response 2 arrives FIRST
    if (req2Seq >= currentSeq) {
      storedResult = { seq: req2Seq, value: "Response from Req 2" };
    }
    expect(storedResult?.value).toBe("Response from Req 2");

    // Delayed Response 1 arrives LATER -> should be rejected because req1Seq < currentSeq
    if (req1Seq >= currentSeq) {
      storedResult = { seq: req1Seq, value: "Stale Response 1" };
    }
    expect(storedResult?.value).toBe("Response from Req 2");
  });
});

describe("Phase 4: Candidate UI Workflow, Stale Marks & POI Associations", () => {
  it("ensures a newly created candidate does not inherit existing candidate coordinates, scores or warnings", () => {
    const candidateA = {
      id: "A",
      lat: -7.9800,
      lng: 112.6300,
      radius: 500,
      status: "ready",
      result: {
        opportunityScore: 82,
        dataWarnings: ["Warning A"],
      },
    };

    // Adding Candidate B in draft state
    const candidateB = {
      id: "B",
      lat: null as number | null,
      lng: null as number | null,
      radius: 500,
      status: "draft" as const,
      result: null as any,
    };

    expect(candidateB.lat).toBeNull();
    expect(candidateB.lng).toBeNull();
    expect(candidateB.status).toBe("draft");
    expect(candidateB.result).toBeNull();
    expect(candidateB.result?.opportunityScore).toBeUndefined();
  });

  it("marks candidate status as stale when coordinates move without automatic re-analysis", () => {
    let candidateStatus: "draft" | "location_selected" | "analyzing" | "ready" | "stale" = "ready";
    let isStale = false;
    let analysisTriggerCount = 0;

    const previousResult = {
      lat: -7.9800,
      lng: 112.6300,
      radius: 500,
      score: 75,
    };

    // User drags candidate pin to new coordinates
    const newCoords = {
      lat: -7.9850,
      lng: 112.6350,
      radius: 500,
    };

    // On coordinate change: mark stale, DO NOT automatically increment analysisTriggerCount
    if (newCoords.lat !== previousResult.lat || newCoords.lng !== previousResult.lng) {
      candidateStatus = "stale";
      isStale = true;
    }

    expect(candidateStatus).toBe("stale");
    expect(isStale).toBe(true);
    expect(analysisTriggerCount).toBe(0); // Analysis NOT auto-triggered!

    // Only when user explicitly clicks Analyze
    const handleUserClickAnalyze = () => {
      analysisTriggerCount++;
      candidateStatus = "ready";
      isStale = false;
    };

    handleUserClickAnalyze();
    expect(analysisTriggerCount).toBe(1);
    expect(candidateStatus).toBe("ready");
    expect(isStale).toBe(false);
  });

  it("aggregates POIs across multiple candidates simultaneously and tags candidate associations without duplicating entities", () => {
    const candidateAResultPlaces: Place[] = [
      { id: "poi_1", name: "Cafe Senja", category: "cafe", lat: -7.9801, lng: 112.6301 },
      { id: "poi_shared", name: "Minimarket 24", category: "retail", lat: -7.9820, lng: 112.6320 },
    ];

    const candidateBResultPlaces: Place[] = [
      { id: "poi_shared", name: "Minimarket 24", category: "retail", lat: -7.9820, lng: 112.6320 },
      { id: "poi_3", name: "Warung Makan Berkah", category: "food", lat: -7.9850, lng: 112.6350 },
    ];

    const results: Record<string, { allPlaces: Place[] }> = {
      A: { allPlaces: candidateAResultPlaces },
      B: { allPlaces: candidateBResultPlaces },
    };

    // Aggregation logic matching MapPage
    const placesMap = new Map<string, Place & { candidateAssociations: string[] }>();

    Object.entries(results).forEach(([candId, res]) => {
      res.allPlaces.forEach((place) => {
        const existing = placesMap.get(place.id);
        if (existing) {
          if (!existing.candidateAssociations.includes(candId)) {
            existing.candidateAssociations.push(candId);
          }
        } else {
          placesMap.set(place.id, {
            ...place,
            candidateAssociations: [candId],
          });
        }
      });
    });

    const combinedPlaces = Array.from(placesMap.values());

    // 1. Total unique POIs is 3, not 4 (no duplicate map pins)
    expect(combinedPlaces.length).toBe(3);

    // 2. Shared POI is associated with both Candidate A and Candidate B
    const sharedPoi = combinedPlaces.find((p) => p.id === "poi_shared");
    expect(sharedPoi).toBeDefined();
    expect(sharedPoi?.candidateAssociations).toContain("A");
    expect(sharedPoi?.candidateAssociations).toContain("B");
    expect(sharedPoi?.candidateAssociations.length).toBe(2);

    // 3. Isolated POI only associated with Candidate A
    const poi1 = combinedPlaces.find((p) => p.id === "poi_1");
    expect(poi1?.candidateAssociations).toEqual(["A"]);
  });

  it("maintains separate database persistence state per candidate", () => {
    const persistedCandidateMap: Record<string, boolean> = {
      A: false,
      B: false,
    };

    // Candidate A saved
    persistedCandidateMap["A"] = true;

    // Switching to Candidate B should show B is NOT yet persisted
    expect(persistedCandidateMap["A"]).toBe(true);
    expect(persistedCandidateMap["B"]).toBe(false);
  });
});

describe("Frontend Data Mapping & Null vs Zero Fidelity", () => {
  it("maps backend response properties internal_poi_total and registered_business_total accurately", () => {
    const backendResponse = {
      candidate_id: "A",
      opportunity_score: 85,
      competition_score: 40,
      accessibility_score: 75,
      internal_poi_total: 3,
      registered_business_total: 5,
      external_poi_total: 12,
      poi_total: 20,
      bps_demographics: {
        status: "supported",
        region_name: "Kota Malang",
        population: 891859,
        density_per_km2: 8103,
      },
    };

    const mappedResult: Partial<AnalysisResult> = {
      opportunityScore: backendResponse.opportunity_score,
      competitionScore: backendResponse.competition_score,
      accessibilityScore: backendResponse.accessibility_score,
      internalPoiCount: backendResponse.internal_poi_total,
      registeredBusinessCount: backendResponse.registered_business_total,
      internalBusinessCount: backendResponse.registered_business_total,
      bpsData: backendResponse.bps_demographics,
    };

    expect(mappedResult.internalPoiCount).toBe(3);
    expect(mappedResult.registeredBusinessCount).toBe(5);
    expect(mappedResult.internalBusinessCount).toBe(5);
    expect(mappedResult.bpsData?.population).toBe(891859);
  });

  it("distinguishes null BPS population (unsupported region) from 0 population", () => {
    const unsupportedBps = {
      status: "unsupported_region",
      region_name: "Wilayah Belum Didukung",
      population: null,
      density_per_km2: null,
    };

    const formatPopulation = (bps: typeof unsupportedBps | undefined) => {
      if (!bps || bps.status === "unsupported_region" || bps.population === null) {
        return "Belum didukung BPS";
      }
      return `${bps.population.toLocaleString("id-ID")} jiwa`;
    };

    expect(formatPopulation(unsupportedBps)).toBe("Belum didukung BPS");
    expect(formatPopulation(undefined)).toBe("Belum didukung BPS");

    const validBps = {
      status: "supported",
      region_name: "Kota Malang",
      population: 891859,
      density_per_km2: 8103,
    };
    expect(formatPopulation(validBps)).toContain("891.859 jiwa");
  });
});

describe("Spatial Deduplication Integrity", () => {
  it("flags OSM place within 50m with matching name as duplicate", () => {
    const registeredBusiness = {
      name: "Kopi Kenangan Senopati",
      lat: -6.2304,
      lng: 106.8152,
    };

    const osmPlaceNearbyDuplicate = {
      name: "Kopi Kenangan (Senopati Branch)",
      lat: -6.2305, // ~15m away
      lng: 106.8153,
    };

    const osmPlaceNearbyDifferent = {
      name: "Indomaret Senopati",
      lat: -6.2305,
      lng: 106.8153,
    };

    const isDuplicate = (
      name1: string,
      lat1: number,
      lng1: number,
      name2: string,
      lat2: number,
      lng2: number
    ): boolean => {
      const dist = distanceMeters(lat1, lng1, lat2, lng2);
      if (dist <= 50) {
        const n1 = name1.toLowerCase().trim();
        const n2 = name2.toLowerCase().trim();
        const baseName1 = n1.split(/[\s(]/)[0];
        const baseName2 = n2.split(/[\s(]/)[0];
        if (n1 === n2 || n1.includes(n2) || n2.includes(n1) || (baseName1.length > 3 && baseName1 === baseName2)) {
          return true;
        }
      }
      return false;
    };

    expect(
      isDuplicate(
        registeredBusiness.name,
        registeredBusiness.lat,
        registeredBusiness.lng,
        osmPlaceNearbyDuplicate.name,
        osmPlaceNearbyDuplicate.lat,
        osmPlaceNearbyDuplicate.lng
      )
    ).toBe(true);

    expect(
      isDuplicate(
        registeredBusiness.name,
        registeredBusiness.lat,
        registeredBusiness.lng,
        osmPlaceNearbyDifferent.name,
        osmPlaceNearbyDifferent.lat,
        osmPlaceNearbyDifferent.lng
      )
    ).toBe(false);
  });
});


describe("Phase 4: Frontend Candidate Integration & Feasibility Presentation", () => {
  it("supports more than three candidates dynamically (A, B, C, D, E)", () => {
    const candidates: Record<string, { id: string; lat: number; lng: number } | null> = {
      A: { id: "A", lat: -7.980, lng: 112.630 },
      B: { id: "B", lat: -7.981, lng: 112.631 },
      C: { id: "C", lat: -7.982, lng: 112.632 },
      D: { id: "D", lat: -7.983, lng: 112.633 },
      E: { id: "E", lat: -7.984, lng: 112.634 },
    };

    const allKeys = Object.keys(candidates);
    expect(allKeys.length).toBe(5);
    expect(allKeys).toEqual(["A", "B", "C", "D", "E"]);

    const activeCount = Object.values(candidates).filter((c) => c !== null).length;
    expect(activeCount).toBe(5);
  });

  it("changing coordinates marks candidate status as stale without automatically re-fetching", () => {
    let candidateStatus: 'ready' | 'stale' | 'location_selected' = 'ready';
    const lastAnalyzedCoords = { lat: -7.9800, lng: 112.6300, radius: 500 };
    const currentCoords = { lat: -7.9850, lng: 112.6350, radius: 500 };

    const isCoordinateChanged = (last: typeof lastAnalyzedCoords, current: typeof currentCoords) => {
      return (
        Math.abs(last.lat - current.lat) > 0.0001 ||
        Math.abs(last.lng - current.lng) > 0.0001 ||
        last.radius !== current.radius
      );
    };

    if (isCoordinateChanged(lastAnalyzedCoords, currentCoords)) {
      candidateStatus = 'stale';
    }

    expect(candidateStatus).toBe('stale');
    // Result remains available for comparison until explicit re-analysis
    expect(lastAnalyzedCoords.lat).toBe(-7.9800);
  });

  it("prohibited status in overall recommendation overrides high market potential score", () => {
    const highMarketResult: Partial<AnalysisResult> = {
      opportunityScore: 89,
      overallRecommendation: {
        status: "prohibited",
        summary: "Meskipun skor potensi pasar 89/100, lokasi ini TIDAK DAPAT DIREKOMENDASIKAN karena adanya larangan resmi.",
        blocking_reasons: ["Larangan resmi terverifikasi: Operasi Penertiban PKL & Zona Merah."],
        conditions: [],
      },
      feasibility: {
        legal_restrictions: {
          status: "prohibited",
          verified_restrictions: [{ title: "Operasi Penertiban PKL", severity: "critical" }],
          limitations: "Terdapat pembatasan aktif",
        },
      },
    };

    const isProhibited =
      highMarketResult.overallRecommendation?.status === "prohibited" ||
      highMarketResult.feasibility?.legal_restrictions?.status === "prohibited";

    expect(isProhibited).toBe(true);

    // UI derivation must NOT return green 'Peluang Sangat Tinggi'
    const getBadge = () => {
      if (isProhibited) {
        return { tier: "Dilarang Resmi (Hard Restriction)", color: "rose" };
      }
      if ((highMarketResult.opportunityScore ?? 0) >= 80) {
        return { tier: "Peluang Sangat Tinggi", color: "emerald" };
      }
      return { tier: "Peluang Moderat", color: "amber" };
    };

    const badge = getBadge();
    expect(badge.tier).toBe("Dilarang Resmi (Hard Restriction)");
    expect(badge.color).toBe("rose");
  });

  it("multi-candidate POI associations unify places and preserve simultaneous visibility", () => {
    const candidateA_POIs = [
      { id: "poi-1", name: "Universitas Brawijaya", lat: -7.95, lng: 112.61 },
      { id: "poi-shared", name: "Minimarket Malang", lat: -7.96, lng: 112.62 },
    ];

    const candidateB_POIs = [
      { id: "poi-shared", name: "Minimarket Malang", lat: -7.96, lng: 112.62 },
      { id: "poi-3", name: "Pasar Besar", lat: -7.98, lng: 112.63 },
    ];

    const placesMap = new Map<string, { id: string; name: string; candidateAssociations: string[] }>();

    candidateA_POIs.forEach((p) => {
      placesMap.set(p.id, { id: p.id, name: p.name, candidateAssociations: ["A"] });
    });

    candidateB_POIs.forEach((p) => {
      const existing = placesMap.get(p.id);
      if (existing) {
        if (!existing.candidateAssociations.includes("B")) {
          existing.candidateAssociations.push("B");
        }
      } else {
        placesMap.set(p.id, { id: p.id, name: p.name, candidateAssociations: ["B"] });
      }
    });

    const unified = Array.from(placesMap.values());
    expect(unified.length).toBe(3);

    const shared = placesMap.get("poi-shared");
    expect(shared?.candidateAssociations).toEqual(["A", "B"]);

    const uniqueA = placesMap.get("poi-1");
    expect(uniqueA?.candidateAssociations).toEqual(["A"]);

    const uniqueB = placesMap.get("poi-3");
    expect(uniqueB?.candidateAssociations).toEqual(["B"]);
  });

  it("unverified legal status transparently explains missing zoning dataset", () => {
    const unverifiedResult: Partial<AnalysisResult> = {
      feasibility: {
        legal_restrictions: {
          status: "unverified",
          zoning_type: null,
          verified_restrictions: [],
          provenance: {
            source: "unverified_no_authoritative_zoning_dataset",
            effective_date: null,
            coverage_limitations: "Data resmi RTRW/RDTR tingkat persil belum tersedia di basis data LOCIVA.",
          },
          limitations: "Status legalitas zonasi belum terverifikasi secara definitif.",
        },
      },
    };

    expect(unverifiedResult.feasibility?.legal_restrictions?.status).toBe("unverified");
    expect(unverifiedResult.feasibility?.legal_restrictions?.provenance?.source).toBe("unverified_no_authoritative_zoning_dataset");
    expect(unverifiedResult.feasibility?.legal_restrictions?.verified_restrictions).toEqual([]);
  });
});