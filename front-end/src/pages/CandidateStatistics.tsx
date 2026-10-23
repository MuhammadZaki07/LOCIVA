
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Compass,
  X,
  BarChart3,
  Radar as RadarIcon,
  Target,
  ChartNoAxesCombined,
} from "lucide-react";
import {
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

type ScoreValue = number | null;

type CandidateStatisticsState = {
  session: {
    name: string;
  };
  simulation: {
    id?: number | string;
    candidate_id?: number | string | null;
    target_market?: string | null;
    latitude: number | string;
    longitude: number | string;
    radius_m?: number | null;
    business_type?: {
      name?: string;
    } | null;
    score?: {
      total_score?: ScoreValue;
      target_market_score?: ScoreValue;
      competition_score?: ScoreValue;
      accessibility_score?: ScoreValue;
      population_score?: ScoreValue;
      pedestrian_score?: ScoreValue;
      area_compatibility_score?: ScoreValue;
    } | null;
  };
};

type Indicator = {
  name: string;
  fullName: string;
  value: number;
  color: string;
};

const INDICATOR_CONFIG = [
  {
    key: "target_market_score",
    name: "Peluang Pasar",
    fullName: "Peluang Pasar",
    color: "#10b981",
  },
  {
    key: "competition_score",
    name: "Persaingan",
    fullName: "Persaingan",
    color: "#f59e0b",
  },
  {
    key: "accessibility_score",
    name: "Aksesibilitas",
    fullName: "Aksesibilitas",
    color: "#6366f1",
  },
  {
    key: "population_score",
    name: "Populasi",
    fullName: "Populasi dan Demografi",
    color: "#0ea5e9",
  },
  {
    key: "pedestrian_score",
    name: "Pejalan Kaki",
    fullName: "Lalu Lintas Pejalan Kaki",
    color: "#8b5cf6",
  },
  {
    key: "area_compatibility_score",
    name: "Kesesuaian Zona",
    fullName: "Kesesuaian Zona",
    color: "#ec4899",
  },
] as const;

const isValidScore = (
  value: ScoreValue | undefined,
): value is number =>
  typeof value === "number" && Number.isFinite(value);

const formatScore = (value: number | null | undefined) =>
  isValidScore(value) ? value.toLocaleString("id-ID") : "N/A";

export default function CandidateStatistics() {
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state as CandidateStatisticsState | null;
  const session = state?.session;
  const simulation = state?.simulation;

  if (!session || !simulation) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-800">
            Data Statistik Tidak Ditemukan
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Silakan buka statistik melalui daftar simulasi di dashboard.
          </p>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-deep"
          >
            <ArrowLeft size={16} />
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    );
  }

  const candidateId =
    simulation.candidate_id ??
    (simulation.target_market
      ? simulation.target_market.replace("Candidate_", "")
      : "A");

  const radius =
    simulation.radius_m != null && simulation.radius_m > 0
      ? simulation.radius_m
      : 500;

  const score = simulation.score;
  const totalScore = score?.total_score;
  const hasTotalScore = isValidScore(totalScore);

  const latitude = Number(simulation.latitude);
  const longitude = Number(simulation.longitude);

  // Data indikator yang tersedia saja, tanpa mengubah nilai kosong menjadi nol.
  const indicators: Indicator[] = INDICATOR_CONFIG.flatMap((item) => {
    const value = score?.[item.key];

    if (!isValidScore(value)) {
      return [];
    }

    return [
      {
        name: item.name,
        fullName: item.fullName,
        value,
        color: item.color,
      },
    ];
  });

  const hasIndicatorData = indicators.length > 0;

  // Gauge menggunakan total skor dan sisa skala sampai 100.
  const gaugeData = hasTotalScore
    ? [
        {
          name: "Skor",
          value: Math.max(0, Math.min(100, totalScore)),
        },
        {
          name: "Sisa",
          value: 100 - Math.max(0, Math.min(100, totalScore)),
        },
      ]
    : [];

  const estimatedArea = (
    Math.PI * Math.pow(radius / 1000, 2)
  ).toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const handleOpenSimulationOnMap = () => {
    navigate("/view-maps", {
      state: {
        simulation,
        session,
      },
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              aria-label="Kembali ke dashboard"
              className="mt-1 rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm transition hover:bg-slate-100"
            >
              <ArrowLeft size={19} />
            </button>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
                  Statistik Kandidat {candidateId}
                </h1>

                <span className="inline-flex items-center rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700">
                  {simulation.business_type?.name || "Katalog UMKM"}
                </span>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Sesi: {session.name}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Analisis kelayakan dan indikator spasial lokasi usaha.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 sm:self-auto"
          >
            <X size={16} />
            Tutup Statistik
          </button>
        </div>

        {/* Status dan koordinat */}
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-500">
              Status Analisis:
            </span>

            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                hasTotalScore
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {hasTotalScore
                ? "Analisis Selesai (Terhitung)"
                : "Belum Dianalisis"}
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs text-slate-600">
            <MapPin size={15} className="shrink-0 text-primary" />
            <span>
              {Number.isFinite(latitude) ? latitude.toFixed(5) : "N/A"},{" "}
              {Number.isFinite(longitude) ? longitude.toFixed(5) : "N/A"}
            </span>
          </div>
        </div>

        {/* Kartu ringkasan */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Total Skor</span>
              <Target className="text-emerald-600" size={20} />
            </div>
            <div className="mt-3 text-3xl font-bold text-slate-900">
              {formatScore(totalScore)}
              <span className="ml-1 text-sm font-medium text-slate-400">
                / 100
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Skor kelayakan keseluruhan
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Peluang Pasar</span>
              <ChartNoAxesCombined className="text-emerald-600" size={20} />
            </div>
            <div className="mt-3 text-3xl font-bold text-emerald-600">
              {formatScore(score?.target_market_score)}
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Indikator segmen sasaran
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Aksesibilitas</span>
              <MapPin className="text-indigo-600" size={20} />
            </div>
            <div className="mt-3 text-3xl font-bold text-indigo-600">
              {formatScore(score?.accessibility_score)}
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Indikator akses lokasi
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Radius Layanan</span>
              <Compass className="text-sky-600" size={20} />
            </div>
            <div className="mt-3 text-3xl font-bold text-slate-900">
              {radius.toLocaleString("id-ID")}
              <span className="ml-1 text-sm font-medium text-slate-400">
                m
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Jangkauan layanan yang ditentukan
            </p>
          </div>
        </div>

        {/* Grafik skor total dan radar */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Gauge chart */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
                <Target size={20} />
              </div>
              <div>
                <h2 className="font-bold text-slate-800">
                  Skor Kelayakan
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Skala penilaian 0–100
                </p>
              </div>
            </div>

            {hasTotalScore ? (
              <>
                <div className="relative mt-3 h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={gaugeData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="55%"
                        startAngle={180}
                        endAngle={0}
                        innerRadius="72%"
                        outerRadius="95%"
                        paddingAngle={0}
                        stroke="none"
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#e2e8f0" />
                      </Pie>
                      <Tooltip
                        formatter={(value) => [`${value}`, "Skor"]}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="pointer-events-none absolute inset-x-0 top-[48%] flex -translate-y-1/2 flex-col items-center">
                    <span className="text-4xl font-bold tabular-nums text-slate-900">
                      {formatScore(totalScore)}
                    </span>
                    <span className="mt-1 text-xs text-slate-400">
                      dari 100
                    </span>
                  </div>
                </div>

                <p className="text-center text-xs leading-relaxed text-slate-500">
                  Menampilkan skor total yang dikembalikan oleh simulasi.
                  Kategori kelayakan mengikuti aturan LOCIVA.
                </p>
              </>
            ) : (
              <ChartEmptyState message="Skor total belum tersedia untuk simulasi ini." />
            )}
          </section>

          {/* Radar chart */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:col-span-2">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">
                <RadarIcon size={20} />
              </div>
              <div>
                <h2 className="font-bold text-slate-800">
                  Profil Kelayakan Spasial
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Perbandingan indikator yang tersedia pada simulasi.
                </p>
              </div>
            </div>

            {hasIndicatorData ? (
              <>
                <div className="mt-4 h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart
                      data={indicators}
                      outerRadius="72%"
                      margin={{ top: 12, right: 24, bottom: 12, left: 24 }}
                    >
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis
                        dataKey="name"
                        tick={{ fill: "#64748b", fontSize: 11 }}
                      />
                      <PolarRadiusAxis
                        angle={90}
                        domain={[0, 100]}
                        tick={{ fill: "#94a3b8", fontSize: 10 }}
                      />
                      <Radar
                        name="Skor indikator"
                        dataKey="value"
                        stroke="#6366f1"
                        fill="#818cf8"
                        fillOpacity={0.28}
                        strokeWidth={2}
                        dot={{ r: 3, fill: "#6366f1" }}
                      />
                      <Tooltip
                        formatter={(value) => [`${value}`, "Skor"]}
                        labelFormatter={(label) => String(label)}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                <p className="text-xs leading-relaxed text-slate-500">
                  Radar membantu melihat pola ant indikator. Interpretasi
                  skor persaingan harus mengikuti definisi penilaian LOCIVA.
                </p>
              </>
            ) : (
              <ChartEmptyState message="Belum ada skor indikator untuk ditampilkan." />
            )}
          </section>
        </div>

        {/* Bar chart indikator */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-sky-50 p-2.5 text-sky-600">
              <BarChart3 size={20} />
            </div>
            <div>
              <h2 className="font-bold text-slate-800">
                Perbandingan Skor Indikator
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Nilai setiap indikator ditampilkan dalam batang horizontal.
              </p>
            </div>
          </div>

          {hasIndicatorData ? (
            <>
              <div
                className="mt-5 w-full"
                style={{ height: Math.max(260, indicators.length * 58) }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={indicators}
                    layout="vertical"
                    margin={{ top: 8, right: 32, left: 12, bottom: 8 }}
                  >
                    <CartesianGrid
                      stroke="#e2e8f0"
                      strokeDasharray="3 3"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tick={{ fill: "#64748b", fontSize: 11 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={105}
                      tick={{ fill: "#475569", fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value) => [`${value}`, "Skor"]}
                      labelFormatter={(label) => String(label)}
                      cursor={{ fill: "#f1f5f9" }}
                    />
                    <Bar
                      dataKey="value"
                      name="Skor"
                      radius={[0, 6, 6, 0]}
                      maxBarSize={28}
                    >
                      {indicators.map((item) => (
                        <Cell key={item.name} fill={item.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {indicators.map((item) => (
                  <span
                    key={item.name}
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600"
                  >
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    {item.fullName}:{" "}
                    <strong className="text-slate-900">
                      {formatScore(item.value)}
                    </strong>
                  </span>
                ))}
              </div>
            </>
          ) : (
            <ChartEmptyState message="Data skor indikator belum tersedia. Grafik akan muncul setelah skor dikembalikan oleh simulasi." />
          )}
        </section>

        {/* Indikator spasial pendukung */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            Indikator Spasial Pendukung
          </h2>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <IndicatorCard
              label="Populasi & Demografi"
              value={score?.population_score}
              fallback="Data Regional"
            />
            <IndicatorCard
              label="Lalu Lintas Pejalan"
              value={score?.pedestrian_score}
              fallback="Terkorelasi POI"
            />
            <IndicatorCard
              label="Kesesuaian Zona"
              value={score?.area_compatibility_score}
              fallback="Data belum tersedia"
            />
          </div>
        </section>

        {/* Catchment area */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-sky-50 p-2.5 text-sky-600">
              <MapPin size={20} />
            </div>
            <div>
              <h2 className="font-bold text-slate-800">
                Informasi Catchment Area
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Estimasi jangkauan berbentuk lingkaran berdasarkan radius
                simulasi.
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <span className="text-sm text-slate-500">
                Radius Jangkauan Layanan
              </span>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {radius.toLocaleString("id-ID")} meter
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <span className="text-sm text-slate-500">
                Luas Estimasi Catchment Area
              </span>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {estimatedArea} km²
              </div>
            </div>
          </div>

          <p className="mt-4 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-400">
            Estimasi luas dihitung dengan rumus luas lingkaran, π × radius².
            Nilai ini bukan pengukuran luas wilayah terbangun atau batas
            administratif. Analisis penduduk, POI, dan pesaing memerlukan
            data spasial tambahan.
          </p>
        </section>

        {/* Footer */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="rounded-xl bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-300"
          >
            Kembali ke Dashboard
          </button>

          <button
            type="button"
            onClick={handleOpenSimulationOnMap}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-deep"
          >
            <Compass size={16} />
            Buka & Analisis di Maps
          </button>
        </div>
      </div>
    </div>
  );
}

function ChartEmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center px-5 text-center">
      <BarChart3 size={34} className="text-slate-300" />
      <p className="mt-3 max-w-sm text-sm text-slate-500">{message}</p>
    </div>
  );
}

function IndicatorCard({
  label,
  value,
  fallback,
}: {
  label: string;
  value: ScoreValue | undefined;
  fallback: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-4">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-bold tabular-nums text-slate-900">
        {isValidScore(value) ? formatScore(value) : fallback}
      </span>
    </div>
  );
}
