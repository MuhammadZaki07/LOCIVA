import { useState } from "react";
import { factorExplanations, factorLabels, type FactorKey } from "../data/mock";
import { useCountUp } from "../hooks/useCountUp";
import { DemoNote, Eyebrow, Section } from "./ui/Section";
import { HelpCircle } from "lucide-react";

const factors: { key: FactorKey; value: number; tag: string }[] = [
  { key: "population", value: 86, tag: "high density" },
  { key: "pedestrian", value: 81, tag: "strong foot traffic" },
  { key: "accessibility", value: 69, tag: "walkway bottlenecks" },
  { key: "targetMarket", value: 78, tag: "demographic match" },
  { key: "competition", value: 52, tag: "high rivalry" },
  { key: "compatibility", value: 83, tag: "commercial zoning" },
];

export function ScoreBreakdown() {
  const [openWhy, setOpenWhy] = useState(true);
  const [selectedFactor, setSelectedFactor] = useState<FactorKey>("competition");
  const score = useCountUp(74);

  return (
    <Section id="score">
      <div className="grid items-start gap-10 lg:grid-cols-[0.75fr_1.25fr]">
        {/* Left Column: Headline, Score, and "why?" Action */}
        <div>
          <Eyebrow>location potential score</Eyebrow>
          <h2 className="font-display text-[28px] leading-snug font-medium tracking-[-0.02em] text-ink md:text-[32px]">
            A score is useful when you know why.
          </h2>

          <div className="clay-soft mt-6 rounded-[16px] p-5">
            <p className="text-[12px] font-medium text-muted">composite score</p>
            <div className="mt-1 flex items-baseline gap-2">
              <p className="font-display text-[48px] font-medium leading-none text-ink">
                {score}
              </p>
              <span className="text-[20px] text-muted">/ 100</span>
            </div>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-[8px] bg-[#fff8e7] px-2.5 py-1 text-[12px] font-medium text-consider">
              <span className="h-1.5 w-1.5 rounded-full bg-consider" />
              <span>consideration</span>
            </div>
          </div>

          <div className="mt-5">
            <button
              type="button"
              onClick={() => setOpenWhy((v) => !v)}
              className="clay clay-press inline-flex items-center gap-2 rounded-[12px] px-4 py-2 text-[13px] font-medium text-ink"
            >
              <HelpCircle size={14} className="text-primary" />
              <span>why?</span>
            </button>
          </div>

          {openWhy && (
            <div className="clay-soft mt-4 rounded-[14px] p-4 text-[13.5px] leading-6 text-ink">
              <p className="font-medium text-primary">overall synthesis</p>
              <p className="mt-1.5 text-muted">
                Strong population and pedestrian potential support customer reach, while competition density lowers the overall opportunity.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Factor Breakdown Analytical UI */}
        <div className="clay rounded-[18px] p-5 sm:p-6">
          <div className="flex items-center justify-between border-b border-[#ececf6] pb-3.5">
            <div>
              <p className="text-[13px] font-medium text-ink">factor breakdown</p>
              <p className="text-[11px] text-muted">demo cafe · mixed corridor</p>
            </div>
            <span className="rounded-[6px] bg-primary-soft px-2 py-0.5 text-[11px] text-primary">
              6 signals evaluated
            </span>
          </div>

          {/* Factor List */}
          <ul className="mt-4 space-y-3">
            {factors.map((row) => {
              const isSelected = selectedFactor === row.key;
              return (
                <li
                  key={row.key}
                  onClick={() => setSelectedFactor(row.key)}
                  className={`clay-press cursor-pointer rounded-[12px] p-2.5 transition-all ${
                    isSelected ? "bg-white shadow-[0_4px_12px_rgba(71,71,184,0.08)] ring-1 ring-primary/20" : "hover:bg-white/60"
                  }`}
                >
                  <div className="grid grid-cols-[1fr_50px] items-center gap-3">
                    <div>
                      <div className="mb-1.5 flex items-center justify-between text-[13px]">
                        <span className="font-medium text-ink">
                          {factorLabels[row.key]}
                        </span>
                        <span className="text-[11px] text-muted">
                          {row.tag}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-primary-soft">
                        <div
                          className="bar-fill h-full rounded-full bg-primary"
                          style={{ width: `${row.value}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-right font-display text-[16px] font-medium text-ink">
                      {row.value}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Factor Detail Explainer Card */}
          <div className="clay-soft mt-5 rounded-[12px] p-3.5">
            <p className="text-[12px] font-medium text-ink">
              detail on {factorLabels[selectedFactor]}
            </p>
            <p className="mt-1 text-[12px] leading-5 text-muted">
              {factorExplanations[selectedFactor]}
            </p>
          </div>

          <DemoNote />
        </div>
      </div>
    </Section>
  );
}
