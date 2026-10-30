/**
 * Rekomendasi bisnis untuk satu titik lokasi.
 *
 * Alur:
 *  1. Ambil semua tipe bisnis aktif dari katalog backend (/business-types).
 *  2. Skor tiap tipe lewat endpoint analisis yang sudah ada (/analysis/location),
 *     dengan radius standar tipe tersebut, maksimal MAX_CONCURRENCY paralel.
 *  3. Urutkan dengan fit score, ambil top 3. INI ditentukan algoritma, bukan LLM.
 *  4. Kirim top 3 ke /ai/recommend agar LLM kecil hanya menulis alasan.
 *     Kalau gagal / timeout, pakai alasan template lokal sehingga UI tetap jalan.
 */

import {
  Store,
  Coffee,
  Utensils,
  Shirt,
  Scissors,
  ShoppingCart,
} from "lucide-react";
import api from "@/context/apiClient";
import type {
  BusinessType,
  BusinessCategory,
  BusinessScale,
} from "@/lib/umkmCatalog";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApiBusinessType {
  id: string;
  name: string;
  slug: string;
  category: string;
  scale: string | null;
  icon: string | null;
  description: string | null;
  default_radius_m: number;
  min_radius_m: number | null;
  max_radius_m: number | null;
  target_demographics: { category: string; weight: number }[] | null;
  competitor_categories: string[] | null;
  is_active?: boolean;
}

export interface RecommendationFactor {
  key: string;
  label: string;
  impact: "positive" | "negative" | "neutral";
  note: string;
}

export interface RecommendationItem {
  business: BusinessType;
  radius: number;
  fitScore: number;
  opportunity: number;
  competition: number;
  accessibility: number;
  dataConfidence: number;
  competitorCount: number;
  nearestCompetitor: { name: string; distance: number } | null;
  reportCount: number;
  factors: RecommendationFactor[];
  reason: string;
  reasonSource: "ai" | "fallback";
}

export interface RecommendationResult {
  lat: number;
  lng: number;
  items: RecommendationItem[];
  evaluated: number;
  aiUsed: boolean;
  createdAt: number;
}

export class UnsupportedLocationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedLocationError";
  }
}

// ─── Konstanta ────────────────────────────────────────────────────────────────

const MAX_TYPES = 24;
const MAX_CONCURRENCY = 4;
const TOP_N = 3;
const CACHE_TTL_MS = 5 * 60 * 1000;
const AI_TIMEOUT_MS = 50_000_000_000;

const ICON_MAP: Record<string, BusinessType["icon"]> = {
  Coffee,
  Utensils,
  Shirt,
  Scissors,
  Store,
  ShoppingCart,
} as Record<string, BusinessType["icon"]>;

// ─── Katalog ──────────────────────────────────────────────────────────────────

let catalogPromise: Promise<ApiBusinessType[]> | null = null;

async function loadCatalog(signal?: AbortSignal): Promise<ApiBusinessType[]> {
  if (!catalogPromise) {
    catalogPromise = api
      .get("/business-types", { params: { per_page: 60 }, signal })
      .then((res) => {
        const payload = res.data?.data;
        const list: ApiBusinessType[] = Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload)
            ? payload
            : [];
        return list.filter((t) => t.is_active !== false).slice(0, MAX_TYPES);
      })
      .catch((err) => {
        catalogPromise = null; // jangan cache kegagalan
        throw err;
      });
  }
  return catalogPromise;
}

function toBusinessType(item: ApiBusinessType): BusinessType {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    category: (item.category as BusinessCategory) || "Makanan & Minuman",
    scale: (item.scale as BusinessScale) || "warung",
    description: item.description || "",
    icon: (item.icon && ICON_MAP[item.icon]) || (Store as BusinessType["icon"]),
    defaultRadius: item.default_radius_m || 500,
    minRadius: item.min_radius_m || 100,
    maxRadius: item.max_radius_m || 2000,
    targetDemographics: item.target_demographics || [
      { category: "commercial", weight: 15 },
      { category: "residential", weight: 15 },
    ],
    competitorCategories: item.competitor_categories || [
      "fast_food",
      "restaurant",
      "cafe",
    ],
  };
}

