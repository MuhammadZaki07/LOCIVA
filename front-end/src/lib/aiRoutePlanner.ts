/**
 * AI Route Planner Client & Response Validator for LOCIVA Spot Jitu
 * Mengintegrasikan asisten AI (DeepSeek) untuk merencanakan rute pedagang keliling
 * berdasarkan preferensi bahasa alami dan memetakan hasilnya secara ketat ke lokasi
 * terverifikasi LOCIVA.
 *
 * Mendukung streaming (NDJSON) untuk mencegah HTTP 524 dari Cloudflare tunnel.
 */

import type { RouteWaypoint } from "./routing";
import api from "@/context/apiClient";

export const AI_CHAT_DEFAULT_URL =
  "https://breakfast-investigator-incoming-grant.trycloudflare.com/api/chat";
export const AI_CHAT_DEFAULT_MODEL = "erwan2/DeepSeek-R1-Distill-Qwen-1.5B";

export interface AiRouteCandidate {
  id: string | number;
  name: string;
  category?: string;
  lat: number;
  lng: number;
  address?: string;
  footfall_score?: number;
  is_user_business?: boolean;
}

export interface AiPlannedStop {
  id: string | number;
  name: string;
  category?: string;
  lat: number;
  lng: number;
  stopDurationMinutes: number;
}

export interface AiRouteRecommendation {
  routeName: string;
  explanation: string;
  waypoints: RouteWaypoint[];
  stops: AiPlannedStop[];
}

/**
 * Membersihkan format teks respons AI, menghilangkan tag <think>...</think>,
 * dan mengekstrak blok JSON.
 */
export function extractJsonFromAiResponse(rawText: string): string {
  if (!rawText || typeof rawText !== "string") {
    throw new Error("Respons dari AI kosong atau tidak valid.");
  }

  // 1. Buang tag <think>...</think> jika ada (DeepSeek R1 reasoning output)
  let cleaned = rawText.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  // 2. Jika dibungkus code block markdown ```json ... ``` atau ``` ... ```
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    cleaned = codeBlockMatch[1].trim();
  }

  // 3. Ambil substring antara kurung kurawal terluar pertama { dan terakhir }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  return cleaned;
}

/**
 * Validasi ketat dan pemetaan rekomendasi AI ke data lokasi terverifikasi LOCIVA.
 * Menjamin tidak ada koordinat palsu / fiktif yang masuk ke dalam sistem.
 */
