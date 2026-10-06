import { Eyebrow, Section } from "./ui/Section";
import { MousePointerClick, Search, SlidersHorizontal, CheckCircle2 } from "lucide-react";

const steps = [
  {
    n: "01",
    title: "Choose",
    body: "Choose a business or location.",
    detail: "Pick the enterprise type you intend to start or pin a specific candidate parcel on the map.",
    icon: MousePointerClick,
  },
  {
    n: "02",
    title: "Explore",
    body: "Explore the surrounding area and its signals.",
    detail: "Unpack population demographics, pedestrian volume, competitor density, and ground reports.",
    icon: Search,
  },
  {
    n: "03",
    title: "Simulate",
    body: "Compare different scenarios.",
    detail: "Shift radiuses, test alternate street corners, or adjust operating hours to observe score variations.",
    icon: SlidersHorizontal,
  },
  {
    n: "04",
    title: "Decide",
    body: "Use the insights to make a more informed decision.",
    detail: "Move forward with confidence, supported by objective data and neighbor-verified area realities.",
    icon: CheckCircle2,
  },
];

export function HowItWorks() {
  return (
    <Section id="how-it-works">
      <div className="max-w-xl">
        <Eyebrow>how it works</Eyebrow>
        <h2 className="font-display text-[28px] leading-snug font-medium tracking-[-0.02em] text-ink md:text-[32px]">
          How lociva works
        </h2>
        <p className="mt-3 text-[15px] leading-7 text-muted">
          Four intuitive steps from initial spatial question to a grounded, informed decision.
        </p>
      </div>

      <div className="relative mt-10">
        {/* Horizontal connector line on desktop */}
        <div className="absolute left-8 right-8 top-7 hidden h-0.5 bg-[#ececf6] lg:block" />

        <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <li
                key={step.n}
                className="clay clay-lift relative flex flex-col justify-between rounded-[16px] p-5"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-primary text-[12px] font-semibold text-white shadow-sm">
                      {step.n}
                    </span>
                    <Icon size={16} className="text-primary" />
                  </div>
                  <h3 className="mt-4 font-display text-[18px] font-medium text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-[13.5px] font-medium text-ink">
                    {step.body}
                  </p>
                  <p className="mt-2 text-[12px] leading-5 text-muted">
                    {step.detail}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </Section>
  );
}
