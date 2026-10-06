import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { TrustStrip } from "./components/TrustStrip";
import { ProblemSection } from "./components/ProblemSection";
import { ProductFlow } from "./components/ProductFlow";
import { BusinessSimulation } from "./components/BusinessSimulation";
import { ScoreBreakdown } from "./components/ScoreBreakdown";
import { WhatIfSimulation } from "./components/WhatIfSimulation";
import { CivicReport } from "./components/CivicReport";
import { ReportImpact } from "./components/ReportImpact";
import { AISection } from "./components/AISection";
import { DataIntelligence } from "./components/DataIntelligence";
import { HowItWorks } from "./components/HowItWorks";
import { UseCases } from "./components/UseCases";
import { CTA } from "./components/CTA";
import { Footer } from "./components/Footer";

function App() {
  return (
    <div className="min-h-svh bg-white text-ink">
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

export default App
