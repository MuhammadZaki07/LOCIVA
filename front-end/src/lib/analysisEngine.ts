import type { BusinessType } from './umkmCatalog';
import type { Place } from './Osm';
import { distanceMeters, mapCompetitorCategory } from './Osm';

export interface AnalysisFactor {
  key: string;
  label: string;
  value: number;
  impact: 'positive' | 'negative' | 'neutral';
  note: string;
}

export interface AnalysisResult {
  candidateId: string;
  lat: number;
  lng: number;
  radius: number;
  businessTypeId: string;
  opportunityScore: number;
  competitionScore: number;
  accessibilityScore: number;
  dataConfidence: number;
  competitorCount: number;
  nearestCompetitor: { name: string; distance: number } | null;
  relevantPOI: {
    id?: string;
    name: string;
    category: string;
    distance: number;
    lat: number;
    lng: number;
    address?: string;
    relevance: 'high' | 'medium' | 'low';
  }[];
  allPlaces: Place[];
  factors: AnalysisFactor[];
  dataWarnings: string[];
  updatedAt: number;
  internalBusinessCount?: number;
  sources?: { id: string; label: string; count: number; status: string }[];
  limitations?: string;
}

export function calculateAnalysis(
  candidateId: string,
  lat: number,
  lng: number,
  radius: number,
  businessType: BusinessType,
  places: Place[]
): AnalysisResult {
  const factors: AnalysisFactor[] = [];
  const dataWarnings: string[] = [];

  // Calculate distance for all places
  const placesWithDistance = places.map(p => ({
    ...p,
    distance: distanceMeters(lat, lng, p.lat, p.lng)
  })).filter(p => p.distance <= radius);

  // Data Confidence
  let dataConfidence = Math.min(100, (placesWithDistance.length / 50) * 100);
  if (placesWithDistance.length === 0) {
    dataWarnings.push('Tidak ada data POI ditemukan di area ini. Hasil analisis mungkin tidak akurat.');
    dataConfidence = 10;
  } else if (placesWithDistance.length < 10) {
    dataWarnings.push('Data POI di area ini minim. Tingkat kepercayaan data rendah.');
    dataConfidence = Math.max(20, dataConfidence);
  }

  factors.push({
    key: 'data-confidence',
    label: 'Kepadatan Data',
    value: placesWithDistance.length,
    impact: dataConfidence > 70 ? 'positive' : dataConfidence > 40 ? 'neutral' : 'negative',
    note: `${placesWithDistance.length} POI ditemukan dalam radius.`
  });

  // Competitor Analysis
  const competitors = placesWithDistance.filter((p) =>
    businessType.competitorCategories.some((c) => {
      const mapped = mapCompetitorCategory(c);
      return p.category === c || (mapped !== null && p.category === mapped);
    }),
  );
  const competitorCount = competitors.length;
  let nearestCompetitor = null;

  if (competitors.length > 0) {
    competitors.sort((a, b) => a.distance - b.distance);
    nearestCompetitor = {
      name: competitors[0].name,
      distance: competitors[0].distance
    };
  }

  let competitionScore = Math.min(100, (competitorCount / 5) * 100);
  
  factors.push({
    key: 'competition',
    label: 'Tingkat Persaingan',
    value: competitorCount,
    impact: competitorCount > 3 ? 'negative' : competitorCount > 0 ? 'neutral' : 'positive',
    note: competitorCount > 0 ? `${competitorCount} pesaing ditemukan.` : 'Belum ada pesaing terdeteksi.'
  });

  // Opportunity Score
  let oppScore = 40; // Base score
  const relevantPOI: { name: string; category: string; distance: number; relevance: 'high' | 'medium' | 'low' }[] = [];

  const foundCategories = new Set<string>();

  placesWithDistance.forEach(place => {
    const boost = businessType.targetDemographics.find((d) => {
      const mapped = mapCompetitorCategory(d.category);
      return d.category === place.category || mapped === place.category;
    });
    if (boost) {
      if (!foundCategories.has(place.category)) {
        oppScore += boost.weight;
        foundCategories.add(place.category);
      }
      relevantPOI.push({
        id: place.id,
        name: place.name,
        category: place.category,
        distance: place.distance,
        lat: place.lat,
        lng: place.lng,
        address: place.address,
        relevance: boost.weight >= 15 ? 'high' : boost.weight >= 10 ? 'medium' : 'low'
      });
    } else if (!competitors.includes(place)) {
      // General POI gives a tiny boost
      oppScore += 0.5;
    }
  });

  oppScore = Math.min(100, Math.max(0, oppScore));

  factors.push({
    key: 'opportunity',
    label: 'Potensi Pasar',
    value: oppScore,
    impact: oppScore > 70 ? 'positive' : oppScore > 40 ? 'neutral' : 'negative',
    note: `Skor potensi didukung oleh ${foundCategories.size} kategori demografi target.`
  });

  // Accessibility Score (simplified proxy using road proximity or transit)
  const transitCount = placesWithDistance.filter((p) => p.category === "transit").length;
  let accessScore = 50 + (transitCount * 10);
  accessScore = Math.min(100, accessScore);
  
  factors.push({
    key: 'accessibility',
    label: 'Aksesibilitas',
    value: accessScore,
    impact: accessScore > 70 ? 'positive' : accessScore > 40 ? 'neutral' : 'negative',
    note: transitCount > 0 ? `Ditemukan ${transitCount} fasilitas transportasi/akses.` : 'Akses transportasi minim di data.'
  });

  // Sort relevant POI by distance
  relevantPOI.sort((a, b) => a.distance - b.distance);

  return {
    candidateId,
    lat,
    lng,
    radius,
    businessTypeId: businessType.id,
    opportunityScore: Math.round(oppScore),
    competitionScore: Math.round(competitionScore),
    accessibilityScore: Math.round(accessScore),
    dataConfidence: Math.round(dataConfidence),
    competitorCount,
    nearestCompetitor,
    relevantPOI: relevantPOI.slice(0, 10),
    allPlaces: placesWithDistance,
    factors,
    dataWarnings,
    updatedAt: Date.now()
  };
}
