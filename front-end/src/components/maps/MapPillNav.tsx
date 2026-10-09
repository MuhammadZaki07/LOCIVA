import { BookOpen, Layers, Route, Search, Target } from "lucide-react";
import { cn } from "@/lib/utils";

export type MapToolId = "catalog" | "layers" | "search" | "analysis" | "routes";

interface MapPillNavProps {
  active: MapToolId | null;
  onSelect: (id: MapToolId) => void;
  analysisEnabled?: boolean;
}

const ITEMS: { id: MapToolId; label: string; icon: typeof Search }[] = [
  { id: "catalog", label: "Katalog", icon: BookOpen },
  { id: "search", label: "Cari", icon: Search },
  { id: "layers", label: "Lapisan", icon: Layers },
  { id: "analysis", label: "Analisis", icon: Target },
  { id: "routes", label: "Rute", icon: Route },
];

export function MapPillNav({ active, onSelect, analysisEnabled = true }: MapPillNavProps) {
  return (
    <nav
      className="absolute left-3 top-1/2 z-[420] -translate-y-1/2"
      aria-label="Alat peta LOCIVA"
    >
      <div className="clay pill-nav-bubble flex flex-col items-center gap-1 rounded-full px-1.5 py-2">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const disabled = item.id === "analysis" && !analysisEnabled;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              disabled={disabled}
              title={item.label}
              onClick={() => onSelect(item.id)}
              className={cn(
                "pill-bubble-item flex size-10 items-center justify-center rounded-full",
                isActive ? "clay-primary text-white" : "text-ink hover:bg-primary-soft",
                disabled && "opacity-40 cursor-not-allowed",
              )}
            >
              <Icon size={16} />
              <span className="sr-only">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
