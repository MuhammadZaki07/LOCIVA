import { Eyebrow, Section } from "../ui/Section";
import {
  Store,
  MapPin,
  BarChart3,
  HelpCircle,
  SlidersHorizontal,
  CheckCircle2,
} from "lucide-react";

const steps = [
  {
    n: "01",
    title: "choose a business",
    body: "Select the business category you plan to launch, from grab-and-go carts to sit-down venues.",
    icon: Store,
  },
  {
    n: "02",
    title: "place it on the map",
    body: "Pin candidate locations and define custom walkable catchment radiuses.",
    icon: MapPin,
  },
  {
    n: "03",
    title: "analyze the area",
    body: "Read population density, access corridors, competitor clusters, and civic signals.",
    icon: BarChart3,
  },
  {
    n: "04",
    title: "understand the score",
    body: "Open 'why?' to unpack what lifted or lowered your Location Potential Score.",
    icon: HelpCircle,
  },
  {
    n: "05",
    title: "simulate another scenario",
    body: "Tweak operating hours, target demographics, or test an alternate street corner.",
    icon: SlidersHorizontal,
  },
  {
    n: "06",
    title: "make a better decision",
    body: "Commit real capital with clear eyes and verifiable location ground truth.",
    icon: CheckCircle2,
  },
];

export function ProductFlow() {
  return (
    <Section id="product">
      <div className="max-w-xl">
        <Eyebrow>core product</Eyebrow>
        <h2 className="font-display text-[28px] leading-snug font-medium tracking-[-0.02em] text-ink md:text-[32px]">
          From a location to a decision.
        </h2>
        <p className="mt-3 text-[15px] leading-7 text-muted">
          A methodical, data-backed pathway that eliminates blind intuition when evaluating physical spaces.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <article
              key={step.n}
              className="clay clay-lift flex flex-col justify-between rounded-[16px] p-5"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-primary-soft text-[12px] font-semibold text-primary">
                    {step.n}
                  </span>
                  <Icon size={16} className="text-muted" />
                </div>
                <h3 className="mt-4 text-[15px] font-medium text-ink">
                  {step.title}
                </h3>
                <p className="mt-1.5 text-[13px] leading-6 text-muted">
                  {step.body}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </Section>
  );
}
