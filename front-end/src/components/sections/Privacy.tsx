import { Eyebrow, Section } from "../ui/Section";
import { ShieldCheck, Clock, User } from "lucide-react";
import { useLocale } from "@/lib/useLocale";

export function Privacy() {
  const { t } = useLocale();

  return (
    <Section id="privacy">
      <div className="grid items-start gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <Eyebrow>{t("privacyEyebrow")}</Eyebrow>
          <h2 className="font-display text-[28px] leading-snug font-medium tracking-[-0.02em] text-ink md:text-[32px]">
            {t("privacyHeadline")}
          </h2>
          <p className="mt-4 text-[15px] leading-7 text-muted">
            {t("privacyBody")}
          </p>
          <p className="mt-2 text-[11px] leading-5 text-muted">
            {t("privacySampleData")}
          </p>
        </div>

        <div className="clay rounded-[18px] p-5 sm:p-6 space-y-4">
          <div className="flex items-start gap-3">
            <User size={14} className="text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-[12px] font-medium text-ink">{t("privacyOptIn")}</p>
              <p className="mt-1 text-[12px] leading-5 text-muted">
                {t("privacyOptInBody")}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <ShieldCheck size={14} className="text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-[12px] font-medium text-ink">{t("privacyPrivateRoutes")}</p>
              <p className="mt-1 text-[12px] leading-5 text-muted">
                {t("privacyPrivateRoutesBody")}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock size={14} className="text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-[12px] font-medium text-ink">{t("privacyNoTracking")}</p>
              <p className="mt-1 text-[12px] leading-5 text-muted">
                {t("privacyNoTrackingBody")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
