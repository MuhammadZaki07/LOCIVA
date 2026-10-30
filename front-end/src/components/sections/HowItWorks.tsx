import { Eyebrow, Section } from "../ui/Section";
import { MousePointerClick, Search, SlidersHorizontal, CheckCircle2 } from "lucide-react";
import { useLocale } from "@/lib/useLocale";
import type { Translations } from "@/lib/locales";

const steps = [
  {
    n: "01",
    titleKey: "howStepChoose",
    bodyKey: "howStepChooseBody",
    detailKey: "howStepChooseDetail",
    icon: MousePointerClick,
  },
  {
    n: "02",
    titleKey: "howStepExplore",
    bodyKey: "howStepExploreBody",
    detailKey: "howStepExploreDetail",
    icon: Search,
  },
  {
    n: "03",
    titleKey: "howStepSimulate",
    bodyKey: "howStepSimulateBody",
    detailKey: "howStepSimulateDetail",
    icon: SlidersHorizontal,
  },
  {
    n: "04",
    titleKey: "howStepDecide",
    bodyKey: "howStepDecideBody",
    detailKey: "howStepDecideDetail",
    icon: CheckCircle2,
  },
];

export function HowItWorks() {
  const { t } = useLocale();

  return (
    <Section id="how-it-works">
      <div className="max-w-xl">
        <Eyebrow>{t("howEyebrow")}</Eyebrow>
        <h2 className="font-display text-[28px] leading-snug font-medium tracking-[-0.02em] text-ink md:text-[32px]">
          {t("howHeadline")}
        </h2>
        <p className="mt-3 text-[15px] leading-7 text-muted">
          {t("howBody")}
        </p>
      </div>

      <div className="relative mt-10">
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
                    {t(step.titleKey as unknown as keyof Translations)}
                  </h3>
                  <p className="mt-1 text-[13.5px] font-medium text-ink">
                    {t(step.bodyKey as unknown as keyof Translations)}
                  </p>
                  <p className="mt-2 text-[12px] leading-5 text-muted">
                    {t(step.detailKey as unknown as keyof Translations)}
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
