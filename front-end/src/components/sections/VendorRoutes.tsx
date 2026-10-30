import { Eyebrow, Section } from "../ui/Section";
import { MapPin, Route, Share2, ShieldCheck, Clock } from "lucide-react";
import { useLocale } from "@/lib/useLocale";

export function VendorRoutes() {
  const { t } = useLocale();

  return (
    <Section id="vendor-routes">
      <div className="grid items-start gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <Eyebrow>{t("vendorRoutesEyebrow")}</Eyebrow>
          <h2 className="font-display text-[28px] leading-snug font-medium tracking-[-0.02em] text-ink md:text-[32px]">
            {t("vendorRoutesHeadline")}
          </h2>
          <p className="mt-4 text-[15px] leading-7 text-muted">
            {t("vendorRoutesBody")}
          </p>
          <p className="mt-2 text-[11px] leading-5 text-muted">
            {t("vendorRoutesSampleData")}
          </p>
        </div>

        <div className="clay rounded-[18px] p-5 sm:p-6 space-y-4">
          <div className="flex items-start gap-3">
            <MapPin size={14} className="text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-[12px] font-medium text-ink">{t("vendorRoutesWaypoints")}</p>
              <p className="mt-1 text-[12px] leading-5 text-muted">
                {t("vendorRoutesWaypointsBody")}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Route size={14} className="text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-[12px] font-medium text-ink">{t("vendorRoutesRouting")}</p>
              <p className="mt-1 text-[12px] leading-5 text-muted">
                {t("vendorRoutesRoutingBody")}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Share2 size={14} className="text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-[12px] font-medium text-ink">{t("vendorRoutesSave")}</p>
              <p className="mt-1 text-[12px] leading-5 text-muted">
                {t("vendorRoutesSaveBody")}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock size={14} className="text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-[12px] font-medium text-ink">{t("vendorRoutesSpotJitu")}</p>
              <p className="mt-1 text-[12px] leading-5 text-muted">
                {t("vendorRoutesSpotJituBody")}
              </p>
            </div>
          </div>
          <div className="clay-soft rounded-[12px] p-3 border-l-2 border-primary">
            <ShieldCheck size={13} className="text-primary shrink-0 mt-0.5" />
            <div className="ml-6">
              <p className="text-[12px] font-medium text-ink">{t("vendorRoutesPrivate")}</p>
              <p className="mt-1 text-[12px] leading-5 text-muted">
                {t("vendorRoutesDemoVendorsBody")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
