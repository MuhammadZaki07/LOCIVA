import { useState } from "react";
import {
  AlertTriangle,
  Coffee,
  
  Droplets,
  GraduationCap,
  Lightbulb,
  
  
  Scissors,
  ShoppingBag,
  Store,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { useCountUp } from "../../hooks/useCountUp";
import { scoreCopy, scoreTone, type BusinessId } from "../../data/mock";

export type MapVariant = "hero" | "simulation" | "civic" | "layers" | "problem";

export type LayerKey = "geo" | "population" | "poi" | "business" | "access" | "reports";

interface Props {
  variant?: MapVariant;
  score?: number;
  showScore?: boolean;
  catchment?: boolean;
  catchmentRadiusMeters?: number;
  layers?: LayerKey[];
  selectedLabel?: string;
  businessType?: BusinessId;
  className?: string;
  compact?: boolean;
  onSelectMarker?: (id: string) => void;
}

interface MarkerData {
  id: string;
  x: number;
  y: number;
  label: string;
  type: "selected" | "competitor" | "poi" | "report";
  category?: "road" | "flood" | "waste" | "light";
  color?: string;
  detail: string;
}

const defaultBuildings = [
  { x: 26, y: 22, w: 54, h: 40, label: "commercial block" },
  { x: 92, y: 16, w: 76, h: 48, label: "office suites" },
  { x: 180, y: 24, w: 46, h: 36, label: "retail row" },
  { x: 242, y: 18, w: 90, h: 54, label: "plaza north" },
  { x: 346, y: 22, w: 54, h: 42, label: "medical center" },
  { x: 412, y: 18, w: 56, h: 48, label: "residence a" },

  { x: 24, y: 92, w: 68, h: 52, label: "market arcade" },
  { x: 110, y: 98, w: 52, h: 38, label: "studios" },
  { x: 178, y: 92, w: 96, h: 60, label: "central plaza" },
  { x: 292, y: 96, w: 62, h: 44, label: "tech hub" },
  { x: 368, y: 90, w: 96, h: 62, label: "campus north" },

  { x: 22, y: 178, w: 82, h: 56, label: "mixed retail" },
  { x: 122, y: 184, w: 58, h: 42, label: "residential b" },
  { x: 198, y: 172, w: 74, h: 66, label: "trade building" },
  { x: 288, y: 180, w: 98, h: 50, label: "student dorms" },
  { x: 400, y: 174, w: 66, h: 58, label: "campus science" },

  { x: 30, y: 262, w: 54, h: 46, label: "residential c" },
  { x: 104, y: 254, w: 92, h: 60, label: "civic center" },
  { x: 212, y: 264, w: 66, h: 42, label: "craft market" },
  { x: 294, y: 250, w: 78, h: 56, label: "sports hall" },
  { x: 386, y: 258, w: 82, h: 48, label: "residential d" },
];

export function MapPreview({
  variant = "hero",
  score = 74,
  showScore = variant === "hero" || variant === "simulation",
  catchment = variant !== "civic",
  catchmentRadiusMeters = 400,
  layers = ["geo", "poi", "business", "reports"],
  selectedLabel = "selected location",
  businessType = "cafe",
  className = "",
  compact = false,
}: Props) {
  const displayScore = useCountUp(score);
  const tone = scoreTone(score);
  const [activeTooltip, setActiveTooltip] = useState<MarkerData | null>(null);
  const [zoomLevel] = useState(1);

  const showPopulation = layers.includes("population");
  const showAccess = layers.includes("access");
  const showPoi = layers.includes("poi") || layers.includes("business");
  const showReports =
    layers.includes("reports") ||
    variant === "civic" ||
    variant === "hero" ||
    variant === "simulation";

  // Markers dynamically configured per variant
  const heroMarkers: MarkerData[] = [
    {
      id: "selected",
      x: 50,
      y: 48,
      label: selectedLabel,
      type: "selected",
      detail: "Selected location · 400m catchment boundary active",
    },
    {
      id: "cafe-nearby",
      x: 18,
      y: 22,
      label: "cafe",
      type: "poi",
      detail: "Neighborhood coffee bar with steady morning walk-ins",
    },
    {
      id: "competitor-1",
      x: 74,
      y: 18,
      label: "competitor",
      type: "competitor",
      detail: "Direct F&B competitor · 320m distance away",
    },
    {
      id: "campus-poi",
      x: 82,
      y: 68,
      label: "campus",
      type: "poi",
      detail: "University south gate · 14,000 student body flow",
    },
    {
      id: "road-issue",
      x: 24,
      y: 74,
      label: "road issue",
      type: "report",
      category: "road",
      color: "#c45b4a",
      detail: "Pedestrian walkway defect reported by 14 community members",
    },
  ];

  const civicMarkers: MarkerData[] = [
    {
      id: "c-road",
      x: 24,
      y: 74,
      label: "road damage",
      type: "report",
      category: "road",
      color: "#c45b4a",
      detail: "Crack at pedestrian zebra crossing · 14 confirmations",
    },
    {
      id: "c-flood",
      x: 68,
      y: 30,
      label: "flooding",
      type: "report",
      category: "flood",
      color: "#d17a32",
      detail: "Standing rainwater after rain · 23 confirmations",
    },
    {
      id: "c-waste",
      x: 42,
      y: 18,
      label: "waste",
      type: "report",
      category: "waste",
      color: "#c4922a",
      detail: "Commercial bin overflow · 8 confirmations",
    },
    {
      id: "c-light",
      x: 82,
      y: 70,
      label: "street light",
      type: "report",
      category: "light",
      color: "#3d6fd8",
      detail: "Broken lamppost creates dark zone · 19 confirmations",
    },
  ];

  const markers: MarkerData[] =
    variant === "civic"
      ? civicMarkers
      : heroMarkers.filter((m) => {
          if (m.type === "report") return showReports;
          if (m.type === "competitor" || m.type === "poi") return showPoi;
          return true;
        });

  function getBusinessIcon() {
    switch (businessType) {
      case "food-cart":
        return <UtensilsCrossed size={12} className="text-white" />;
      case "barber":
        return <Scissors size={12} className="text-white" />;
      case "fashion-store":
        return <ShoppingBag size={12} className="text-white" />;
      case "retail":
        return <Store size={12} className="text-white" />;
      case "cafe":
      default:
        return <Coffee size={12} className="text-white" />;
    }
  }

  function getReportIcon(cat?: string) {
    switch (cat) {
      case "flood":
        return <Droplets size={11} className="text-white" />;
      case "waste":
        return <Trash2 size={11} className="text-white" />;
      case "light":
        return <Lightbulb size={11} className="text-white" />;
      case "road":
      default:
        return <AlertTriangle size={11} className="text-white" />;
    }
  }

  return (
    <div className={`clay relative overflow-hidden rounded-[16px] ${className}`}>
      {/* Top Map Chrome / Bar */}
      <div className="flex items-center justify-between border-b border-[#ececf6] bg-white/70 px-3.5 py-2.5 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          <p className="text-[12px] font-medium tracking-tight text-ink">lociva map</p>
          <span className="hidden rounded-[6px] bg-primary-soft px-1.5 py-0.5 text-[10px] text-primary sm:inline-block">
            {variant === "civic"
              ? "civic intelligence layer"
              : variant === "layers"
                ? "data signals active"
                : "simulation view"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted">
          <span>demo district · {catchmentRadiusMeters}m catchment</span>
        </div>
      </div>

      {/* Map Canvas / SVG */}
      <div
        className={`relative select-none bg-[#eef0f7] ${
          compact ? "h-[250px] sm:h-[280px]" : "h-[330px] sm:h-[390px] lg:h-[420px]"
        }`}
        style={{
          transform: `scale(${zoomLevel})`,
          transformOrigin: "center center",
          transition: "transform 250ms ease",
        }}
      >
        <svg
          viewBox="0 0 480 340"
          className="h-full w-full"
          aria-hidden="true"
          preserveAspectRatio="xMidYMid slice"
        >
          {/* Base Terrain Background */}
          <rect width="480" height="340" fill="#eef0f7" />

          {/* Green Park Areas */}
          <rect x="290" y="34" width="124" height="74" rx="12" fill="#d9ebd8" />
          <circle cx="310" cy="52" r="5" fill="#bedbc1" />
          <circle cx="335" cy="62" r="6" fill="#bedbc1" />
          <circle cx="380" cy="48" r="4.5" fill="#bedbc1" />
          <text x="325" y="85" fill="#587a60" fontSize="8" fontFamily="Inter" opacity="0.8">
            Citra City Park
          </text>

          <rect x="26" y="214" width="94" height="60" rx="10" fill="#d9ebd8" />
          <circle cx="45" cy="235" r="5" fill="#bedbc1" />
          <circle cx="78" cy="242" r="5.5" fill="#bedbc1" />

          {/* Water canal corridor */}
          <path
            d="M 440 0 C 420 80, 460 220, 430 340"
            fill="none"
            stroke="#d4e4f7"
            strokeWidth="16"
            strokeLinecap="round"
          />

          {/* Population Heat Layer (when active) */}
          {showPopulation && (
            <g opacity="0.22">
              <circle cx="240" cy="168" r="130" fill="#5b5bd6" />
              <circle cx="240" cy="168" r="80" fill="#5b5bd6" />
              <circle cx="390" cy="220" r="70" fill="#5b5bd6" />
            </g>
          )}

          {/* Major Urban Road Network */}
          <g stroke="#ffffff" strokeWidth="15" fill="none" strokeLinecap="square">
            {/* Primary East-West Arterial */}
            <path d="M0 78 H480" />
            <path d="M0 160 H480" />
            <path d="M0 242 H480" />
            {/* North-South Avenues */}
            <path d="M72 0 V340" />
            <path d="M166 0 V340" />
            <path d="M266 0 V340" />
            <path d="M374 0 V340" />
          </g>

          {/* Road Borders */}
          <g stroke="#dde0ec" strokeWidth="1.2" fill="none">
            <path d="M0 78 H480" />
            <path d="M0 160 H480" />
            <path d="M0 242 H480" />
            <path d="M72 0 V340" />
            <path d="M166 0 V340" />
            <path d="M266 0 V340" />
            <path d="M374 0 V340" />
          </g>

          {/* Main Avenue Center Dashed Lane Divider */}
          <path
            d="M0 160 H480"
            fill="none"
            stroke="#cbd0e3"
            strokeWidth="1"
            strokeDasharray="6 8"
          />

          {/* Street Labels */}
          <text x="14" y="154" fill="#888c9f" fontSize="7.5" fontFamily="Inter" fontWeight="500">
            Jl. Sudirman (Primary Corridor)
          </text>
          <text x="180" y="74" fill="#888c9f" fontSize="7" fontFamily="Inter">
            North Arterial
          </text>
          <text x="272" y="238" fill="#888c9f" fontSize="7" fontFamily="Inter">
            South Campus Avenue
          </text>

          {/* Zebra Pedestrian Crossings */}
          <g stroke="#cbd0e3" strokeWidth="1.5" strokeDasharray="3 3">
            <path d="M166 68 V88" />
            <path d="M266 150 V170" />
            <path d="M374 150 V170" />
            <path d="M166 232 V252" />
          </g>

          {/* Building Parcels */}
          {defaultBuildings.map((b, i) => (
            <rect
              key={i}
              x={b.x}
              y={b.y}
              width={b.w}
              height={b.h}
              rx="6"
              fill="#d9dceb"
              stroke="#ffffff"
              strokeWidth="1.3"
            />
          ))}

          {/* Accessibility Transit Path Layer */}
          {showAccess && (
            <path
              d="M0 160 H166 V242 H374"
              fill="none"
              stroke="#5b5bd6"
              strokeWidth="3.5"
              strokeDasharray="6 6"
              opacity="0.65"
            />
          )}

          {/* Catchment Radius Buffer */}
          {catchment && (
            <g>
              <circle
                cx="240"
                cy="164"
                r="78"
                fill="rgba(91, 91, 214, 0.08)"
                stroke="#5b5bd6"
                strokeWidth="1.5"
                strokeDasharray="5 5"
              />
              <circle cx="240" cy="164" r="3.5" fill="#5b5bd6" />
              {/* Radius Distance Tag in SVG */}
              <rect
                x="250"
                y="154"
                width="84"
                height="16"
                rx="4"
                fill="#ffffff"
                opacity="0.92"
                stroke="#d4d7e8"
                strokeWidth="0.8"
              />
              <text x="255" y="165" fill="#4747b8" fontSize="7.5" fontFamily="Inter" fontWeight="500">
                400m catchment buffer
              </text>
            </g>
          )}
        </svg>


        {/* Problem Section Layer Legend */}
        {variant === "problem" && (
          <div className="absolute left-3 top-3 z-20 flex max-w-[50%] flex-col gap-1.5">
            <div className="clay rounded-[10px] bg-white/95 p-2 shadow-sm">
              <p className="text-[11px] font-medium text-ink">multi-layer signal inspection</p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                <span className="rounded-[6px] bg-primary-soft px-1.5 py-0.5 text-[10px] text-primary">
                  foot traffic: high
                </span>
                <span className="rounded-[6px] bg-[#fbf0ee] px-1.5 py-0.5 text-[10px] text-warning">
                  access bottleneck: detected
                </span>
                <span className="rounded-[6px] bg-[#fff8e7] px-1.5 py-0.5 text-[10px] text-consider">
                  competitors: 6
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Interactive Map Pins */}
        {markers.map((m) => {
          const isSelected = m.type === "selected";
          const isReport = m.type === "report";
          const isCompetitor = m.type === "competitor";

          return (
            <div
              key={m.id}
              className="absolute z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-110"
              style={{ left: `${m.x}%`, top: `${m.y}%` }}
              onClick={() => setActiveTooltip(activeTooltip?.id === m.id ? null : m)}
              onMouseEnter={() => setActiveTooltip(m)}
              onMouseLeave={() => setActiveTooltip(null)}
            >
              <div className="group flex flex-col items-center">
                {/* Pin Icon Bubble */}
                {isSelected ? (
                  <div className="marker-selected relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-primary shadow-[0_4px_12px_rgba(91,91,214,0.4)]">
                    {getBusinessIcon()}
                  </div>
                ) : isReport ? (
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white shadow-md transition-transform"
                    style={{ background: m.color ?? "#c45b4a" }}
                  >
                    {getReportIcon(m.category)}
                  </div>
                ) : isCompetitor ? (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#7f7f98] shadow-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  </div>
                ) : (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-primary shadow-sm">
                    <GraduationCap size={10} className="text-white" />
                  </div>
                )}

                {/* Pin Name Label */}
                <div
                  className={`clay-soft mt-1 flex items-center gap-1 rounded-[8px] px-2 py-0.5 text-[10px] font-medium leading-tight whitespace-nowrap text-ink shadow-[0_4px_12px_rgba(71,71,184,0.1)] ${
                    isSelected ? "border-primary/40 bg-white ring-1 ring-primary/20" : ""
                  }`}
                >
                  {isReport && (
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full"
                      style={{ background: m.color ?? "#c45b4a" }}
                    />
                  )}
                  {m.label}
                </div>
              </div>
            </div>
          );
        })}

        {/* Interactive Tooltip Card */}
        {activeTooltip && (
          <div
            className="clay absolute z-30 max-w-[210px] -translate-x-1/2 -translate-y-full rounded-[12px] bg-white p-2.5 shadow-[0_12px_24px_rgba(71,71,184,0.18)]"
            style={{
              left: `${activeTooltip.x}%`,
              top: `calc(${activeTooltip.y}% - 14px)`,
            }}
          >
            <p className="text-[12px] font-medium text-ink">{activeTooltip.label}</p>
            <p className="mt-1 text-[11px] leading-4 text-muted">{activeTooltip.detail}</p>
          </div>
        )}

        {/* Small Location Score Badge (Bottom-Right) */}
        {showScore && (
          <div className="clay absolute bottom-3 right-3 z-20 min-w-[124px] rounded-[14px] bg-white/95 p-3 shadow-md">
            <p className="text-[10px] font-medium text-muted">location potential</p>
            <div className="flex items-baseline gap-1">
              <p className="font-display text-[24px] font-medium leading-none text-ink">
                {displayScore}
              </p>
              <span className="text-[12px] text-muted">/ 100</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  tone === "potential"
                    ? "bg-potential"
                    : tone === "consideration"
                      ? "bg-consider"
                      : "bg-warning"
                }`}
              />
              <p
                className={`text-[11px] font-medium ${
                  tone === "potential"
                    ? "text-potential"
                    : tone === "consideration"
                      ? "text-consider"
                      : "text-warning"
                }`}
              >
                {scoreCopy[tone]}
              </p>
            </div>
          </div>
        )}

        {/* Bottom Left Legend Tag */}
        <div className="clay absolute bottom-3 left-3 z-20 hidden items-center gap-2.5 rounded-[10px] bg-white/90 px-2.5 py-1.5 sm:flex">
          <div className="flex items-center gap-1 text-[10px] text-ink">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span>candidate</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted">
            <span className="h-2 w-2 rounded-full bg-[#7f7f98]" />
            <span>competitor</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted">
            <span className="h-2 w-2 rounded-full bg-[#c45b4a]" />
            <span>civic signal</span>
          </div>
        </div>
      </div>
    </div>
  );
}
