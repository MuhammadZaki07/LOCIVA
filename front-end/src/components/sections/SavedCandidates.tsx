import { Eyebrow, Section } from "../ui/Section";
import { MapPin, LayoutList, Trash2 } from "lucide-react";
import { useLocale } from "@/lib/useLocale";

export function SavedCandidates() {
  const { t } = useLocale();

  return (
    <Section id="saved-candidates">
      <div className="grid items-start gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <Eyebrow>{t("savedCandidatesEyebrow")}</Eyebrow>
          <h2 className="font-display text-[28px] leading-snug font-medium tracking-[-0.02em] text-ink md:text-[32px]">
            {t("savedCandidatesHeadline")}
          </h2>
          <p className="mt-4 text-[15px] leading-7 text-muted">
            {t("savedCandidatesBody")}
          </p>
          <p className="mt-2 text-[11px] leading-5 text-muted">
            {t("savedCandidatesSampleData")}
          </p>
        </div>

        <div className="clay rounded-[18px] p-5 sm:p-6 space-y-4">
          <div className="flex items-start gap-3">
            <MapPin size={14} className="text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-[12px] font-medium text-ink">{t("savedCandidatesSave")}</p>
              <p className="mt-1 text-[12px] leading-5 text-muted">
                {t("savedCandidatesSaveBody")}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <LayoutList size={14} className="text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-[12px] font-medium text-ink">{t("savedCandidatesCompare")}</p>
              <p className="mt-1 text-[12px] leading-5 text-muted">
                {t("savedCandidatesCompareBody")}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Trash2 size={14} className="text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-[12px] font-medium text-ink">{t("savedCandidatesDelete")}</p>
              <p className="mt-1 text-[12px] leading-5 text-muted">
                {t("savedCandidatesDeleteBody")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
