import { BookOpen, Layers, Route, Search, Target, Bookmark, Scale, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export type MapToolId = "catalog" | "search" | "layers" | "candidates" | "analysis" | "compare" | "routes" | "reports";

interface MapPillNavProps {
  active: MapToolId | null;
  onSelect: (id: MapToolId) => void;
  analysisEnabled?: boolean;
  compareEnabled?: boolean;
}

const ITEMS: { id: MapToolId; label: string; icon: typeof Search }[] = [
  { id: "catalog",    label: "Business Catalog",    icon: BookOpen      },
  { id: "search",     label: "Search Location",     icon: Search        },
  { id: "reports",    label: "Civic Reports",       icon: AlertTriangle },
  { id: "layers",     label: "Layers & POIs",       icon: Layers        },
  { id: "candidates", label: "Saved Candidates",    icon: Bookmark      },
  { id: "analysis",   label: "Location Analysis",   icon: Target        },
  { id: "compare",    label: "Compare Candidates",  icon: Scale         },
  { id: "routes",     label: "Vendor Routes",       icon: Route         },
];

export function MapPillNav({
  active,
  onSelect,
  analysisEnabled = true,
  compareEnabled = true,
}: MapPillNavProps) {
  return (
    <nav
      className="absolute left-3 top-1/2 z-[430] -translate-y-1/2"
      aria-label="LOCIVA Map Tools"
    >
      <div className="clay pill-nav-bubble flex flex-col items-center gap-1 rounded-full px-1.5 py-2">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const disabled =
            (item.id === "analysis" && !analysisEnabled) ||
            (item.id === "compare" && !compareEnabled);
          const isActive = active === item.id;

          return (
            <div key={item.id} className="relative flex items-center">
              <button
                type="button"
                  data-tour={`${item.id}-btn`}
                disabled={disabled}
                title={
                  disabled && item.id === "analysis"
                    ? "Select a business from the Catalog first"
                    : disabled && item.id === "compare"
                    ? "Place at least one candidate on the map"
                    : item.label
                }
                onClick={() => onSelect(item.id)}
                className={cn(
                  "pill-bubble-item flex size-10 items-center justify-center rounded-full transition-all cursor-pointer",
                  isActive ? "clay-primary text-white shadow-lg" : "text-ink hover:bg-primary-soft",
                  disabled && "opacity-30 cursor-not-allowed hover:bg-transparent text-slate-400",
                )}
              >
                <Icon size={17} />
                <span className="sr-only">{item.label}</span>
              </button>

              {/* Solid caret arrow pointing RIGHT toward the floating panel */}
              {isActive && active !== "search" && (
                <div
                  aria-hidden
                  className="hidden md:block absolute left-full ml-2 z-[440] pointer-events-none"
                  style={{
                    width: 0,
                    height: 0,
                    borderTop: "7px solid transparent",
                    borderBottom: "7px solid transparent",
                    borderLeft: "9px solid #ffffff",
                    filter: "drop-shadow(2px 0px 2px rgba(0,0,0,0.13))",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
