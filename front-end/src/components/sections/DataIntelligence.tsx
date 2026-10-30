import { useState } from "react";
import { DemoNote, Eyebrow, Section } from "../ui/Section";
import { MapPreview, type LayerKey } from "./MapPreview";
import { Map, Users, Compass, Store, Navigation, AlertTriangle } from "lucide-react";
import { useLocale } from "@/lib/useLocale";
import type { Translations } from "@/lib/locales";

interface LayerOption {
  id: LayerKey;
  labelKey: string;
  descKey: string;
  icon: typeof Map;
}

const layerOptions: LayerOption[] = [
  {
    id: "geo",
    labelKey: "dataLayerGeo",
    descKey: "dataLayerGeoDesc",
    icon: Map,
  },
  {
    id: "poi",
    labelKey: "dataLayerPoi",
    descKey: "dataLayerPoiDesc",
    icon: Compass,
  },
  {
    id: "business",
    labelKey: "dataLayerBusiness",
    descKey: "dataLayerBusinessDesc",
    icon: Store,
  },
  {
    id: "access",
    labelKey: "dataLayerAccess",
    descKey: "dataLayerAccessDesc",
    icon: Navigation,
  },
  {
    id: "reports",
    labelKey: "dataLayerReports",
    descKey: "dataLayerReportsDesc",
    icon: AlertTriangle,
  },
  {
    id: "population",
    labelKey: "dataLayerPopulation",
    descKey: "dataLayerPopulationDesc",
    icon: Users,
  },
];

export function DataIntelligence() {
  const { t } = useLocale();
  const [activeLayers, setActiveLayers] = useState<LayerKey[]>([
    "geo",
    "poi",
    "business",
    "reports",
  ]);

  function toggle(id: LayerKey) {
    setActiveLayers((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  return (
    <Section id="intelligence">
      <div className="grid items-start gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <Eyebrow>{t("dataEyebrow")}</Eyebrow>
          <h2 className="font-display text-[28px] leading-snug font-medium tracking-[-0.02em] text-ink md:text-[32px]">
            {t("dataHeadline")}
          </h2>
          <p className="mt-4 text-[15px] leading-7 text-muted">
            {t("dataBody")}
          </p>

          {/* Interactive layer toggles list */}
          <ul className="mt-6 space-y-2">
            {layerOptions.map((layer) => {
              const isOn = activeLayers.includes(layer.id);
              const Icon = layer.icon;
              return (
                <li key={layer.id}>
                  <button
                    type="button"
                    onClick={() => toggle(layer.id)}
                    className={`clay-press flex w-full items-center justify-between rounded-[14px] p-3 text-left transition-all ${
                      isOn ? "clay bg-white" : "clay-soft opacity-70"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-[6px] ${
                        isOn ? "bg-primary-soft text-primary" : "bg-canvas text-muted"
                      }`}>
                        <Icon size={13} />
                      </div>
                      <div>
                        <p className={`text-[13px] font-medium ${isOn ? "text-ink" : "text-muted"}`}>
                          {t(layer.labelKey as unknown as keyof Translations)}
                        </p>
                        <p className="mt-0.5 text-[11px] leading-4 text-muted">
                          {t(layer.descKey as unknown as keyof Translations)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`ml-2 h-2.5 w-2.5 shrink-0 rounded-full transition-colors ${
                        isOn ? "bg-primary ring-4 ring-primary/20" : "bg-[#d8d8e6]"
                      }`}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Map Preview reacting to the layers */}
        <div>
          <MapPreview
            variant="layers"
            layers={activeLayers}
            showScore={activeLayers.includes("business")}
            catchment={activeLayers.includes("access") || activeLayers.includes("population")}
            sampleData
          />
        </div>
      </div>

      <DemoNote>{t("dataDemoNote")}</DemoNote>
    </Section>
  );
}