export function validateAndMapAiResponse(
  rawContent: string,
  candidates: AiRouteCandidate[],
): AiRouteRecommendation {
  if (!candidates || candidates.length === 0) {
    throw new Error(
      "Tidak ada data lokasi atau titik mangkal terverifikasi yang tersedia untuk dianalisis AI.",
    );
  }

  const jsonStr = extractJsonFromAiResponse(rawContent);
  let parsed: any;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (err) {
    throw new Error(
      "Format rekomendasi AI tidak dapat diproses (bukan JSON valid). Silakan coba lagi.",
    );
  }

  const routeName =
    typeof parsed.route_name === "string" && parsed.route_name.trim()
      ? parsed.route_name.trim()
      : "Rekomendasi Rute Spot Jitu AI";

  const explanation =
    typeof parsed.explanation === "string" && parsed.explanation.trim()
      ? parsed.explanation.trim()
      : "Rute dirancang berdasarkan analisis titik keramaian dan preferensi operasional pedagang.";

  // Buat index pencarian cepat untuk kandidat terverifikasi
  const idMap = new Map<string, AiRouteCandidate>();
  const nameMap = new Map<string, AiRouteCandidate>();

  for (const c of candidates) {
    idMap.set(String(c.id).toLowerCase().trim(), c);
    nameMap.set(c.name.toLowerCase().trim(), c);
  }

  // Ekstrak daftar waypoint dari parsed data
  // Mendukung beberapa varian schema yang mungkin dikembalikan AI:
  // - waypoint_ids: [id1, id2, ...]
  // - recommended_waypoints: [{ id: ... }, ...]
  // - waypoints: [{ id: ... }, ...]
  // - stops: [...]
  let rawWaypoints: any[] = [];
  if (Array.isArray(parsed.waypoint_ids)) {
    rawWaypoints = parsed.waypoint_ids.map((id: any) =>
      typeof id === "object" ? id : { id },
    );
  } else if (Array.isArray(parsed.recommended_waypoints)) {
    rawWaypoints = parsed.recommended_waypoints;
  } else if (Array.isArray(parsed.waypoints)) {
    rawWaypoints = parsed.waypoints;
  } else if (Array.isArray(parsed.stops)) {
    rawWaypoints = parsed.stops;
  }

  const matchedStops: AiPlannedStop[] = [];
  const visitedIds = new Set<string>();

  for (const item of rawWaypoints) {
    const rawId = item.id !== undefined && item.id !== null ? String(item.id).toLowerCase().trim() : "";
    const rawName = typeof item.name === "string" ? item.name.toLowerCase().trim() : "";

    // Cari kandidat terverifikasi berdasarkan ID atau Nama
    let matchedCandidate: AiRouteCandidate | undefined;
    if (rawId && idMap.has(rawId)) {
      matchedCandidate = idMap.get(rawId);
    } else if (rawName && nameMap.has(rawName)) {
      matchedCandidate = nameMap.get(rawName);
    }

    if (matchedCandidate) {
      const matchKey = String(matchedCandidate.id).toLowerCase().trim();
      // Cegah duplikasi titik berturut-turut
      if (!visitedIds.has(matchKey)) {
        visitedIds.add(matchKey);

        const duration =
          typeof item.stop_duration_minutes === "number" &&
          item.stop_duration_minutes > 0
            ? Math.min(Math.max(item.stop_duration_minutes, 15), 180)
            : typeof item.stop_duration === "number" && item.stop_duration > 0
              ? Math.min(Math.max(item.stop_duration, 15), 180)
              : 45;

        matchedStops.push({
          id: matchedCandidate.id,
          name: matchedCandidate.name,
          category: matchedCandidate.category,
          // KOORDINAT MUTLAK BERASAL DARI KANDIDAT RESMI LOCIVA, BUKAN FABRIKASI AI
          lat: matchedCandidate.lat,
          lng: matchedCandidate.lng,
          stopDurationMinutes: duration,
        });
      }
    }

    // Maksimal 8 titik sesuai batasan LOCIVA
    if (matchedStops.length >= 8) {
      break;
    }
  }

  // Jika AI merekomendasikan kurang dari 2 titik valid, tolak dengan pesan jelas
  if (matchedStops.length < 2) {
    throw new Error(
      "AI tidak dapat mencocokkan minimal 2 lokasi terverifikasi LOCIVA dari rekomendasi yang dibuat. Mohon berikan instruksi rute yang lebih jelas atau dekat dengan titik mangkal Anda.",
    );
  }

  // Konversi ke struktur RouteWaypoint resmi LOCIVA
  const waypoints: RouteWaypoint[] = matchedStops.map((stop) => ({
    lat: stop.lat,
    lng: stop.lng,
    name: stop.name,
    stop_duration: stop.stopDurationMinutes,
  }));

  return {
    routeName,
    explanation,
    waypoints,
    stops: matchedStops,
  };
}

/**
 * Mengirim permintaan perencanaan rute ke Asisten AI DeepSeek melalui endpoint resmi
 */
export async function requestAiRoutePlan(
  userPrompt: string,
  candidates: AiRouteCandidate[],
  options?: {
    apiUrl?: string;
    model?: string;
    signal?: AbortSignal;
  },
): Promise<AiRouteRecommendation> {
  const apiUrl =
    options?.apiUrl ||
    (import.meta.env.VITE_AI_CHAT_URL as string) ||
    AI_CHAT_DEFAULT_URL;

  const model =
    options?.model ||
    (import.meta.env.VITE_AI_MODEL as string) ||
    AI_CHAT_DEFAULT_MODEL;

  if (!userPrompt || !userPrompt.trim()) {
    throw new Error("Mohon masukkan preferensi rute Anda.");
  }

  if (!candidates || candidates.length < 2) {
    throw new Error(
      "Dibutuhkan minimal 2 lokasi kandidat terverifikasi di area ini untuk merencanakan rute.",
    );
  }

  // Ringkas kandidat agar efisien terhadap token prompt
  const compactCandidates = candidates.slice(0, 15).map((c) => ({
    id: c.id,
    name: c.name,
    category: c.category || "poi",
    footfall_score: c.footfall_score ?? 80,
    lat: Number(c.lat.toFixed(5)),
    lng: Number(c.lng.toFixed(5)),
    is_start: c.is_user_business ? true : undefined,
  }));

  const systemMessage =
    "You are LOCIVA's AI Route Planning Assistant for mobile street vendors and food trucks in Indonesia. " +
    "Select and arrange the most optimal sequence of stops based ONLY on the provided verified LOCIVA candidate locations. " +
    "NEVER invent or modify coordinates or IDs. " +
    "Always output strictly valid JSON in Indonesian without markdown code fences:\n" +
    JSON.stringify({
      route_name: "Nama Rute yang Menarik",
      explanation: "Penjelasan ringkas alasan pemilihan urutan titik singgah dan waktu terbaik.",
      recommended_waypoints: [
        { id: "id_kandidat_1", stop_duration_minutes: 45 },
        { id: "id_kandidat_2", stop_duration_minutes: 60 }
      ]
    });

  const promptContent =
    `Permintaan Rute Pedagang: "${userPrompt.trim()}"\n\n` +
    `Daftar Titik Lokasi Resmi LOCIVA yang Tersedia:\n` +
    JSON.stringify(compactCandidates, null, 2);

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: systemMessage,
        },
        {
          role: "user",
          content: promptContent,
        },
      ],
      stream: false,
      think: false,
    }),
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(
      `Gagal menghubungi layanan AI (HTTP ${response.status}: ${response.statusText}).`,
    );
  }

  const data = await response.json();
  const rawContent = data?.message?.content || "";

  if (!rawContent) {
    throw new Error("AI tidak memberikan isi rekomendasi rute.");
  }

  return validateAndMapAiResponse(rawContent, candidates);
}

