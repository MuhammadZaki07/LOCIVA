import { useMemo, useState } from "react";
import {
  averageScore,
  businesses,
  businessFactors,
  factorLabels,
  scoreCopy,
  scoreTone,
  type BusinessId,
  type FactorKey,
} from "../data/mock";
import { useCountUp } from "../hooks/useCountUp";
import { ClayButton } from "./ui/ClayButton";
import { DemoNote, Eyebrow, Section } from "./ui/Section";
import { MapPreview } from "./MapPreview";
import { Coffee, Scissors, ShoppingBag, Store, UtensilsCrossed } from "lucide-react";

const radiusOptions = [
  { value: 250, label: "250 m", footWalk: "~3 min walk", modifier: -2 },
  { value: 400, label: "400 m", footWalk: "~5 min walk", modifier: 0 },
  { value: 800, label: "800 m", footWalk: "~10 min walk", modifier: 3 },
];

export function BusinessSimulation() {
  const [business, setBusiness] = useState<BusinessId>("cafe");
  const [radiusMeters, setRadiusMeters] = useState(400);

  const activeBusinessMeta = businesses.find((b) => b.id === business) ?? businesses[1];
  const radiusMeta = radiusOptions.find((r) => r.value === radiusMeters) ?? radiusOptions[1];

  const rawFactors = businessFactors[business];
  const baseScore = averageScore(rawFactors);
  const adjustedScore = Math.max(30, Math.min(98, baseScore + radiusMeta.modifier));
  const displayScore = useCountUp(adjustedScore);
  const tone = scoreTone(adjustedScore);

  const factorRows = useMemo(
    () => (Object.keys(rawFactors) as FactorKey[]).map((key) => ({ key, value: rawFactors[key] })),
    [rawFactors],
  );

  function getBusinessIcon(id: BusinessId) {
    switch (id) {
      case "food-cart":
        return <UtensilsCrossed size={13} />;
      case "barber":
        return <Scissors size={13} />;
      case "fashion-store":
        return <ShoppingBag size={13} />;
      case "retail":
        return <Store size={13} />;
      case "cafe":
      default:
        return <Coffee size={13} />;
    }
  }

  return (
    <Section className="pt-4">
      <div className="mb-8 max-w-xl">
        <Eyebrow>business simulation</Eyebrow>
        <h2 className="font-display text-[28px] leading-snug font-medium tracking-[-0.02em] text-ink md:text-[32px]">
          Simulate before you invest.
        </h2>
        <p className="mt-3 text-[15px] leading-7 text-muted">
          Test different business ideas and locations before committing real resources.
        </p>
      </div>

      {/* Mock Analytics Dashboard in Claymorphism */}
      <div className="clay overflow-hidden rounded-[18px]">
        {/* Dashboard Top Control Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ececf6] bg-white/70 px-4 py-3.5 backdrop-blur-sm sm:px-6">
          {/* Business Type Selector */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[12px] font-medium text-muted">business:</span>
            {businesses.map((item) => {
              const isSelected = business === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setBusiness(item.id)}
                  className={`clay-press inline-flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-[12px] font-medium transition-all ${
                    isSelected
                      ? "clay-primary text-white"
                      : "clay-soft text-ink"
                  }`}
                >
                  {getBusinessIcon(item.id)}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Catchment Radius Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] text-muted">radius:</span>
            {radiusOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRadiusMeters(opt.value)}
                className={`clay-press rounded-[8px] px-2 py-1 text-[11px] font-medium ${
                  radiusMeters === opt.value
                    ? "bg-primary text-white shadow-sm"
                    : "bg-primary-soft text-ink"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dashboard Core Body */}
        <div className="grid lg:grid-cols-[1.2fr_0.8fr]">
          {/* Map Preview Area */}
          <div className="p-4 sm:p-5">
            <div className="mb-2.5 flex items-center justify-between text-[12px]">
              <span className="font-medium text-ink">
                simulated catchment · {activeBusinessMeta.label}
              </span>
              <span className="text-muted">
                {activeBusinessMeta.competitorCount} competitors in {radiusMeta.label} ({radiusMeta.footWalk})
              </span>
            </div>
            <MapPreview
              variant="simulation"
              score={adjustedScore}
              businessType={business}
              catchmentRadiusMeters={radiusMeters}
              selectedLabel={`your ${activeBusinessMeta.label}`}
              compact
            />
          </div>

          {/* Factor Breakdown Panel */}
          <div className="border-t border-[#ececf6] p-5 lg:border-l lg:border-t-0 sm:p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[12px] text-muted">location potential score</p>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <p className="font-display text-[38px] font-medium leading-none text-ink">
                    {displayScore}
                  </p>
                  <span className="text-[16px] text-muted">/ 100</span>
                </div>
              </div>
              <span
                className={`rounded-[8px] px-2.5 py-1 text-[11px] font-medium capitalize ${
                  tone === "potential"
                    ? "bg-[#e8f6ee] text-potential"
                    : tone === "consideration"
                      ? "bg-[#fff8e7] text-consider"
                      : "bg-[#fbf0ee] text-warning"
                }`}
              >
                {scoreCopy[tone]}
              </span>
            </div>

            <p className="mt-5 text-[12px] font-medium text-ink">factor breakdown</p>
            <ul className="mt-3 space-y-3">
              {factorRows.map((row) => (
                <li key={row.key}>
                  <div className="mb-1 flex justify-between text-[12px]">
                    <span className="text-muted">{factorLabels[row.key]}</span>
                    <span className="font-medium text-ink">{row.value}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-primary-soft">
                    <div
                      className="bar-fill h-full rounded-full bg-primary"
                      style={{ width: `${row.value}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>

            <ClayButton href="#score" variant="secondary" className="mt-6 w-full">
              open why?
            </ClayButton>
          </div>
        </div>
      </div>

      <DemoNote>
        Scores update interactively based on business category dynamics and catchment walkability models.
      </DemoNote>
    </Section>
  );
}
