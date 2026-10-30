import { DemoNote } from "../ui/Section";
import { Users, Store, AlertTriangle, Compass } from "lucide-react";
import { useLocale } from "@/lib/useLocale";
import type { Translations } from "@/lib/locales";

const signals = [
  {
    icon: Users,
    labelKey: "trustSignalPopulation",
    noteKey: "trustSignalPopulationNote",
    indicatorKey: "trustSignalPopulationIndicator",
  },
  {
    icon: Store,
    labelKey: "trustSignalBusiness",
    noteKey: "trustSignalBusinessNote",
    indicatorKey: "trustSignalBusinessIndicator",
  },
  {
    icon: AlertTriangle,
    labelKey: "trustSignalReports",
    noteKey: "trustSignalReportsNote",
    indicatorKey: "trustSignalReportsIndicator",
  },
  {
    icon: Compass,
    labelKey: "trustSignalAccess",
    noteKey: "trustSignalAccessNote",
    indicatorKey: "trustSignalAccessIndicator",
  },
];

export function TrustStrip() {
  const { t } = useLocale();

  return (
    <section className="px-5 md:px-8">
      <div className="mx-auto max-w-6xl clay rounded-[16px] p-6 md:p-8">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <p className="font-display text-[20px] font-medium text-ink">
            {t("trustEyebrow")}
          </p>
          <span className="text-[12px] text-muted">{t("trustSubtitle")}</span>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {signals.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.labelKey}
                className="clay-soft clay-lift flex flex-col justify-between rounded-[14px] p-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-primary-soft text-primary">
                      <Icon size={14} />
                    </div>
                    <p className="text-[13px] font-medium text-ink">
                      {t(item.labelKey as unknown as keyof Translations)}
                    </p>
                  </div>
                  <p className="mt-2 text-[12px] leading-5 text-muted">
                    {t(item.noteKey as unknown as keyof Translations)}
                  </p>
                </div>
                <div className="mt-4 border-t border-[#f0f0f8] pt-2.5">
                  <span className="text-[11px] font-medium text-primary">
                    {t(item.indicatorKey as unknown as keyof Translations)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <DemoNote>{t("trustDemoNote")}</DemoNote>
      </div>
    </section>
  );
}