/**
 * Membuat system message AI untuk analisis area bisnis.
 * Dipakai oleh streaming dan non-streaming.
 */
export function buildAreaAnalysisSystemMessage(): string {
  return (
    "Kamu adalah LOCIVA AI Route Analyst, asisten analisis rute dan lokasi usaha keliling di Indonesia. " +
    "Pengguna akan memberikan daftar bisnis/POI terverifikasi di area tertentu. " +
    "Tugasmu: (1) Analisis potensi setiap lokasi secara ringkas, (2) Rekomendasikan urutan rute optimal, " +
    "(3) Berikan penjelasan singkat mengapa urutan tersebut efisien. " +
    "HANYA gunakan lokasi dari daftar yang diberikan, JANGAN mengarang lokasi baru. " +
    "Jawab dalam Bahasa Indonesia yang ringkas. " +
    "Di akhir analisis, tampilkan juga JSON rute rekomendasi (tanpa code block markdown):\n" +
    JSON.stringify({
      route_name: "Nama Rute",
      explanation: "Alasan singkat urutan rute",
      recommended_waypoints: [
        { id: "id_1", stop_duration_minutes: 45 },
        { id: "id_2", stop_duration_minutes: 60 },
      ],
    })
  );
}

/**
 * Membuat prompt user untuk analisis area bisnis.
 */
export function buildAreaAnalysisPrompt(
  businessContext: { name: string; category?: string } | null,
  candidates: AiRouteCandidate[],
  radiusM: number,
): string {
  const compactList = candidates.slice(0, 10).map((c) => ({
    id: c.id,
    name: c.name,
    category: c.category || "poi",
    score: c.footfall_score ?? 80,
  }));

  const contextLine = businessContext
    ? `Jenis usaha pengguna: ${businessContext.name} (${businessContext.category || "umum"}).`
    : "Jenis usaha belum ditentukan.";

  return (
    `${contextLine}\n` +
    `Radius analisis: ${radiusM}m.\n` +
    `${candidates.length} lokasi ditemukan di area ini:\n` +
    JSON.stringify(compactList, null, 2) +
    `\n\nAnalisis potensi area ini dan rekomendasikan rute optimal.`
  );
}

/**
 * Streaming AI request menggunakan NDJSON (newline-delimited JSON).
 * Mencegah Cloudflare 524 timeout dengan chunked transfer encoding.
 * Memanggil onToken setiap ada token baru dari AI.
 *
 * Referensi format: setiap baris adalah JSON object dengan field
 * message.content untuk token chunk.
 */
export async function streamAiAnalysis(
  systemMessage: string,
  userPrompt: string,
  options: {
    apiUrl?: string;
    model?: string;
    signal?: AbortSignal;
    onToken: (token: string, accumulated: string) => void;
    onDone?: (fullText: string) => void;
    onError?: (error: Error) => void;
  },
): Promise<string> {
  const apiUrl =
    options.apiUrl ||
    (import.meta.env.VITE_AI_CHAT_URL as string) ||
    AI_CHAT_DEFAULT_URL;

  const model =
    options.model ||
    (import.meta.env.VITE_AI_MODEL as string) ||
    AI_CHAT_DEFAULT_MODEL;

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userPrompt },
      ],
      stream: true,
      think: false,
      temperature: 0.3,
      num_ctx: 2048,
    }),
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(
      `Gagal menghubungi layanan AI (HTTP ${response.status}: ${response.statusText}).`,
    );
  }

  if (!response.body) {
    throw new Error("Streaming tidak didukung oleh browser ini.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Proses setiap baris NDJSON yang lengkap
      const lines = buffer.split("\n");
      // Sisakan baris terakhir yang mungkin belum lengkap
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
          const parsed = JSON.parse(trimmed);
          const token = parsed?.message?.content || "";
          if (token) {
            accumulated += token;
            options.onToken(token, accumulated);
          }

          // Cek apakah ini chunk terakhir (done: true)
          if (parsed?.done === true) {
            options.onDone?.(accumulated);
            return accumulated;
          }
        } catch {
          // Baris yang tidak valid JSON — skip
        }
      }
    }

    // Proses sisa buffer jika ada
    if (buffer.trim()) {
      try {
        const parsed = JSON.parse(buffer.trim());
        const token = parsed?.message?.content || "";
        if (token) {
          accumulated += token;
          options.onToken(token, accumulated);
        }
      } catch {
        // Abaikan sisa buffer yang tidak valid
      }
    }

    options.onDone?.(accumulated);
    return accumulated;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw err;
    }
    const error = err instanceof Error ? err : new Error(String(err));
    options.onError?.(error);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPREHENSIVE AREA ROUTE WORKFLOW TYPES & API CLIENT
