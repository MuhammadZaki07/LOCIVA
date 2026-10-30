import { describe, it, expect } from "vitest";
import {
  extractJsonFromAiResponse,
  validateAndMapAiResponse,
  buildAreaAnalysisSystemMessage,
  buildAreaAnalysisPrompt,
  convertAiAreaResponseToWaypoints,
  type AiRouteCandidate,
  type AiAreaRouteResponse,
} from "../aiRoutePlanner";

describe("AI Route Planner", () => {
  const sampleCandidates: AiRouteCandidate[] = [
    {
      id: "user-base",
      name: "Pusat Gerobak Kuliner (Basecamp)",
      category: "user_business",
      lat: -7.9797,
      lng: 112.6304,
      footfall_score: 85,
      is_user_business: true,
    },
    {
      id: 101,
      name: "Universitas Brawijaya Kampus Utama",
      category: "university",
      lat: -7.9525,
      lng: 112.6142,
      footfall_score: 95,
    },
    {
      id: 102,
      name: "Stasiun Malang Kota Baru",
      category: "transit_station",
      lat: -7.9774,
      lng: 112.6371,
      footfall_score: 92,
    },
    {
      id: 103,
      name: "Pasar Besar Kota Malang",
      category: "market",
      lat: -7.9868,
      lng: 112.6315,
      footfall_score: 88,
    },
  ];

  it("extracts clean JSON from pure JSON string", () => {
    const raw = '{"route_name": "Rute Uji", "explanation": "Ok"}';
    const json = extractJsonFromAiResponse(raw);
    expect(json).toBe(raw);
  });

  it("extracts JSON from markdown code block", () => {
    const raw =
      'Tentu! Berikut rekomendasinya:\n```json\n{"route_name": "Rute Markdown", "explanation": "Bagus"}\n```\nSemoga laris!';
    const json = extractJsonFromAiResponse(raw);
    expect(json).toBe('{"route_name": "Rute Markdown", "explanation": "Bagus"}');
  });

  it("strips DeepSeek <think>...</think> reasoning tags", () => {
    const raw =
      '<think>\nMari kita analisis permintaan rute ini...\n</think>\n\n{"route_name": "Rute DeepSeek", "explanation": "Optimal"}';
    const json = extractJsonFromAiResponse(raw);
    expect(json).toBe('{"route_name": "Rute DeepSeek", "explanation": "Optimal"}');
  });

  it("validates and maps AI response to verified LOCIVA candidates", () => {
    const aiOutput = JSON.stringify({
      route_name: "Rute Mahasiswa & Komuter Sore",
      explanation:
        "Memulai dari basecamp lalu singgah di UB dan berakhir di Stasiun saat jam pulang kerja.",
      recommended_waypoints: [
        { id: "user-base", stop_duration_minutes: 30 },
        { id: 101, stop_duration_minutes: 60 },
        { id: 102, stop_duration_minutes: 45 },
      ],
    });

    const res = validateAndMapAiResponse(aiOutput, sampleCandidates);
    expect(res.routeName).toBe("Rute Mahasiswa & Komuter Sore");
    expect(res.waypoints.length).toBe(3);
    // Real verified coordinates, never fabricated
    expect(res.waypoints[0].lat).toBe(-7.9797);
    expect(res.waypoints[0].lng).toBe(112.6304);
    expect(res.waypoints[0].name).toBe("Pusat Gerobak Kuliner (Basecamp)");
    expect(res.waypoints[0].stop_duration).toBe(30);

    expect(res.waypoints[1].lat).toBe(-7.9525);
    expect(res.waypoints[1].lng).toBe(112.6142);
    expect(res.waypoints[1].name).toBe("Universitas Brawijaya Kampus Utama");
    expect(res.waypoints[1].stop_duration).toBe(60);

    expect(res.waypoints[2].lat).toBe(-7.9774);
    expect(res.waypoints[2].lng).toBe(112.6371);
    expect(res.waypoints[2].name).toBe("Stasiun Malang Kota Baru");
    expect(res.waypoints[2].stop_duration).toBe(45);
  });

  it("rejects hallucinated/fictitious candidate IDs", () => {
    const aiOutputWithHallucinations = JSON.stringify({
      route_name: "Rute Campuran",
      explanation: "Menambahkan tempat fiktif",
      recommended_waypoints: [
        { id: "user-base", stop_duration_minutes: 30 },
        { id: "fake-location-999", stop_duration_minutes: 60 },
        { id: 101, stop_duration_minutes: 60 },
        { id: "random-mall-xyz", stop_duration_minutes: 45 },
      ],
    });

    const res = validateAndMapAiResponse(aiOutputWithHallucinations, sampleCandidates);
    expect(res.waypoints.length).toBe(2);
    expect(res.waypoints[0].name).toBe("Pusat Gerobak Kuliner (Basecamp)");
    expect(res.waypoints[1].name).toBe("Universitas Brawijaya Kampus Utama");
  });

  it("falls back to official name matching if ID is omitted by AI", () => {
    const aiOutputNames = JSON.stringify({
      route_name: "Rute Berdasarkan Nama",
      explanation: "Menggunakan nama tempat",
      recommended_waypoints: [
        { name: "Universitas Brawijaya Kampus Utama", stop_duration_minutes: 50 },
        { name: "Pasar Besar Kota Malang", stop_duration_minutes: 40 },
      ],
    });

    const res = validateAndMapAiResponse(aiOutputNames, sampleCandidates);
    expect(res.waypoints.length).toBe(2);
    expect(res.waypoints[0].lat).toBe(-7.9525);
    expect(res.waypoints[1].lat).toBe(-7.9868);
  });

  it("rejects recommendation when verified points are under 2", () => {
    const aiOutputInsufficient = JSON.stringify({
      route_name: "Rute Kurang",
      explanation: "Hanya satu titik resmi",
      recommended_waypoints: [
        { id: "user-base" },
        { id: "fake-1" },
        { id: "fake-2" },
      ],
    });

    expect(() => {
      validateAndMapAiResponse(aiOutputInsufficient, sampleCandidates);
    }).toThrow(/minimal 2 lokasi terverifikasi/i);
  });

  it("produces RouteWaypoint objects conforming to LOCIVA schema", () => {
    const aiOutput = JSON.stringify({
      route_name: "Schema Check",
      explanation: "Check",
      waypoint_ids: ["user-base", 102],
    });

    const res = validateAndMapAiResponse(aiOutput, sampleCandidates);
    for (const wp of res.waypoints) {
      expect(typeof wp.lat).toBe("number");
      expect(typeof wp.lng).toBe("number");
      expect(typeof wp.name).toBe("string");
      expect(typeof wp.stop_duration).toBe("number");
      const keys = Object.keys(wp);
      expect(keys).toContain("lat");
      expect(keys).toContain("lng");
    }
  });

  it("generates valid area analysis system message", () => {
    const sysMsg = buildAreaAnalysisSystemMessage();
    expect(sysMsg).toContain("LOCIVA AI Route Analyst");
    expect(sysMsg).toContain("recommended_waypoints");
    expect(sysMsg).toContain("HANYA gunakan lokasi dari daftar");
  });

  it("generates structured prompt containing business context and radius", () => {
    const prompt = buildAreaAnalysisPrompt(
      { name: "Bakso Keliling", category: "kuliner" },
      sampleCandidates,
      2000,
    );
    expect(prompt).toContain("Bakso Keliling");
    expect(prompt).toContain("2000m");
    expect(prompt).toContain("Universitas Brawijaya Kampus Utama");
  });

  it("converts AiAreaRouteResponse to ordered RouteWaypoint array", () => {
    const areaResponse: AiAreaRouteResponse = {
      route_name: "Rute Kuliner Kampus",
      selected_business: {
        id: 1,
        name: "Bakso Cak Man",
        business_type: "Kuliner",
        lat: -7.952,
        lng: 112.614,
      },
      analysis_area: {
        center: { lat: -7.952, lng: 112.614 },
        radius_meters: 2000,
      },
      start_point: {
        id: "start-1",
        source: "business",
        name: "Gerai Bakso Cak Man",
        lat: -7.952,
        lng: 112.614,
        reason: "Titik pangkalan awal persiapan dagangan",
      },
      recommended_waypoints: [
        {
          id: "poi-1",
          source: "osm_poi",
          name: "Gerbang Utama UB",
          category: "university",
          lat: -7.955,
          lng: 112.616,
          stop_duration_minutes: 45,
          reason: "Ramai mahasiswa saat istirahat siang",
        },
        {
          id: "poi-2",
          source: "internal_poi",
          name: "Halte Dinoyo",
          category: "transit",
          lat: -7.958,
          lng: 112.611,
          stop_duration_minutes: 30,
          reason: "Titik transit komuter sore",
        },
      ],
      end_point: {
        id: "end-1",
        source: "osm_poi",
        name: "Taman Singha Merjosari",
        lat: -7.961,
        lng: 112.608,
        reason: "Pusat santai sore keluarga dan penutupan dagang",
      },
      explanation: "Rute dirancang menghubungkan pangkalan awal ke simpul keramaian.",
      analysis_factors: [
        {
          factor: "Pusat Pendidikan",
          finding: "Terdapat kampus besar UB",
          impact_on_route: "Dilewati saat jam makan siang",
        },
      ],
      route_metrics: {
        distance_meters: 3500,
        duration_seconds: 720,
        distance_km: 3.5,
        duration_minutes: 12,
      },
      route_coordinates: [
        [-7.952, 112.614],
        [-7.955, 112.616],
        [-7.958, 112.611],
        [-7.961, 112.608],
      ],
    };

    const waypoints = convertAiAreaResponseToWaypoints(areaResponse);
    expect(waypoints.length).toBe(4); // 1 start + 2 intermediate + 1 end

    // 1. Start point
    expect(waypoints[0].name).toBe("Gerai Bakso Cak Man");
    expect(waypoints[0].lat).toBe(-7.952);
    expect(waypoints[0].lng).toBe(112.614);
    expect(waypoints[0].stop_duration).toBe(0);

    // 2. Intermediate waypoints
    expect(waypoints[1].name).toBe("Gerbang Utama UB");
    expect(waypoints[1].lat).toBe(-7.955);
    expect(waypoints[1].lng).toBe(112.616);
    expect(waypoints[1].stop_duration).toBe(45);

    expect(waypoints[2].name).toBe("Halte Dinoyo");
    expect(waypoints[2].lat).toBe(-7.958);
    expect(waypoints[2].lng).toBe(112.611);
    expect(waypoints[2].stop_duration).toBe(30);

    // 3. End point
    expect(waypoints[3].name).toBe("Taman Singha Merjosari");
    expect(waypoints[3].lat).toBe(-7.961);
    expect(waypoints[3].lng).toBe(112.608);
    expect(waypoints[3].stop_duration).toBe(15);
  });
});
