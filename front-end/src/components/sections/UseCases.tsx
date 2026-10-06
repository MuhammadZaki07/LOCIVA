import { Eyebrow, Section } from "../ui/Section";
import { Store, Users, Building2 } from "lucide-react";

const cases = [
  {
    title: "for business owners",
    tagline: "Find a location that fits your business.",
    body: "Evaluate foot traffic quality, demographic purchasing match, competitor density, and walkability factors before committing real financial capital.",
    icon: Store,
    badge: "commercial analytics",
  },
  {
    title: "for communities",
    tagline: "Report and understand issues around your area.",
    body: "Highlight recurring street defects, dark walkways, flooding, or sanitation bottlenecks on a shared map and confirm local conditions together.",
    icon: Users,
    badge: "civic collaboration",
  },
  {
    title: "for decision makers",
    tagline: "See recurring area signals and patterns.",
    body: "Observe clustered civic reports and commercial growth vectors across districts. Potential future use for organizations and local stakeholders.",
    icon: Building2,
    badge: "area pattern synthesis",
  },
];

export function UseCases() {
  return (
    <Section id="about">
      <div className="max-w-xl">
        <Eyebrow>who it is for</Eyebrow>
        <h2 className="font-display text-[28px] leading-snug font-medium tracking-[-0.02em] text-ink md:text-[32px]">
          Empowering everyone who shapes a neighborhood.
        </h2>
        <p className="mt-3 text-[15px] leading-7 text-muted">
          From independent cafe starters to engaged neighbors and regional planners.
        </p>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {cases.map((item) => {
          const Icon = item.icon;
          return (
            <article
              key={item.title}
              className="clay clay-lift flex flex-col justify-between rounded-[18px] p-6"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-primary-soft text-primary">
                    <Icon size={18} />
                  </div>
                  <span className="rounded-[6px] bg-canvas px-2 py-0.5 text-[10px] font-medium text-muted">
                    {item.badge}
                  </span>
                </div>
                <h3 className="mt-4 font-display text-[20px] font-medium text-ink">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-[14px] font-medium text-ink">
                  "{item.tagline}"
                </p>
                <p className="mt-2.5 text-[13px] leading-6 text-muted">
                  {item.body}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </Section>
  );
}