// ─── Skoring ──────────────────────────────────────────────────────────────────

/**
 * Peluang 50%, (100 - persaingan) 25%, aksesibilitas 25%.
 * Dikalikan faktor kepercayaan data (0.85 - 1.00) supaya titik dengan data
 * tipis tidak menang hanya karena skornya kebetulan tinggi.
 */
export function computeFitScore(
  opportunity: number,
  competition: number,
  accessibility: number,
  dataConfidence: number,
): number {
  const base =
    0.5 * opportunity + 0.25 * (100 - competition) + 0.25 * accessibility;
  const confidenceFactor = 0.85 + 0.15 * (Math.max(0, dataConfidence) / 100);
  return Math.round(Math.min(100, Math.max(0, base * confidenceFactor)));
}

interface RawAnalysis {
  opportunity_score: number | null;
  competition_score: number | null;
  accessibility_score: number | null;
  data_confidence?: number;
  competitor_count?: number;
  nearest_competitor?: { name: string; distance: number } | null;
  report_count?: number;
  factors?: { key?: string; label?: string; impact?: string; note?: string }[];
  overall_recommendation?: { status?: string } | null;
  is_valid_location?: boolean;
  is_water_or_offshore?: boolean;
  unsupported_reason?: string;
}

async function scoreOne(
  type: ApiBusinessType,
  lat: number,
  lng: number,
  signal: AbortSignal,
): Promise<Omit<RecommendationItem, "reason" | "reasonSource"> | null> {
  const radius = type.default_radius_m || 500;

  const res = await api.post(
    "/analysis/location",
    {
      lat,
      lng,
      radius,
      business_type: type.slug || type.id,
      candidate_id: `rec-${type.slug || type.id}`,
      preview: true, // backend: jangan simpan snapshot untuk perbandingan massal
    },
    { signal },
  );

  const data: RawAnalysis | undefined = res.data?.data;
  if (!data) return null;

  if (data.is_water_or_offshore || data.is_valid_location === false) {
    throw new UnsupportedLocationError(
      data.unsupported_reason ||
        "Titik berada di perairan atau area non-layanan.",
    );
  }

  const { opportunity_score: o, competition_score: c, accessibility_score: a } =
    data;
  if (o == null || c == null || a == null) return null;
  if (data.overall_recommendation?.status === "unsuitable") return null;

  const confidence = data.data_confidence ?? 0;

  return {
    business: toBusinessType(type),
    radius,
    fitScore: computeFitScore(o, c, a, confidence),
    opportunity: o,
    competition: c,
    accessibility: a,
    dataConfidence: confidence,
    competitorCount: data.competitor_count ?? 0,
    nearestCompetitor: data.nearest_competitor ?? null,
    reportCount: data.report_count ?? 0,
    factors: (data.factors ?? []).slice(0, 8).map((f) => ({
      key: String(f.key ?? ""),
      label: String(f.label ?? ""),
      impact: (f.impact as RecommendationFactor["impact"]) || "neutral",
      note: String(f.note ?? ""),
    })),
  };
}

/** Worker pool sederhana: jalankan `fn` ke semua item, paralel terbatas. */
async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
  onEach?: () => void,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const idx = cursor++;
      try {
        results[idx] = { status: "fulfilled", value: await fn(items[idx]) };
      } catch (reason) {
        results[idx] = { status: "rejected", reason };
      }
      onEach?.();
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return results;
}

// ─── Alasan: AI + fallback ────────────────────────────────────────────────────

export function buildFallbackReason(
  i: Pick<
    RecommendationItem,
    | "opportunity"
    | "accessibility"
    | "competitorCount"
    | "reportCount"
    | "radius"
  >,
): string {
  const competitors =
    i.competitorCount === 0
      ? "belum ada pesaing sejenis"
      : `${i.competitorCount} pesaing sejenis`;
  const access =
    i.accessibility >= 70
      ? "Aksesibilitas baik."
      : i.accessibility < 50
        ? "Aksesibilitas masih rendah."
        : "Aksesibilitas sedang.";
  const reports =
    i.reportCount > 0
      ? ` Ada ${i.reportCount} laporan infrastruktur aktif di sekitar titik ini.`
      : "";
  return `Potensi pasar ${i.opportunity}/100, dengan ${competitors} dalam radius ${i.radius} m. ${access}${reports}`;
}

