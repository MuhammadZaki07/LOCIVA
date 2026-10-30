import { Eyebrow, Section } from "../ui/Section";
import { Database, Globe, Building2, AlertTriangle } from "lucide-react";
import { useLocale } from "@/lib/useLocale";

export function DataTransparency() {
  const { t } = useLocale();

  return (
    <Section id="data-transparency">
      <div className="grid items-start gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <Eyebrow>{t("dataTransparencyEyebrow")}</Eyebrow>
          <h2 className="font-display text-[28px] leading-snug font-medium tracking-[-0.02em] text-ink md:text-[32px]">
            {t("dataTransparencyHeadline")}
          </h2>
          <p className="mt-4 text-[15px] leading-7 text-muted">
            {t("dataTransparencyBody")}
          </p>
          <p className="mt-2 text-[11px] leading-5 text-muted">
            {t("dataTransparencySampleData")}
          </p>
        </div>

        <div className="clay rounded-[18px] p-5 sm:p-6 space-y-4">
          <div className="flex items-start gap-3">
            <Globe size={14} className="text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-[12px] font-medium text-ink">{t("dataTransparencyOsm")}</p>
              <p className="mt-1 text-[12px] leading-5 text-muted">
                {t("dataTransparencyOsmBody")}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Database size={14} className="text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-[12px] font-medium text-ink">{t("dataTransparencyInternal")}</p>
              <p className="mt-1 text-[12px] leading-5 text-muted">
                {t("dataTransparencyInternalBody")}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Building2 size={14} className="text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-[12px] font-medium text-ink">{t("dataTransparencyBps")}</p>
              <p className="mt-1 text-[12px] leading-5 text-muted">
                {t("dataTransparencyBpsBody")}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <AlertTriangle size={14} className="text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-[12px] font-medium text-ink">{t("dataTransparencyReports")}</p>
              <p className="mt-1 text-[12px] leading-5 text-muted">
                {t("dataTransparencyReportsBody")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
