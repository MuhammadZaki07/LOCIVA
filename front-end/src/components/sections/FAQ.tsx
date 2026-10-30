import { useState } from "react";
import { Eyebrow, Section } from "../ui/Section";
import { ChevronDown } from "lucide-react";
import { useLocale } from "@/lib/useLocale";
import type { Translations } from "@/lib/locales";

const faqs = [
  {
    q: "What is location intelligence?",
    a: "Location intelligence is the process of analyzing geographic and spatial data to understand the characteristics of a specific area and support better decision-making. LOCIVA applies location intelligence to business decisions by combining points of interest, demographic data, competitor presence, accessibility, and community-reported area conditions into a single Location Potential Score.",
  },
  {
    q: "How does LOCIVA evaluate a business location?",
    a: "LOCIVA evaluates a business location by analyzing multiple factors within a user-defined catchment radius: population density (from BPS data where available), pedestrian activity (from OpenStreetMap POI data), accessibility (transit and road access), target market match (based on business type demographics), competition density (nearby similar businesses), and area condition (community reports of infrastructure issues). These factors are combined into a Location Potential Score from 0 to 100, categorized as Potential, Consideration, or Needs Review.",
  },
  {
    q: "What data sources does LOCIVA use?",
    a: "LOCIVA uses several data sources: OpenStreetMap for points of interest, roads, and land use; Badan Pusat Statistik (BPS) for official population and density statistics (available for supported regions); LOCIVA's own database for registered businesses and internal POIs; community-submitted reports with photos and verification; OSRM for real road routing; and Nominatim for place search. Each source's contribution and limitations are shown in the analysis panel.",
  },
  {
    q: "Is the data on LOCIVA real-time?",
    a: "No. LOCIVA does not provide real-time traffic or live data. OpenStreetMap data is served from LOCIVA's own database (imported from Geofabrik extracts) with spatial caching. BPS demographic data is based on official census/projection statistics. Community reports reflect citizen-submitted observations at the time of submission. Scores are decision-support indices, not live metrics.",
  },
  {
    q: "Can LOCIVA guarantee a profitable business location?",
    a: "No. LOCIVA provides decision-support analysis based on available data. Scores indicate potential based on spatial factors but do not guarantee business success, revenue, or profitability. Actual outcomes depend on many factors beyond location data, including execution, market timing, and competition dynamics.",
  },
  {
    q: "What happens if I place a candidate in the sea or an unsupported area?",
    a: "LOCIVA validates candidate coordinates against real geospatial data before scoring. If a location is in the sea, offshore waters, or an unsupported area, the analysis returns an insufficient-data state instead of a misleading score. No score is computed for invalid locations.",
  },
  {
    q: "Are my routes and location data private?",
    a: "Yes. Saved routes are private by default — sharing requires an explicit opt-in action. Live GPS location sharing is opt-in only and stops when disabled. There is no real-time tracking or location broadcasting. Demo vendors are clearly labeled [DEMO] and are not real users.",
  },
  {
    q: "How does AI work in LOCIVA?",
    a: "AI in LOCIVA is used as an enhancement layer, not as the score producer. The location potential score is computed from empirical spatial data (POI, demographics, competition, reports). AI is used for route recommendations, selling-spot suggestions, and business differentiation strategies when users choose to explore options in competitive areas. AI interprets and suggests; empirical data provides the baseline truth.",
  },
];

export function FAQ() {
  const { t } = useLocale();
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <Section id="faq">
      <div className="max-w-3xl mx-auto">
        <Eyebrow>{t("faqEyebrow" as unknown as keyof Translations)}</Eyebrow>
        <h2 className="font-display text-[28px] leading-snug font-medium tracking-[-0.02em] text-ink md:text-[32px]">
          {t("faqHeadline" as unknown as keyof Translations)}
        </h2>
        <p className="mt-3 text-[15px] leading-7 text-muted">
          {t("faqBody" as unknown as keyof Translations)}
        </p>
      </div>

      <div className="mt-8 max-w-3xl mx-auto space-y-3">
        {faqs.map((faq, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div
              key={idx}
              className="clay-soft rounded-[14px] overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                className="w-full flex items-center justify-between gap-3 p-4 text-left"
                aria-expanded={isOpen}
              >
                <span className="text-[13px] font-medium text-ink">{faq.q}</span>
                <ChevronDown
                  size={16}
                  className={`text-muted shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isOpen && (
                <div className="px-4 pb-4">
                  <p className="text-[13px] leading-6 text-muted">{faq.a}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* FAQPage structured data */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": faqs.map((f) => ({
            "@type": "Question",
            "name": f.q,
            "acceptedAnswer": {
              "@type": "Answer",
              "text": f.a,
            },
          })),
        })}
      </script>
    </Section>
  );
}
