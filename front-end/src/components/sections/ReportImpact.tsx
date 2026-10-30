import { useState } from "react";
import { useCountUp } from "../../hooks/useCountUp";
import { DemoNote, Eyebrow, Section } from "../ui/Section";
import { useLocale } from "@/lib/useLocale";

export function ReportImpact() {
  const { t } = useLocale();
  const [includeCivicSignals, setIncludeCivicSignals] = useState(true);
  const score = includeCivicSignals ? 74 : 82;
  const animatedScore = useCountUp(score);

  return (
    <Section>
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <Eyebrow>{t("impactEyebrow")}</Eyebrow>
          <h2 className="font-display text-[28px] leading-snug font-medium tracking-[-0.02em] text-ink md:text-[32px]">
            {t("impactHeadline")}
          </h2>
          <p className="mt-4 max-w-md text-[15px] leading-7 text-muted">
            {t("impactBody")}
          </p>

          {/* Before / After toggle controls */}
          <div className="mt-6 flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => setIncludeCivicSignals(false)}
              className={`clay-press rounded-[10px] px-3.5 py-2 text-[13px] font-medium transition-all ${
                !includeCivicSignals
                  ? "clay-primary text-white"
                  : "clay text-ink"
              }`}
            >
              {t("impactBefore")}
            </button>
            <button
              type="button"
              onClick={() => setIncludeCivicSignals(true)}
              className={`clay-press rounded-[10px] px-3.5 py-2 text-[13px] font-medium transition-all ${
                includeCivicSignals
                  ? "clay-primary text-white"
                  : "clay text-ink"
              }`}
            >
              {t("impactAfter")}
            </button>
          </div>
        </div>

        {/* Visual Before/After Comparison Card */}
        <div className="clay rounded-[18px] p-6 sm:p-7">
          <div className="flex items-center justify-between border-b border-[#ececf6] pb-3.5">
            <p className="text-[12px] font-medium text-muted">
              {includeCivicSignals
                ? t("impactComposite")
                : t("impactBaseline")}
            </p>
            <span
              className={`rounded-[6px] px-2 py-0.5 text-[11px] font-medium ${
                includeCivicSignals
                  ? "bg-[#fff8e7] text-consider"
                  : "bg-[#e8f6ee] text-potential"
              }`}
            >
              {includeCivicSignals ? t("simTone_consideration") : t("simTone_potential")}
            </span>
          </div>

          <div className="mt-5 flex items-baseline gap-2">
            <p className="font-display text-[48px] font-medium leading-none text-ink">
              {animatedScore}
            </p>
            <span className="text-[20px] text-muted">/ 100</span>
          </div>

          {/* Factor Breakdown Grid */}
          <div className="mt-5 grid grid-cols-2 gap-3 text-[13px]">
            <div className="clay-soft rounded-[12px] p-3.5">
              <p className="text-[11px] font-medium text-muted">{t("impactMarketPotential")}</p>
              <p className="mt-1 text-[13px] font-medium text-potential">
                strong (86 / 100)
              </p>
              <p className="mt-1 text-[11px] text-muted">
                footfall & population remain intact
              </p>
            </div>
            <div className="clay-soft rounded-[12px] p-3.5">
              <p className="text-[11px] font-medium text-muted">{t("impactAreaCondition")}</p>
              <p className={`mt-1 text-[13px] font-medium ${includeCivicSignals ? "text-warning" : "text-ink"}`}>
                {includeCivicSignals ? "active reports (-8 pts)" : "not yet factored"}
              </p>
              <p className="mt-1 text-[11px] text-muted">
                {includeCivicSignals
                  ? "recurring road & drainage reports lower the opportunity score"
                  : "standard infrastructure assumed"}
              </p>
            </div>
          </div>

          {/* Synthesis Note */}
          <div className="clay-soft mt-5 rounded-[12px] p-4">
            <p className="text-[11px] font-medium text-primary">{t("impactSynthesis")}</p>
            <p className="mt-1 text-[13.5px] leading-relaxed text-ink">
              {includeCivicSignals
                ? "Market potential remains strong, but recurring infrastructure reports reduce the opportunity score (up to -20 pts)."
                : "Demographic signals alone indicate an attractive market opportunity without ground verification."}
            </p>
          </div>

          <DemoNote>{t("impactDemoNote")}</DemoNote>
          <p className="mt-1 text-[11px] leading-5 text-muted">
            {t("impactSampleData")}
          </p>
        </div>
      </div>
    </Section>
  );
}
