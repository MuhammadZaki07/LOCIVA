import { ClayButton } from "./ui/ClayButton";
import { MapPreview } from "./MapPreview";
import { Layers, MapPin, Users } from "lucide-react";

export function Hero() {
  return (
    <section id="top" className="px-5 pb-12 pt-8 sm:pt-12 md:px-8 md:pb-16 md:pt-14">
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-12">
        <div>
          {/* Eyebrow badge */}
          <div className="clay-soft mb-3.5 inline-flex items-center gap-2 rounded-[10px] px-3 py-1.5 text-[12px] font-medium text-primary">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span>location intelligence & civic analytics</span>
          </div>

          {/* Headline */}
          <h1 className="font-display text-[34px] leading-[1.18] font-medium tracking-[-0.02em] text-ink sm:text-[44px]">
            Understand the area before you decide.
          </h1>

          {/* Supporting copy */}
          <p className="mt-4 max-w-md text-[15px] leading-7 text-muted">
            Lociva combines location data, business analysis, and community
            reports to help you understand what is happening around a place
            before making a decision.
          </p>

          {/* CTAs */}
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <ClayButton href="#product">explore the map</ClayButton>
            <ClayButton href="#how-it-works" variant="secondary">
              see how it works
            </ClayButton>
          </div>

          {/* Quick core signals footer */}
          <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-[#ececf6] pt-5 text-[12px] text-muted">
            <div className="flex items-center gap-1.5">
              <MapPin size={13} className="text-primary" />
              <span>geospatial layers</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users size={13} className="text-primary" />
              <span>citizen condition reports</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Layers size={13} className="text-primary" />
              <span>location potential score</span>
            </div>
          </div>
        </div>

        {/* Hero Interactive Map Visualization */}
        <div>
          <MapPreview
            variant="hero"
            score={74}
            businessType="cafe"
            selectedLabel="selected location"
          />
        </div>
      </div>
    </section>
  );
}