// ─────────────────────────────────────────────────────────────────────────────

export interface AiRoutePoint {
  id: string | number;
  source: "business" | "internal_poi" | "osm_poi";
  name: string;
  category?: string;
  lat: number;
  lng: number;
  reason: string;
  stop_duration_minutes?: number;
}

export interface AiAnalysisFactor {
  factor: string;
  finding: string;
  impact_on_route: string;
}

export interface AiRouteMetrics {
  distance_meters: number | null;
  duration_seconds: number | null;
  distance_km?: number | null;
  duration_minutes?: number | null;
}

export interface AiAreaRouteResponse {
  route_name: string;
  selected_business: {
    id: string | number;
    name: string;
    business_type: string;
    lat?: number;
    lng?: number;
  };
  analysis_area: {
    center: {
      lat: number;
      lng: number;
    };
    radius_meters: number;
  };
  start_point: AiRoutePoint;
  recommended_waypoints: AiRoutePoint[];
  end_point: AiRoutePoint;
  explanation: string;
  analysis_factors: AiAnalysisFactor[];
  route_metrics: AiRouteMetrics;
  route_coordinates?: [number, number][]; // [lat, lng] array untuk Leaflet polyline
}

/**
 * Mengirim permintaan analisis area geografis dan pembuatan rute lengkap ke backend Laravel LOCIVA.
 */
export async function requestAreaRoutePlan(params: {
  business_id?: string | number;
  business_name?: string;
  business_type?: string;
  center: { lat: number; lng: number };
  radius_meters: number;
  external_places?: any[];
  prompt?: string;
  signal?: AbortSignal;
}): Promise<AiAreaRouteResponse> {
  const payload = {
    business_id: params.business_id ? String(params.business_id) : undefined,
    business_name: params.business_name,
    business_type: params.business_type,
    center: {
      lat: params.center.lat,
      lng: params.center.lng,
    },
    radius_meters: params.radius_meters,
    external_places: params.external_places && params.external_places.length > 0
      ? params.external_places.slice(0, 150).map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          lat: p.lat,
          lng: p.lng,
        }))
      : undefined,
    prompt: params.prompt?.trim() || undefined,
  };

  const res = await api.post("/vendor-routes/ai-plan", payload, {
    signal: params.signal,
    // AI route planning needs much longer timeout than the default 20s.
    // Backend is configured to wait up to 95s for the AI model; allow 120s
    // on the client side to accommodate network latency on top.
    timeout: 120_000,
  });

  if (!res.data?.success || !res.data?.data) {
    throw new Error(res.data?.message || "Gagal mendapatkan rekomendasi rute dari server.");
  }

  return res.data.data as AiAreaRouteResponse;
}

/**
 * Mengonversi AiAreaRouteResponse menjadi RouteWaypoint[] resmi LOCIVA
 * dalam urutan perjalanan yang runtut: [start_point, ...recommended_waypoints, end_point]
 */
export function convertAiAreaResponseToWaypoints(
  response: AiAreaRouteResponse,
): RouteWaypoint[] {
  const waypoints: RouteWaypoint[] = [];

  // 1. Titik Awal
  waypoints.push({
    lat: response.start_point.lat,
    lng: response.start_point.lng,
    name: response.start_point.name || "Titik Awal Rute",
    stop_duration: 0,
  });

  // 2. Titik Singgah Perantara
  if (Array.isArray(response.recommended_waypoints)) {
    for (let i = 0; i < response.recommended_waypoints.length; i++) {
      const wp = response.recommended_waypoints[i];
      waypoints.push({
        lat: wp.lat,
        lng: wp.lng,
        name: wp.name || `Pemberhentian ${i + 1}`,
        stop_duration: wp.stop_duration_minutes || 30,
      });
    }
  }

  // 3. Titik Akhir
  waypoints.push({
    lat: response.end_point.lat,
    lng: response.end_point.lng,
    name: response.end_point.name || "Titik Akhir Rute",
    stop_duration: 15,
  });

  return waypoints;
}

