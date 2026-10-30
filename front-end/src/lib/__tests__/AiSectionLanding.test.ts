import { describe, it, expect } from "vitest";
import { en, id } from "../locales";

describe("AI Features Landing Section Configuration", () => {
  it("defines all required AI Section keys in English", () => {
    expect(en.aiEyebrow).toBe("AI-Powered Capabilities");
    expect(en.aiHeadline).toBe("AI-Powered Business Intelligence");
    expect(en.aiBody).toContain("LOCIVA uses AI to help you discover opportunities");
    expect(en.aiExampleLabel).toBe("Example");
    expect(en.aiDemoNote).toContain("verified empirical spatial metrics");

    // Card 01
    expect(en.aiRouteNumber).toBe("01");
    expect(en.aiRouteTitle).toBe("AI Route Recommendation");
    expect(en.aiRouteBadge).toBe("Mobility & Routing");
    expect(en.aiRouteBody).toContain("Recommends suitable routes");
    expect(en.aiRoutePoint1).toBeTruthy();
    expect(en.aiRoutePoint2).toBeTruthy();
    expect(en.aiRoutePoint3).toBeTruthy();
    expect(en.aiRouteExample).toContain("mobile food vendors");

    // Card 02
    expect(en.aiBusinessNumber).toBe("02");
    expect(en.aiBusinessTitle).toBe("AI Business Recommendation");
    expect(en.aiBusinessBadge).toBe("Opportunity Discovery");
    expect(en.aiBusinessBody).toContain("Recommends business opportunities");
    expect(en.aiBusinessPoint1).toBeTruthy();
    expect(en.aiBusinessPoint2).toBeTruthy();
    expect(en.aiBusinessPoint3).toBeTruthy();
    expect(en.aiBusinessExample).toBeTruthy();

    // Card 03
    expect(en.aiDiffNumber).toBe("03");
    expect(en.aiDiffTitle).toBe("AI Business Differentiation");
    expect(en.aiDiffBadge).toBe("Competitive Strategy");
    expect(en.aiDiffBody).toContain("Identifies potential similarities and competition");
    expect(en.aiDiffPoint1).toBeTruthy();
    expect(en.aiDiffPoint2).toBeTruthy();
    expect(en.aiDiffPoint3).toBeTruthy();
    expect(en.aiDiffExample).toBeTruthy();
  });

  it("defines matching Indonesian translations for all AI Section keys", () => {
    expect(id.aiEyebrow).toBe("Kapabilitas Bertenaga AI");
    expect(id.aiHeadline).toBe("AI-Powered Business Intelligence");
    expect(id.aiBody).toContain("LOCIVA menggunakan AI untuk membantu Anda");
    expect(id.aiExampleLabel).toBe("Contoh");
    expect(id.aiDemoNote).toContain("data spasial empiris yang terverifikasi");

    // Card 01
    expect(id.aiRouteNumber).toBe("01");
    expect(id.aiRouteTitle).toBe("AI Route Recommendation");
    expect(id.aiRouteBadge).toBe("Mobilitas & Rute");
    expect(id.aiRouteBody).toContain("Merekomendasikan rute yang sesuai");
    expect(id.aiRouteExample).toContain("pedagang makanan keliling");

    // Card 02
    expect(id.aiBusinessNumber).toBe("02");
    expect(id.aiBusinessTitle).toBe("AI Business Recommendation");
    expect(id.aiBusinessBadge).toBe("Peluang Usaha");
    expect(id.aiBusinessBody).toContain("Merekomendasikan peluang bisnis");

    // Card 03
    expect(id.aiDiffNumber).toBe("03");
    expect(id.aiDiffTitle).toBe("AI Business Differentiation");
    expect(id.aiDiffBadge).toBe("Strategi Kompetitif");
    expect(id.aiDiffBody).toContain("Mengidentifikasi potensi kemiripan dan persaingan");
  });

  it("ensures key symmetry between EN and ID for AI section keys", () => {
    const aiKeys = Object.keys(en).filter((k) => k.startsWith("ai"));
    expect(aiKeys.length).toBeGreaterThanOrEqual(18);

    for (const key of aiKeys) {
      const enVal = (en as Record<string, unknown>)[key];
      const idVal = (id as Record<string, unknown>)[key];
      expect(enVal, `Missing or empty key: ${key} in en`).toBeTruthy();
      expect(idVal, `Missing or empty key: ${key} in id`).toBeTruthy();
    }
  });
});

