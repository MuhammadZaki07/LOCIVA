import { useState } from "react";
import { Eyebrow, Section } from "./ui/Section";
import { aiScenarios } from "../data/mock";
import { MessageSquare } from "lucide-react";

export function AISection() {
  const [activeScenarioIdx, setActiveScenarioIdx] = useState(0);
  const scenario = aiScenarios[activeScenarioIdx];

  return (
    <Section>
      <div className="grid items-start gap-10 lg:grid-cols-[1fr_1fr]">
        <div>
          <Eyebrow>strategic enhancement</Eyebrow>
          <h2 className="font-display text-[28px] leading-snug font-medium tracking-[-0.02em] text-ink md:text-[32px]">
            Turn analysis into action.
          </h2>
          <p className="mt-4 max-w-md text-[15px] leading-7 text-muted">
            LOCIVA uses AI strictly as an interpretive enhancement after hard geospatial metrics and community reports are gathered. It helps entrepreneurs explore tactical adaptations rather than replacing raw ground data.
          </p>

          <div className="mt-6">
            <p className="font-display text-[22px] font-medium text-ink">
              Data first. AI second.
            </p>
            <p className="mt-1 text-[13px] text-muted">
              AI interprets and suggests strategic differentiation; empirical data provides the baseline truth.
            </p>
          </div>

          {/* Interactive query buttons */}
          <div className="mt-6">
            <p className="text-[12px] font-medium text-muted">test user inquiries:</p>
            <div className="mt-2 flex flex-col gap-1.5">
              {aiScenarios.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveScenarioIdx(idx)}
                  className={`clay-press rounded-[10px] p-2.5 text-left text-[12.5px] transition-all ${
                    activeScenarioIdx === idx
                      ? "clay-primary text-white"
                      : "clay-soft text-ink"
                  }`}
                >
                  "{item.query}"
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* AI Dialogue & Tactical Advice Card in Claymorphism */}
        <div className="clay rounded-[18px] p-5 sm:p-6">
          <div className="flex items-center justify-between border-b border-[#ececf6] pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-soft text-primary">
                <MessageSquare size={13} />
              </span>
              <p className="text-[12px] font-medium text-ink">strategy assist · simulated consultation</p>
            </div>
            <span className="text-[11px] text-muted">grounded model</span>
          </div>

          {/* User query bubble */}
          <div className="clay-soft mt-4 rounded-[14px] p-3.5">
            <p className="text-[11px] font-medium text-muted">you</p>
            <p className="mt-1 text-[14px] font-medium text-ink">"{scenario.query}"</p>
            <p className="mt-1 text-[11px] text-primary">{scenario.context}</p>
          </div>

          {/* AI Response Bullet List */}
          <div className="mt-4 space-y-2.5">
            <p className="text-[12px] font-medium text-muted">lociva tactical adaptations:</p>
            {scenario.strategies.map((strat, i) => (
              <div
                key={i}
                className="clay-soft rounded-[12px] p-3 text-[13px] leading-relaxed text-ink"
              >
                <div className="flex items-center gap-1.5 font-medium text-ink">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>{strat.title}</span>
                </div>
                <p className="mt-1 pl-3 text-[12px] leading-5 text-muted">
                  {strat.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}
