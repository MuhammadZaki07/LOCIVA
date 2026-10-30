import { ClayButton } from "../ui/ClayButton";
import { useLocale } from "@/lib/useLocale";

export function CTA() {
  const { t } = useLocale();

  return (
    <section className="px-5 pb-16 md:px-8 md:pb-24">
      <div className="mx-auto max-w-6xl clay rounded-[18px] px-6 py-12 text-center md:px-14 md:py-16">
        <h2 className="font-display text-[30px] leading-snug font-medium tracking-[-0.02em] text-ink sm:text-[36px]">
          {t("ctaHeadline")}
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-[15px] leading-7 text-muted">
          {t("ctaBody")}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ClayButton href="#product">{t("ctaExploreLociva")}</ClayButton>
          <ClayButton href="#how-it-works" variant="secondary">
            {t("ctaViewConcept")}
          </ClayButton>
        </div>
      </div>
    </section>
  );
}
