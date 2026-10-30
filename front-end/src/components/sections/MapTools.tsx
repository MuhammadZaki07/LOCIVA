import { Eyebrow, Section } from "../ui/Section";
import { Search, Globe, Compass, Layers } from "lucide-react";
import { useLocale } from "@/lib/useLocale";

export function MapTools() {
  const { t } = useLocale();

  return (
    <Section id="map-tools">
      <div className="grid items-start gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <Eyebrow>{t("mapToolsEyebrow")}</Eyebrow>
          <h2 className="font-display text-[28px] leading-snug font-medium tracking-[-0.02em] text-ink md:text-[32px]">
            {t("mapToolsHeadline")}
          </h2>
          <p className="mt-4 text-[15px] leading-7 text-muted">
            {t("mapToolsBody")}
          </p>
          <p className="mt-2 text-[11px] leading-5 text-muted">
            {t("mapToolsSampleData")}
          </p>
        </div>

        <div className="clay rounded-[18px] p-5 sm:p-6 space-y-4">
          <div className="flex items-start gap-3">
            <Search size={14} className="text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-[12px] font-medium text-ink">{t("mapToolsSearch")}</p>
              <p className="mt-1 text-[12px] leading-5 text-muted">
                {t("mapToolsSearchBody")}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Globe size={14} className="text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-[12px] font-medium text-ink">{t("mapToolsBasemap")}</p>
              <p className="mt-1 text-[12px] leading-5 text-muted">
                {t("mapToolsBasemapBody")}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Compass size={14} className="text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-[12px] font-medium text-ink">{t("mapToolsGps")}</p>
              <p className="mt-1 text-[12px] leading-5 text-muted">
                {t("mapToolsGpsBody")}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Layers size={14} className="text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-[12px] font-medium text-ink">{t("mapToolsLayers")}</p>
              <p className="mt-1 text-[12px] leading-5 text-muted">
                {t("mapToolsLayersBody")}
              </p>
            </div>
          </div>
          <div className="clay-soft rounded-[12px] p-3 border-l-2 border-primary">
            <div className="ml-1">
              <p className="text-[12px] font-medium text-ink">{t("mapToolsNotMalangOnly")}</p>
              <p className="mt-1 text-[12px] leading-5 text-muted">
                {t("mapToolsNotMalangOnlyBody")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
