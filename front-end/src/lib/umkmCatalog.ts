import { 
  Store, 
  Coffee, 
  Utensils, 
  Shirt, 
  Scissors, 
  ShoppingCart
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type BusinessCategory = 'Makanan & Minuman' | 'Layanan' | 'Retail';
export type BusinessScale = 'gerobak' | 'warung' | 'toko' | 'ruko' | 'kios';

export interface POIWeight {
  category: string;
  weight: number;
}

export interface BusinessType {
  id: string;
  slug?: string;
  name: string;
  category: BusinessCategory;
  scale: BusinessScale;
  description: string;
  icon: LucideIcon;
  defaultRadius: number; // meters
  minRadius: number;
  maxRadius: number;
  targetDemographics: POIWeight[]; // Points to boost Opportunity Score
  competitorCategories: string[];  // OSM categories that count as competitors
}

export const UMKM_CATALOG: BusinessType[] = [
  {
    id: 'gerobak-seblak',
    name: 'Gerobak Seblak',
    category: 'Makanan & Minuman',
    scale: 'gerobak',
    description: 'Jajanan kekinian pedas, target utama pelajar dan mahasiswa.',
    icon: Utensils,
    defaultRadius: 400,
    minRadius: 100,
    maxRadius: 1000,
    targetDemographics: [
      { category: 'school', weight: 15 },
      { category: 'university', weight: 18 },
      { category: 'college', weight: 18 },
      { category: 'commercial', weight: 12 }, // office
      { category: 'marketplace', weight: 10 },
      { category: 'bus_station', weight: 8 },
    ],
    competitorCategories: ['fast_food', 'cafe', 'food_court'], // Broad, refine as needed
  },
  {
    id: 'gerobak-bakso',
    name: 'Gerobak Bakso',
    category: 'Makanan & Minuman',
    scale: 'gerobak',
    description: 'Makanan berkuah populer, cocok di dekat perumahan atau pasar.',
    icon: Utensils,
    defaultRadius: 400,
    minRadius: 100,
    maxRadius: 1000,
    targetDemographics: [
      { category: 'residential', weight: 15 },
      { category: 'marketplace', weight: 15 },
      { category: 'school', weight: 10 },
      { category: 'commercial', weight: 10 },
    ],
    competitorCategories: ['restaurant', 'fast_food', 'food_court'],
  },
  {
    id: 'kedai-kopi',
    name: 'Kedai Kopi',
    category: 'Makanan & Minuman',
    scale: 'warung',
    description: 'Tempat nongkrong ngopi, cocok dekat kampus atau perkantoran.',
    icon: Coffee,
    defaultRadius: 700,
    minRadius: 200,
    maxRadius: 1500,
    targetDemographics: [
      { category: 'university', weight: 18 },
      { category: 'college', weight: 18 },
      { category: 'commercial', weight: 15 },
      { category: 'park', weight: 10 },
      { category: 'community_centre', weight: 10 },
    ],
    competitorCategories: ['cafe'],
  },
  {
    id: 'warung-makan',
    name: 'Warung Makan',
    category: 'Makanan & Minuman',
    scale: 'warung',
    description: 'Menyediakan makanan berat harian.',
    icon: Utensils,
    defaultRadius: 700,
    minRadius: 200,
    maxRadius: 1500,
    targetDemographics: [
      { category: 'commercial', weight: 15 },
      { category: 'university', weight: 15 },
      { category: 'industrial', weight: 15 },
      { category: 'marketplace', weight: 10 },
      { category: 'bus_station', weight: 10 },
    ],
    competitorCategories: ['restaurant', 'fast_food', 'food_court'],
  },
  {
    id: 'laundry',
    name: 'Laundry',
    category: 'Layanan',
    scale: 'kios',
    description: 'Layanan cuci pakaian, sangat butuh pemukiman padat atau kos.',
    icon: Shirt,
    defaultRadius: 1000,
    minRadius: 300,
    maxRadius: 2000,
    targetDemographics: [
      { category: 'residential', weight: 20 },
      { category: 'apartments', weight: 20 },
      { category: 'university', weight: 15 },
      { category: 'college', weight: 15 },
    ],
    competitorCategories: ['laundry'],
  },
  {
    id: 'barbershop',
    name: 'Barbershop',
    category: 'Layanan',
    scale: 'kios',
    description: 'Pangkas rambut pria.',
    icon: Scissors,
    defaultRadius: 800,
    minRadius: 200,
    maxRadius: 2000,
    targetDemographics: [
      { category: 'residential', weight: 15 },
      { category: 'university', weight: 10 },
      { category: 'commercial', weight: 10 },
    ],
    competitorCategories: ['hairdresser'],
  },
  {
    id: 'toko-kelontong',
    name: 'Toko Kelontong',
    category: 'Retail',
    scale: 'toko',
    description: 'Menjual kebutuhan sehari-hari.',
    icon: Store,
    defaultRadius: 500,
    minRadius: 100,
    maxRadius: 1500,
    targetDemographics: [
      { category: 'residential', weight: 20 },
      { category: 'apartments', weight: 15 },
    ],
    competitorCategories: ['convenience', 'supermarket'],
  },
  {
    id: 'minimarket',
    name: 'Minimarket',
    category: 'Retail',
    scale: 'ruko',
    description: 'Retail modern skala kecil.',
    icon: ShoppingCart,
    defaultRadius: 1200,
    minRadius: 500,
    maxRadius: 3000,
    targetDemographics: [
      { category: 'residential', weight: 15 },
      { category: 'bus_station', weight: 12 },
      { category: 'gas', weight: 10 },
      { category: 'commercial', weight: 10 },
    ],
    competitorCategories: ['convenience', 'supermarket'],
  }
];

export function getBusinessType(id: string): BusinessType | undefined {
  return UMKM_CATALOG.find(b => b.id === id);
}
