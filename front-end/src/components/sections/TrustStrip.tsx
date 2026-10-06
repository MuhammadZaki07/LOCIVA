import { DemoNote } from "../ui/Section";
import { Users, Store, AlertTriangle, Compass } from "lucide-react";

const signals = [
  {
    icon: Users,
    label: "population data",
    note: "who lives, works, and moves nearby",
    indicator: "density & demographics",
  },
  {
    icon: Store,
    label: "business activity",
    note: "existing shops, competitors & footfall",
    indicator: "commercial saturation",
  },
  {
    icon: AlertTriangle,
    label: "area reports",
    note: "community-observed infrastructure issues",
    indicator: "verified ground truth",
  },
  {
    icon: Compass,
    label: "location signals",
    note: "accessibility, catchment & compatibility",
    indicator: "predictive scoring",
  },
];

export function TrustStrip() {
  return (
    <section className="px-5 md:px-8">
      <div className="mx-auto max-w-6xl clay rounded-[16px] p-6 md:p-8">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <p className="font-display text-[20px] font-medium text-ink">
            one area. multiple perspectives.
          </p>
          <span className="text-[12px] text-muted">
            multi-layer intelligence framework
          </span>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {signals.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="clay-soft clay-lift flex flex-col justify-between rounded-[14px] p-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-primary-soft text-primary">
                      <Icon size={14} />
                    </div>
                    <p className="text-[13px] font-medium text-ink">{item.label}</p>
                  </div>
                  <p className="mt-2 text-[12px] leading-5 text-muted">{item.note}</p>
                </div>
                <div className="mt-4 border-t border-[#f0f0f8] pt-2.5">
                  <span className="text-[11px] font-medium text-primary">
                    {item.indicator}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <DemoNote>
          Signals shown illustrate the analytical model of LOCIVA. No fake numbers are presented as live municipal metrics.
        </DemoNote>
      </div>
    </section>
  );
}