async function fetchAiReasons(
  lat: number,
  lng: number,
  items: Omit<RecommendationItem, "reason" | "reasonSource">[],
  signal: AbortSignal,
): Promise<(string | null)[] | null> {
  try {
    const res = await api.post(
      "/ai/recommend",
      {
        lat,
        lng,
        items: items.map((i) => ({
          name: i.business.name,
          category: i.business.category,
          radius: i.radius,
          fit_score: i.fitScore,
          opportunity: i.opportunity,
          competition: i.competition,
          accessibility: i.accessibility,
          data_confidence: i.dataConfidence,
          competitor_count: i.competitorCount,
          nearest_competitor: i.nearestCompetitor,
          report_count: i.reportCount,
          factors: i.factors.map((f) => ({
            label: f.label,
            impact: f.impact,
            note: f.note,
          })),
        })),
      },
      { signal, timeout: AI_TIMEOUT_MS },
    );

    const reasons = res.data?.data?.reasons;
    if (res.data?.data?.source !== "ai" || !Array.isArray(reasons)) return null;
    return reasons.map((r: unknown) =>
      typeof r === "string" && r.trim() ? r.trim() : null,
    );
  } catch (err) {
    if (signal.aborted) throw err;
    return null; // AI mati / timeout: pakai template
  }
}

// ─── Orkestrator ──────────────────────────────────────────────────────────────

const resultCache = new Map<string, RecommendationResult>();

export async function recommendBusinesses(opts: {
  lat: number;
  lng: number;
  signal: AbortSignal;
  onProgress?: (done: number, total: number) => void;
}): Promise<RecommendationResult> {
  const { lat, lng, signal, onProgress } = opts;

  const cacheKey = `${lat.toFixed(4)}:${lng.toFixed(4)}`;
  const cached = resultCache.get(cacheKey);
  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) return cached;

  const catalog = await loadCatalog(signal);
  if (catalog.length === 0) {
    throw new Error("Katalog jenis usaha kosong atau tidak dapat dimuat.");
  }

  let done = 0;
  onProgress?.(0, catalog.length);

  const settled = await mapPool(
    catalog,
    MAX_CONCURRENCY,
    (t) => scoreOne(t, lat, lng, signal),
    () => onProgress?.(++done, catalog.length),
  );

  // Titik tidak valid (laut) → hentikan dengan pesan yang jelas
  const unsupported = settled.find(
    (s) =>
      s.status === "rejected" && s.reason instanceof UnsupportedLocationError,
  );
  if (unsupported && unsupported.status === "rejected") {
    throw unsupported.reason;
  }

  if (signal.aborted) throw new DOMException("Aborted", "AbortError");

  const scored = settled
    .filter(
      (s): s is PromiseFulfilledResult<NonNullable<Awaited<ReturnType<typeof scoreOne>>>> =>
        s.status === "fulfilled" && s.value !== null,
    )
    .map((s) => s.value)
    .sort((a, b) => b.fitScore - a.fitScore);

  if (scored.length === 0) {
    throw new Error(
      "Tidak ada jenis usaha yang dapat dianalisis di titik ini. Coba geser titik atau ulangi beberapa saat lagi.",
    );
  }

  const top = scored.slice(0, TOP_N);
  const aiReasons = await fetchAiReasons(lat, lng, top, signal);

  const items: RecommendationItem[] = top.map((t, idx) => {
    const ai = aiReasons?.[idx] ?? null;
    return {
      ...t,
      reason: ai ?? buildFallbackReason(t),
      reasonSource: ai ? "ai" : "fallback",
    };
  });

  const result: RecommendationResult = {
    lat,
    lng,
    items,
    evaluated: scored.length,
    aiUsed: items.some((i) => i.reasonSource === "ai"),
    createdAt: Date.now(),
  };

  resultCache.set(cacheKey, result);
  return result;
}