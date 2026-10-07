import { AISection } from "@/components/sections/AISection";
import { BusinessSimulation } from "@/components/sections/BusinessSimulation";
import { CivicReport } from "@/components/sections/CivicReport";
import { CTA } from "@/components/sections/CTA";
import { DataIntelligence } from "@/components/sections/DataIntelligence";
import { Footer } from "@/components/sections/Footer";
import { Hero } from "@/components/sections/Hero";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { Navbar } from "@/components/sections/Navbar";
import { ProblemSection } from "@/components/sections/ProblemSection";
import { ProductFlow } from "@/components/sections/ProductFlow";
import { ReportImpact } from "@/components/sections/ReportImpact";
import { ScoreBreakdown } from "@/components/sections/ScoreBreakdown";
import { TrustStrip } from "@/components/sections/TrustStrip";
import { UseCases } from "@/components/sections/UseCases";
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
