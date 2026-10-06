import { useState } from "react";
import { Eyebrow, Section } from "./ui/Section";
import { MapPreview, type LayerKey } from "./MapPreview";
import { AlertCircle, Footprints, Navigation, Store, Users, ShieldAlert } from "lucide-react";

interface FactorDetail {
  id: string;
  label: string;
  layer: LayerKey;
  icon: typeof Users;
  metric: string;
  realityCheck: string;
}

const factors: FactorDetail[] = [
  {
    id: "pedestrian",
    label: "pedestrian activity",
    layer: "poi",
    icon: Footprints,
    metric: "81 / 100",
    realityCheck: "High foot traffic may simply be commuters rushing to transit rather than prospective customers.",
  },
  {
    id: "population",
    label: "population",
    layer: "population",
    icon: Users,
    metric: "86 / 100",
    realityCheck: "Dense resident count only matters if purchasing power and lifestyle fit your product price point.",
  },
  {
    id: "accessibility",
    label: "accessibility",
    layer: "access",
    icon: Navigation,
    metric: "69 / 100",
    realityCheck: "Narrow sidewalks and absence of parking or drop-off points create friction for repeat visitors.",
  },
  {
    id: "targetMarket",
    label: "target market",
    layer: "business",
    icon: Store,
    metric: "78 / 100",
    realityCheck: "The crowd passing by must actively seek what you sell at the hours you are open.",
  },
  {
    id: "competition",
    label: "competition",
    layer: "business",
    icon: AlertCircle,
    metric: "52 / 100",
    realityCheck: "Saturation can quickly cannibalize margins if multiple rivals offer the exact same menu.",
  },
  {
    id: "areaCondition",
    label: "area condition",
    layer: "reports",
    icon: ShieldAlert,
    metric: "62 / 100",
    realityCheck: "Repeated flooding and damaged pavements directly disrupt customer access and delivery fleets.",
  },
];

export function ProblemSection() {
  const [activeFactor, setActiveFactor] = useState(factors[0].id);
  const current = factors.find((f) => f.id === activeFactor) ?? factors[0];

  return (
    <Section>
      <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <Eyebrow>the problem</Eyebrow>
          <h2 className="font-display text-[28px] leading-snug font-medium tracking-[-0.02em] text-ink md:text-[32px]">
            A busy place is not always the right place.
          </h2>
          <p className="mt-4 max-w-md text-[15px] leading-7 text-muted">
            Foot traffic can look promising on the surface while masking steep competition, poor pedestrian accessibility, or recurring civic infrastructure disruptions. Lociva analyzes a location as a composite of signals.
          </p>

          {/* Interactive factor chips */}
          <div className="mt-6 flex flex-wrap gap-2">
            {factors.map((f) => {
              const isSelected = f.id === activeFactor;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActiveFactor(f.id)}
                  className={`clay-press rounded-[10px] px-3 py-1.5 text-[12px] font-medium transition-all ${
                    isSelected
                      ? "clay-primary text-white"
                      : "clay-soft text-ink"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* Active factor callout card */}
          <div className="clay-soft mt-5 rounded-[14px] p-4">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium text-ink">{current.label}</span>
              <span className="rounded-[6px] bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary">
                signal weight · {current.metric}
              </span>
            </div>
            <p className="mt-2 text-[13px] leading-6 text-muted">
              {current.realityCheck}
            </p>
          </div>
        </div>

        {/* Map Preview reflecting the factor */}
        <div className="relative">
          <MapPreview
            variant="problem"
            score={74}
            showScore
            catchment
            layers={["geo", current.layer]}
            selectedLabel="candidate site"
          />
        </div>
      </div>
    </Section>
  );
}
