import { useLocation, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
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

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";

import { cn } from "@/lib/utils";

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

const isValidScore = (value: ScoreValue | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value);

const formatScore = (value: number | null | undefined) =>
  isValidScore(value) ? value.toLocaleString("id-ID") : "N/A";

const cardClass = "w-full max-w-none";

const iconContainerClass =
  "flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary";

export default function CandidateStatistics() {
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state as CandidateStatisticsState | null;
  const session = state?.session;
  const simulation = state?.simulation;

  if (!session || !simulation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f9fc] p-4 sm:p-8">
        <Card className="w-full max-w-md text-center">
          <CardContent className="flex flex-col items-center pt-2">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <BarChart3 size={26} />
            </div>

            <CardTitle className="mt-5">
              Data Statistik Tidak Ditemukan
            </CardTitle>

            <CardDescription className="mt-2">
              Silakan buka statistik melalui daftar simulasi di dashboard.
            </CardDescription>

            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-deep"
            >
              <ArrowLeft size={16} />
              Kembali ke Dashboard
            </button>
          </CardContent>
        </Card>
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

  // Hanya indikator dengan nilai valid yang ditampilkan.
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
  const gaugeValue = hasTotalScore ? Math.max(0, Math.min(100, totalScore)) : 0;

  const gaugeData = hasTotalScore
    ? [
        {
          name: "Skor",
          value: gaugeValue,
        },
        {
          name: "Sisa",
          value: 100 - gaugeValue,
        },
      ]
    : [];

  const estimatedArea = (Math.PI * Math.pow(radius / 1000, 2)).toLocaleString(
    "id-ID",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  );

  const handleOpenSimulationOnMap = () => {
    navigate("/view-maps", {
      state: {
        simulation,
        session,
      },
    });
  };

  return (
    <div className="min-h-screen bg-[#f8f9fc] text-ink">
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
        {/* HEADER */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              aria-label="Kembali ke dashboard"
              className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#ececf6] bg-white text-muted shadow-sm transition hover:bg-slate-50 hover:text-ink"
            >
              <ArrowLeft size={18} />
            </button>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
                  Statistik Kandidat {candidateId}
                </h1>

                <span className="inline-flex items-center rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
                  {simulation.business_type?.name || "Katalog UMKM"}
                </span>
              </div>

              <p className="mt-1 text-sm text-muted">Sesi: {session.name}</p>

              <p className="mt-1 text-xs text-muted">
                Analisis kelayakan dan indikator spasial lokasi usaha.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-[#ececf6] bg-white px-4 py-2.5 text-sm font-semibold text-muted shadow-sm transition hover:bg-slate-50 hover:text-ink sm:self-auto"
          >
            <X size={16} />
            Tutup Statistik
          </button>
        </div>

        {/* STATUS DAN KOORDINAT */}
        <Card className={cardClass}>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div className={iconContainerClass}>
                <Target size={19} />
              </div>

              <div>
                <p className="text-xs font-medium text-muted">
                  Status Analisis
                </p>

                <span
                  className={cn(
                    "mt-1 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
                    hasTotalScore
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700",
                  )}
                >
                  <span
                    className={cn(
                      "mr-2 size-1.5 rounded-full",
                      hasTotalScore ? "bg-emerald-500" : "bg-amber-500",
                    )}
                  />

                  {hasTotalScore ? "Analisis Selesai" : "Belum Dianalisis"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 font-mono text-xs text-muted">
              <MapPin size={15} className="shrink-0 text-primary" />

              <span>
                {Number.isFinite(latitude) ? latitude.toFixed(5) : "N/A"},{" "}
                {Number.isFinite(longitude) ? longitude.toFixed(5) : "N/A"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Total Skor"
            value={formatScore(totalScore)}
            suffix="/ 100"
            description="Skor kelayakan keseluruhan"
            icon={<Target size={20} />}
            iconColor="bg-emerald-50 text-emerald-600"
            valueColor="text-ink"
          />

          <SummaryCard
            label="Peluang Pasar"
            value={formatScore(score?.target_market_score)}
            description="Indikator segmen sasaran"
            icon={<ChartNoAxesCombined size={20} />}
            iconColor="bg-emerald-50 text-emerald-600"
            valueColor="text-emerald-600"
          />

          <SummaryCard
            label="Aksesibilitas"
            value={formatScore(score?.accessibility_score)}
            description="Indikator akses lokasi"
            icon={<MapPin size={20} />}
            iconColor="bg-indigo-50 text-indigo-600"
            valueColor="text-indigo-600"
          />

          <SummaryCard
            label="Radius Layanan"
            value={radius.toLocaleString("id-ID")}
            suffix="m"
            description="Jangkauan layanan yang ditentukan"
            icon={<Compass size={20} />}
            iconColor="bg-sky-50 text-sky-600"
            valueColor="text-ink"
          />
        </div>

        {/* GAUGE DAN RADAR CHART */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* GAUGE CHART */}
          <Card className={cardClass}>
            <SectionHeader
              icon={<Target size={19} />}
              title="Skor Kelayakan"
              description="Skala penilaian 0–100"
            />

            <CardContent>
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
                          <Cell fill="#eef0f6" />
                        </Pie>

                        <Tooltip formatter={(value) => [`${value}`, "Skor"]} />
                      </PieChart>
                    </ResponsiveContainer>

                    <div className="pointer-events-none absolute inset-x-0 top-[48%] flex -translate-y-1/2 flex-col items-center">
                      <span className="text-4xl font-bold tabular-nums text-ink">
                        {formatScore(totalScore)}
                      </span>

                      <span className="mt-1 text-xs text-muted">dari 100</span>
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-center text-xs leading-relaxed text-muted">
                      Menampilkan skor total yang dikembalikan oleh simulasi.
                      Kategori kelayakan mengikuti aturan LOCIVA.
                    </p>
                  </div>
                </>
              ) : (
                <ChartEmptyState message="Skor total belum tersedia untuk simulasi ini." />
              )}
            </CardContent>
          </Card>

          {/* RADAR CHART */}
          <Card className={cn(cardClass, "lg:col-span-2")}>
            <SectionHeader
              icon={<RadarIcon size={19} />}
              title="Profil Kelayakan Spasial"
              description="Perbandingan indikator yang tersedia pada simulasi."
            />

            <CardContent>
              {hasIndicatorData ? (
                <>
                  <div className="mt-3 h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart
                        data={indicators}
                        outerRadius="72%"
                        margin={{
                          top: 12,
                          right: 24,
                          bottom: 12,
                          left: 24,
                        }}
                      >
                        <PolarGrid stroke="#e9eaf2" />

                        <PolarAngleAxis
                          dataKey="name"
                          tick={{
                            fill: "#64748b",
                            fontSize: 11,
                          }}
                        />

                        <PolarRadiusAxis
                          angle={90}
                          domain={[0, 100]}
                          tick={{
                            fill: "#94a3b8",
                            fontSize: 10,
                          }}
                        />

                        <Radar
                          name="Skor indikator"
                          dataKey="value"
                          stroke="#6366f1"
                          fill="#818cf8"
                          fillOpacity={0.2}
                          strokeWidth={2}
                          dot={{
                            r: 3,
                            fill: "#6366f1",
                          }}
                        />

                        <Tooltip
                          formatter={(value) => [`${value}`, "Skor"]}
                          labelFormatter={(label) => String(label)}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs leading-relaxed text-muted">
                      Radar membantu melihat pola ant indikator. Interpretasi
                      skor persaingan harus mengikuti definisi penilaian LOCIVA.
                    </p>
                  </div>
                </>
              ) : (
                <ChartEmptyState message="Belum ada skor indikator untuk ditampilkan." />
              )}
            </CardContent>
          </Card>
        </div>

        {/* BAR CHART */}
        <Card className={cardClass}>
          <SectionHeader
            icon={<BarChart3 size={19} />}
            title="Perbandingan Skor Indikator"
            description="Nilai setiap indikator ditampilkan dalam batang horizontal."
          />

          <CardContent>
            {hasIndicatorData ? (
              <>
                <div
                  className="mt-3 w-full"
                  style={{
                    height: Math.max(260, indicators.length * 58),
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={indicators}
                      layout="vertical"
                      margin={{
                        top: 8,
                        right: 32,
                        left: 12,
                        bottom: 8,
                      }}
                    >
                      <CartesianGrid
                        stroke="#e9eaf2"
                        strokeDasharray="3 3"
                        horizontal={false}
                      />

                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        tick={{
                          fill: "#64748b",
                          fontSize: 11,
                        }}
                      />

                      <YAxis
                        type="category"
                        dataKey="name"
                        width={105}
                        tick={{
                          fill: "#475569",
                          fontSize: 11,
                        }}
                      />

                      <Tooltip
                        formatter={(value) => [`${value}`, "Skor"]}
                        labelFormatter={(label) => String(label)}
                        cursor={{
                          fill: "#f8f9fc",
                        }}
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

                <div className="mt-4 grid grid-cols-1 gap-2 border-t border-[#ececf6] pt-4 sm:grid-cols-2 lg:grid-cols-3">
                  {indicators.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-3"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{
                            backgroundColor: item.color,
                          }}
                        />

                        <span className="truncate text-xs text-muted">
                          {item.fullName}
                        </span>
                      </div>

                      <strong className="shrink-0 text-sm tabular-nums text-ink">
                        {formatScore(item.value)}
                      </strong>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <ChartEmptyState message="Data skor indikator belum tersedia. Grafik akan muncul setelah skor dikembalikan oleh simulasi." />
            )}
          </CardContent>
        </Card>

        {/* INDIKATOR SPASIAL */}
        <Card className={cardClass}>
          <SectionHeader
            icon={<Compass size={19} />}
            title="Indikator Spasial Pendukung"
            description="Informasi tambahan untuk mengevaluasi karakteristik lokasi."
          />

          <CardContent>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
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
          </CardContent>
        </Card>

        {/* CATCHMENT AREA */}
        <Card className={cardClass}>
          <SectionHeader
            icon={<MapPin size={19} />}
            title="Informasi Catchment Area"
            description="Estimasi jangkauan berdasarkan radius simulasi."
          />

          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-[#ececf6] bg-slate-50/70 p-5">
                <div className="flex items-center gap-2 text-muted">
                  <Compass size={17} />

                  <span className="text-xs font-medium">
                    Radius Jangkauan Layanan
                  </span>
                </div>

                <div className="mt-3 text-2xl font-bold tabular-nums text-ink">
                  {radius.toLocaleString("id-ID")}

                  <span className="ml-1 text-sm font-medium text-muted">
                    meter
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-[#ececf6] bg-slate-50/70 p-5">
                <div className="flex items-center gap-2 text-muted">
                  <Target size={17} />

                  <span className="text-xs font-medium">
                    Luas Estimasi Catchment Area
                  </span>
                </div>

                <div className="mt-3 text-2xl font-bold tabular-nums text-ink">
                  {estimatedArea}

                  <span className="ml-1 text-sm font-medium text-muted">
                    km²
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-slate-50 p-4">
              <p className="text-xs leading-relaxed text-muted">
                Estimasi luas dihitung dengan rumus luas lingkaran, π × radius².
                Nilai ini bukan pengukuran luas wilayah terbangun atau batas
                administratif. Analisis penduduk, POI, dan pesaing memerlukan
                data spasial tambahan.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* FOOTER ACTIONS */}
        <div className="flex flex-col-reverse gap-3 border-t border-[#ececf6] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#ececf6] bg-white px-5 py-3 text-sm font-semibold text-muted shadow-sm transition hover:bg-slate-50 hover:text-ink"
          >
            <ArrowLeft size={16} />
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

/* =====================================================
   REUSABLE COMPONENTS
===================================================== */

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <CardHeader className="mb-5 flex items-start gap-3">
      <div className={iconContainerClass}>{icon}</div>

      <div className="min-w-0">
        <CardTitle>{title}</CardTitle>

        <CardDescription>{description}</CardDescription>
      </div>
    </CardHeader>
  );
}

function SummaryCard({
  label,
  value,
  suffix,
  description,
  icon,
  iconColor,
  valueColor,
}: {
  label: string;
  value: string;
  suffix?: string;
  description: string;
  icon: ReactNode;
  iconColor: string;
  valueColor: string;
}) {
  return (
    <Card
      className={cn(
        cardClass,
        "transition duration-200 hover:-translate-y-0.5 hover:shadow-md",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-muted">{label}</span>

        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            iconColor,
          )}
        >
          {icon}
        </div>
      </div>

      <div className="mt-4 flex items-baseline gap-1.5">
        <span
          className={cn(
            "text-3xl font-bold tabular-nums tracking-tight",
            valueColor,
          )}
        >
          {value}
        </span>

        {suffix && (
          <span className="text-xs font-medium text-muted">{suffix}</span>
        )}
      </div>

      <p className="mt-2 text-xs text-muted">{description}</p>
    </Card>
  );
}

function ChartEmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center rounded-xl bg-slate-50/70 px-5 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-white text-slate-300 shadow-sm">
        <BarChart3 size={25} />
      </div>

      <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
        {message}
      </p>
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
  const valid = isValidScore(value);

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[#ececf6] bg-slate-50/60 p-4 transition hover:bg-slate-50">
      <div className="min-w-0">
        <span className="text-xs font-medium text-muted">{label}</span>
      </div>

      <span
        className={cn(
          "shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold tabular-nums",
          valid ? "bg-primary/10 text-primary" : "bg-slate-100 text-muted",
        )}
      >
        {valid ? formatScore(value) : fallback}
      </span>
    </div>
  );
}
