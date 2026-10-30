import { Eyebrow, Section } from "../ui/Section";
import { Store, Users } from "lucide-react";
import { useLocale } from "@/lib/useLocale";
import type { Translations } from "@/lib/locales";

const cases = [
  {
    titleKey: "useCaseBusiness",
    taglineKey: "useCaseBusinessTagline",
    bodyKey: "useCaseBusinessBody",
    icon: Store,
    badgeKey: "useCaseBusinessBadge",
  },
  {
    titleKey: "useCaseCommunity",
    taglineKey: "useCaseCommunityTagline",
    bodyKey: "useCaseCommunityBody",
    icon: Users,
    badgeKey: "useCaseCommunityBadge",
  },
];

export function UseCases() {
  const { t } = useLocale();

  return (
    <Section id="about">
      <div className="max-w-xl">
        <Eyebrow>{t("useCasesEyebrow")}</Eyebrow>
        <h2 className="font-display text-[28px] leading-snug font-medium tracking-[-0.02em] text-ink md:text-[32px]">
          {t("useCasesHeadline")}
        </h2>
        <p className="mt-3 text-[15px] leading-7 text-muted">
          {t("useCasesBody")}
        </p>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {cases.map((item) => {
          const Icon = item.icon;
          return (
            <article
              key={item.titleKey}
              className="clay clay-lift flex flex-col justify-between rounded-[18px] p-6"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-primary-soft text-primary">
                    <Icon size={18} />
                  </div>
                  <span className="rounded-[6px] bg-canvas px-2 py-0.5 text-[10px] font-medium text-muted">
                    {t(item.badgeKey as unknown as keyof Translations)}
                  </span>
                </div>
                <h3 className="mt-4 font-display text-[20px] font-medium text-ink">
                  {t(item.titleKey as unknown as keyof Translations)}
                </h3>
                <p className="mt-1.5 text-[14px] font-medium text-ink">
                  "{t(item.taglineKey as unknown as keyof Translations)}"
                </p>
                <p className="mt-2.5 text-[13px] leading-6 text-muted">
                  {t(item.bodyKey as unknown as keyof Translations)}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </Section>
  );
}
