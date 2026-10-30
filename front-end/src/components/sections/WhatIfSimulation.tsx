import { useMemo, useState } from "react";
import { locations, type LocationId } from "../../data/mock";
import { useCountUp } from "../../hooks/useCountUp";
import { DemoNote, Eyebrow, Section } from "../ui/Section";
import { Sliders } from "lucide-react";
import { useLocale } from "@/lib/useLocale";

type BusinessOption = "cafe" | "food cart" | "retail";
type MarketOption = "mixed" | "students" | "office workers";
type HoursOption = "daytime (07-17)" | "evening rush (16-23)" | "late night (18-02)";
type RadiusOption = "300 m" | "500 m" | "800 m";

export function WhatIfSimulation() {
  const { t } = useLocale();
  const [selectedPlace, setSelectedPlace] = useState<LocationId>("a");
  const [businessType, setBusinessType] = useState<BusinessOption>("cafe");
  const [market, setMarket] = useState<MarketOption>("mixed");
  const [hours, setHours] = useState<HoursOption>("daytime (07-17)");
  const [radius, setRadius] = useState<RadiusOption>("500 m");

  // Multiplier logic for levers (frontend demonstration model only)
  const extraModifier = useMemo(() => {
    let mod = 0;
    if (businessType === "food cart") mod += 4;
    if (businessType === "retail") mod -= 2;

    if (market === "students") mod += 3;
    if (market === "office workers") mod += 2;

    if (hours === "evening rush (16-23)") mod += 4;
    if (hours === "late night (18-02)") mod -= 3;

    if (radius === "300 m") mod -= 1;
    if (radius === "800 m") mod += 2;
    return mod;
  }, [businessType, market, hours, radius]);

  const comparedLocations = useMemo(() => {
    return locations.map((loc) => {
      const computed = Math.max(35, Math.min(97, loc.baseScore + extraModifier));
      return {
        ...loc,
        score: computed,
      };
    });
  }, [extraModifier]);

  const activeLoc = comparedLocations.find((l) => l.id === selectedPlace) ?? comparedLocations[0];
  const animatedScore = useCountUp(activeLoc.score);

  return (
    <Section>
      <div className="max-w-xl">
        <Eyebrow>{t("whatifEyebrow")}</Eyebrow>
        <h2 className="font-display text-[28px] leading-snug font-medium tracking-[-0.02em] text-ink md:text-[32px]">
          {t("whatifHeadline")}
        </h2>
        <p className="mt-3 text-[15px] leading-7 text-muted">
          {t("whatifBody")}
        </p>
        <p className="mt-2 text-[11px] leading-5 text-muted">
          {t("whatifSampleData")}
        </p>
      </div>

      {/* Comparison Cards (Location A, B, C) */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {comparedLocations.map((loc) => {
          const isSelected = loc.id === selectedPlace;
          return (
            <button
              key={loc.id}
              type="button"
              onClick={() => setSelectedPlace(loc.id)}
              className={`clay clay-lift rounded-[16px] p-5 text-left transition-all ${
                isSelected ? "ring-2 ring-primary/40 bg-white" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-ink">{loc.name}</span>
                <span className="rounded-[6px] bg-primary-soft px-2 py-0.5 text-[10px] font-medium text-primary">
                  {loc.hint}
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <p className="font-display text-[36px] font-medium leading-none text-ink">
                  {loc.id === selectedPlace ? animatedScore : loc.score}
                </p>
                <span className="text-[16px] text-muted">/ 100</span>
              </div>
              <p className="mt-2 text-[12px] leading-5 text-muted">{loc.description}</p>
            </button>
          );
        })}
      </div>

      {/* Lever Controls */}
      <div className="clay mt-6 rounded-[16px] p-5">
        <div className="flex items-center gap-2 border-b border-[#ececf6] pb-3 text-[13px] font-medium text-ink">
          <Sliders size={14} className="text-primary" />
          <span>{t("whatifRecalculate")}</span>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-[12px]">
          {/* Business Type */}
          <div>
            <p className="mb-1.5 font-medium text-muted">{t("whatifBusinessType")}</p>
            <div className="flex flex-col gap-1">
              {(["cafe", "food cart", "retail"] as BusinessOption[]).map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setBusinessType(val)}
                  className={`clay-press rounded-[8px] px-2.5 py-1.5 text-left ${
                    businessType === val
                      ? "clay-primary text-white"
                      : "clay-soft text-ink"
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          {/* Target Market */}
          <div>
            <p className="mb-1.5 font-medium text-muted">{t("whatifTargetMarket")}</p>
            <div className="flex flex-col gap-1">
              {(["mixed", "students", "office workers"] as MarketOption[]).map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setMarket(val)}
                  className={`clay-press rounded-[8px] px-2.5 py-1.5 text-left ${
                    market === val
                      ? "clay-primary text-white"
                      : "clay-soft text-ink"
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          {/* Operating Hours */}
          <div>
            <p className="mb-1.5 font-medium text-muted">{t("whatifOperatingHours")}</p>
            <div className="flex flex-col gap-1">
              {(["daytime (07-17)", "evening rush (16-23)", "late night (18-02)"] as HoursOption[]).map(
                (val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setHours(val)}
                    className={`clay-press rounded-[8px] px-2.5 py-1.5 text-left ${
                      hours === val
                        ? "clay-primary text-white"
                        : "clay-soft text-ink"
                    }`}
                  >
                    {val}
                  </button>
                ),
              )}
            </div>
          </div>

          {/* Radius */}
          <div>
            <p className="mb-1.5 font-medium text-muted">{t("whatifRadius")}</p>
            <div className="flex flex-col gap-1">
              {(["300 m", "500 m", "800 m"] as RadiusOption[]).map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setRadius(val)}
                  className={`clay-press rounded-[8px] px-2.5 py-1.5 text-left ${
                    radius === val
                      ? "clay-primary text-white"
                      : "clay-soft text-ink"
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <DemoNote>{t("whatifDemoNote")}</DemoNote>
    </Section>
  );
}
