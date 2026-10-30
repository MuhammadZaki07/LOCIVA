import { AISection } from "@/components/sections/AISection";
import { BusinessSimulation } from "@/components/sections/BusinessSimulation";
import { CTA } from "@/components/sections/CTA";
import { CivicReport } from "@/components/sections/CivicReport";
import { DataIntelligence } from "@/components/sections/DataIntelligence";
import { DataTransparency } from "@/components/sections/DataTransparency";
import { Footer } from "@/components/sections/Footer";
import { Hero } from "@/components/sections/Hero";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { InvalidLocation } from "@/components/sections/InvalidLocation";
import { MapTools } from "@/components/sections/MapTools";
import { Navbar } from "@/components/sections/Navbar";
import { Privacy } from "@/components/sections/Privacy";
import { ProblemSection } from "@/components/sections/ProblemSection";
import { ProductFlow } from "@/components/sections/ProductFlow";
import { ReportImpact } from "@/components/sections/ReportImpact";
import { ScoreBreakdown } from "@/components/sections/ScoreBreakdown";
import { SavedCandidates } from "@/components/sections/SavedCandidates";
import { TrustStrip } from "@/components/sections/TrustStrip";
import { UseCases } from "@/components/sections/UseCases";
import { VendorRoutes } from "@/components/sections/VendorRoutes";
import { WhatIfSimulation } from "@/components/sections/WhatIfSimulation";

function LandingPage() {
  return (
    <div className="min-h-svh bg-canvas text-ink">
      <Navbar />
      <main className="max-w-9xl mx-auto">
        <Hero />
        <TrustStrip />
        <ProblemSection />
        <ProductFlow />
        <BusinessSimulation />
        <ScoreBreakdown />
        <WhatIfSimulation />
        <VendorRoutes />
        <SavedCandidates />
        <MapTools />
        <DataTransparency />
        <InvalidLocation />
        <Privacy />
        <CivicReport />
        <ReportImpact />
        <AISection />
        <DataIntelligence />
        <HowItWorks />
        <UseCases />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}

export default LandingPage;
