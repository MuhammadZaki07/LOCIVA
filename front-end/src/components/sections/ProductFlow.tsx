import { Eyebrow, Section } from "../ui/Section";
import {
  Store,
  MapPin,
  BarChart3,
  HelpCircle,
  SlidersHorizontal,
  CheckCircle2,
} from "lucide-react";
import { useLocale } from "@/lib/useLocale";
import type { Translations } from "@/lib/locales";

const steps = [
  {
    n: "01",
    titleKey: "stepChoose",
    bodyKey: "stepChooseBody",
    icon: Store,
  },
  {
    n: "02",
    titleKey: "stepPlace",
    bodyKey: "stepPlaceBody",
    icon: MapPin,
  },
  {
    n: "03",
    titleKey: "stepAnalyze",
    bodyKey: "stepAnalyzeBody",
    icon: BarChart3,
  },
  {
    n: "04",
    titleKey: "stepUnderstand",
    bodyKey: "stepUnderstandBody",
    icon: HelpCircle,
  },
  {
    n: "05",
    titleKey: "stepSimulate",
    bodyKey: "stepSimulateBody",
    icon: SlidersHorizontal,
  },
  {
    n: "06",
    titleKey: "stepDecide",
    bodyKey: "stepDecideBody",
    icon: CheckCircle2,
  },
];

export function ProductFlow() {
  const { t } = useLocale();

  return (
    <Section id="product">
      <div className="max-w-xl">
        <Eyebrow>{t("productEyebrow")}</Eyebrow>
        <h2 className="font-display text-[28px] leading-snug font-medium tracking-[-0.02em] text-ink md:text-[32px]">
          {t("productHeadline")}
        </h2>
        <p className="mt-3 text-[15px] leading-7 text-muted">
          {t("productBody")}
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
                  {t(step.titleKey as unknown as keyof Translations)}
                </h3>
                <p className="mt-1.5 text-[13px] leading-6 text-muted">
                  {t(step.bodyKey as unknown as keyof Translations)}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </Section>
  );
}
