import { Eyebrow, Section } from "../ui/Section";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { useLocale } from "@/lib/useLocale";

export function InvalidLocation() {
  const { t } = useLocale();

  return (
    <Section id="invalid-location">
      <div className="grid items-start gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <Eyebrow>{t("invalidLocationEyebrow")}</Eyebrow>
          <h2 className="font-display text-[28px] leading-snug font-medium tracking-[-0.02em] text-ink md:text-[32px]">
            {t("invalidLocationHeadline")}
          </h2>
          <p className="mt-4 text-[15px] leading-7 text-muted">
            {t("invalidLocationBody")}
          </p>
          <p className="mt-2 text-[11px] leading-5 text-muted">
            {t("invalidLocationSampleData")}
          </p>
        </div>

        <div className="clay rounded-[18px] p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck size={14} className="text-primary shrink-0 mt-0.5" />
            <div className="ml-1">
              <p className="text-[12px] font-medium text-ink">
                Coordinate validation before scoring
              </p>
              <p className="mt-1 text-[12px] leading-5 text-muted">
                Candidate coordinates are validated against real geospatial data via reverse geocoding before any score is computed.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <AlertTriangle size={14} className="text-primary shrink-0 mt-0.5" />
            <div className="ml-1">
              <p className="text-[12px] font-medium text-ink">
                Insufficient-data state for sea / unsupported areas
              </p>
              <p className="mt-1 text-[12px] leading-5 text-muted">
                If a candidate point falls in the sea or an unsupported area, the analysis returns an insufficient-data state instead of a misleading score.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
