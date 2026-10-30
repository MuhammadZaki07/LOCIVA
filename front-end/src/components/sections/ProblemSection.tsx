import { useState } from "react";
import { Eyebrow, Section } from "../ui/Section";
import { MapPreview, type LayerKey } from "./MapPreview";
import { AlertCircle, Footprints, Navigation, Store, Users, ShieldAlert } from "lucide-react";
import { useLocale } from "@/lib/useLocale";
import type { Translations } from "@/lib/locales";

interface FactorDetail {
  id: string;
  labelKey: string;
  layer: LayerKey;
  icon: typeof Users;
  realityCheckKey: string;
}

const factors: FactorDetail[] = [
  {
    id: "pedestrian",
    labelKey: "factorPedestrian",
    layer: "poi",
    icon: Footprints,
    realityCheckKey: "factorPedestrianCheck",
  },
  {
    id: "population",
    labelKey: "factorPopulation",
    layer: "population",
    icon: Users,
    realityCheckKey: "factorPopulationCheck",
  },
  {
    id: "accessibility",
    labelKey: "factorAccessibility",
    layer: "access",
    icon: Navigation,
    realityCheckKey: "factorAccessibilityCheck",
  },
  {
    id: "targetMarket",
    labelKey: "factorTargetMarket",
    layer: "business",
    icon: Store,
    realityCheckKey: "factorTargetMarketCheck",
  },
  {
    id: "competition",
    labelKey: "factorCompetition",
    layer: "business",
    icon: AlertCircle,
    realityCheckKey: "factorCompetitionCheck",
  },
  {
    id: "areaCondition",
    labelKey: "factorAreaCondition",
    layer: "reports",
    icon: ShieldAlert,
    realityCheckKey: "factorAreaConditionCheck",
  },
];

export function ProblemSection() {
  const { t } = useLocale();
  const [activeFactor, setActiveFactor] = useState(factors[0].id);
  const current = factors.find((f) => f.id === activeFactor) ?? factors[0];

  return (
    <Section>
      <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <Eyebrow>{t("problemEyebrow")}</Eyebrow>
          <h2 className="font-display text-[28px] leading-snug font-medium tracking-[-0.02em] text-ink md:text-[32px]">
            {t("problemHeadline")}
          </h2>
          <p className="mt-4 max-w-md text-[15px] leading-7 text-muted">
            {t("problemBody")}
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
                  {t(f.labelKey as unknown as keyof Translations)}
                </button>
              );
            })}
          </div>

          {/* Active factor callout card */}
          <div className="clay-soft mt-5 rounded-[14px] p-4">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium text-ink">
                {t(current.labelKey as unknown as keyof Translations)}
              </span>
              <span className="rounded-[6px] bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary">
                {t("problemSignalWeight")} signal
              </span>
            </div>
            <p className="mt-2 text-[13px] leading-6 text-muted">
              {t(current.realityCheckKey as unknown as keyof Translations)}
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
            sampleData
          />
        </div>
      </div>
    </Section>
  );
}
