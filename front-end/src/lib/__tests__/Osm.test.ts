/**
 * Unit tests for @/lib/Osm.ts
 * Tests: bboxQuery, distanceMeters, formatDistance, generateFallbackName logic, cache key quantization
 */

import { describe, it, expect } from "vitest";
import { distanceMeters, formatDistance, bboxQuery } from "../Osm";

describe("distanceMeters", () => {
  it("returns ~0 for identical coordinates", () => {
    expect(distanceMeters(0, 0, 0, 0)).toBeCloseTo(0, 0);
  });

  it("returns ~111km per degree of latitude", () => {
    const d = distanceMeters(0, 0, 1, 0);
    expect(d).toBeGreaterThan(110_000);
    expect(d).toBeLessThan(112_000);
  });

  it("calculates distance between two Malang coords", () => {
    const d = distanceMeters(-7.9797, 112.6304, -7.9536, 112.6154);
    expect(d).toBeGreaterThan(2_000);
    expect(d).toBeLessThan(4_000);
  });
});

describe("formatDistance", () => {
  it("formats under 1000m as metres", () => {
    expect(formatDistance(500)).toBe("500 m");
    expect(formatDistance(0)).toBe("0 m");
    expect(formatDistance(999)).toBe("999 m");
  });

  it("formats 1000m+ as km", () => {
    expect(formatDistance(1000)).toBe("1.0 km");
    expect(formatDistance(1500)).toBe("1.5 km");
  });
});

describe("bboxQuery", () => {
  it("returns valid Overpass QL with bbox", () => {
    const query = bboxQuery(-8.0, 112.5, -7.9, 112.7);
    expect(query).toContain("[out:json]");
    expect(query).toContain("-8.00000,112.50000,-7.90000,112.70000");
    expect(query).toContain("out center tags");
  });

  it("includes amenity and shop filters", () => {
    const query = bboxQuery(-8.0, 112.5, -7.9, 112.7);
    expect(query).toContain("amenity");
    expect(query).toContain("shop");
    expect(query).toContain("restaurant");
  });

  it("handles global bounds without NaN", () => {
    const query = bboxQuery(-90, -180, 90, 180);
    expect(query).not.toContain("NaN");
    expect(query).toContain("-90.00000,-180.00000,90.00000,180.00000");
  });
});

describe("generateFallbackName logic", () => {
  function fallback(tags: Record<string, string>): string {
    const typeLabel =
      tags.amenity?.replace(/_/g, " ") ??
      tags.shop?.replace(/_/g, " ") ??
      tags.tourism?.replace(/_/g, " ") ??
      tags.leisure?.replace(/_/g, " ") ??
      tags.public_transport?.replace(/_/g, " ") ??
      tags.highway?.replace(/_/g, " ") ??
      tags.railway?.replace(/_/g, " ") ??
      "place";
    const cap = typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1);
    const hint = tags["addr:street"] ?? tags["addr:suburb"] ?? tags["addr:village"] ?? tags["addr:city"] ?? "";
    return hint ? `${cap} \u2014 ${hint}` : cap;
  }

  it("generates 'Atm' for unnamed ATM", () => {
    expect(fallback({ amenity: "atm" })).toBe("Atm");
  });

  it("appends address when addr:street is present", () => {
    expect(fallback({ amenity: "atm", "addr:street": "Jl. Sudirman" })).toBe("Atm \u2014 Jl. Sudirman");
  });

  it("replaces underscores with spaces", () => {
    expect(fallback({ amenity: "bus_station" })).toBe("Bus station");
  });

  it("falls back to 'Place' for unknown tag combination", () => {
    expect(fallback({ building: "yes" })).toBe("Place");
  });
});

describe("bbox cache key quantization", () => {
  function quantizeCoord(coord: number, step = 0.005): number {
    return Math.round(coord / step) * step;
  }

  it("nearby coords within 0.005deg may share the same quantized value", () => {
    const a = quantizeCoord(-7.9797);
    const b = quantizeCoord(-7.9800);
    expect(Math.abs(a - b)).toBeLessThanOrEqual(0.005);
  });

  it("coords 0.6deg apart produce different keys", () => {
    expect(quantizeCoord(-7.9).toFixed(3)).not.toBe(quantizeCoord(-8.5).toFixed(3));
  });
});
