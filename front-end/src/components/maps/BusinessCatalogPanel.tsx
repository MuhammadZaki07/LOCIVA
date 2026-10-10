import React, { useState, useEffect, useCallback } from 'react';
import type { BusinessType, BusinessCategory, BusinessScale } from '@/lib/umkmCatalog';
import { cn } from '@/lib/utils';
import { Search, RefreshCw, AlertCircle, Store, Coffee, Utensils, Shirt, Scissors, ShoppingCart, Tag } from 'lucide-react';
import api from '@/context/apiClient';

interface BusinessCatalogPanelProps {
  selectedTypeId: string | null;
  onSelect: (type: BusinessType) => void;
  isOpen: boolean;
  onClose: () => void;
}

interface ApiBusinessType {
  id: string;
  name: string;
  slug: string;
  category: string;
  scale: string | null;
  icon: string | null;
  description: string | null;
  default_radius_m: number;
  min_radius_m: number | null;
  max_radius_m: number | null;
  target_demographics: { category: string; weight: number }[] | null;
  competitor_categories: string[] | null;
}

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Coffee: Coffee,
  Utensils: Utensils,
  Shirt: Shirt,
  Scissors: Scissors,
  Store: Store,
  ShoppingCart: ShoppingCart,
};

export const BusinessCatalogPanel: React.FC<BusinessCatalogPanelProps> = ({
  selectedTypeId,
  onSelect,
  isOpen,
  onClose,
}) => {
  const [catalogItems, setCatalogItems] = useState<ApiBusinessType[]>([]);
  const [categories, setCategories] = useState<{ category: string; count: number }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch categories from API
  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get('/business-types/categories');
      if (res.data?.success && Array.isArray(res.data?.data)) {
        setCategories(res.data.data);
      }
    } catch (err) {
      console.warn('Gagal memuat kategori katalog:', err);
    }
  }, []);

  // Fetch catalog items from API
  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = { per_page: 50 };
      if (search.trim()) params.search = search.trim();
      if (selectedCategory !== 'Semua') params.category = selectedCategory;

      const res = await api.get('/business-types', { params });
      
      if (res.data?.success && Array.isArray(res.data?.data?.Data)) {
        setCatalogItems(res?.data?.data?.Data);
      } else if (res.data?.success && Array.isArray(res.data?.data)) {
        setCatalogItems(res?.data?.data);
      }
    } catch (err: any) {
      console.warn('Gagal memuat katalog usaha:', err);
      setError('Gagal memuat data katalog dari server');
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory]);
  

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCatalog();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchCatalog]);

  const handleItemSelect = (item: ApiBusinessType) => {
    // Transform API item to frontend BusinessType interface
    const IconComp = (item.icon && iconMap[item.icon]) ? iconMap[item.icon] : Store;
    
    const transformed: BusinessType = {
      id: item.id,
      name: item.name,
      category: (item.category as BusinessCategory) || 'Makanan & Minuman',
      scale: (item.scale as BusinessScale) || 'warung',
      description: item.description || '',
      icon: IconComp as any,
      defaultRadius: item.default_radius_m || 500,
      minRadius: item.min_radius_m || 100,
      maxRadius: item.max_radius_m || 2000,
      targetDemographics: item.target_demographics || [
        { category: 'commercial', weight: 15 },
        { category: 'residential', weight: 15 }
      ],
      competitorCategories: item.competitor_categories || ['fast_food', 'restaurant', 'cafe']
    };

    onSelect(transformed);
  };

  return (
    <div
      className={cn(
        "fixed md:static inset-y-0 left-0 z-[500] w-full md:w-84 bg-surface border-r border-slate-200 flex flex-col transition-transform duration-300 shadow-xl md:shadow-none",
        !isOpen && "-translate-x-full md:translate-x-0 md:hidden"
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-white/70 backdrop-blur-xs">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary-soft text-primary">
              <Store size={18} />
            </div>
            <h2 className="text-lg font-display font-bold text-ink">Katalog Usaha</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-muted hover:text-ink md:hidden p-1 rounded-lg bg-slate-100"
          >
            Tutup
          </button>
        </div>
        <p className="text-xs text-muted mb-3">
          Basis data jenis usaha terverifikasi dari backend LOCIVA
        </p>

        {/* Search input */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
          <input
            type="text"
            placeholder="Cari jenis usaha..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-100/90 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary text-ink border border-slate-200/60"
          />
        </div>

        {/* Category Pills */}
        <div className="flex space-x-1.5 overflow-x-auto pb-1 scrollbar-hide">
          <button
            type="button"
            onClick={() => setSelectedCategory('Semua')}
            className={cn(
              "whitespace-nowrap px-3 py-1 text-xs rounded-full border transition-all cursor-pointer font-medium",
              selectedCategory === 'Semua'
                ? "bg-primary text-white border-primary shadow-xs"
                : "bg-white text-muted border-slate-200 hover:border-primary/40"
            )}
          >
            Semua
          </button>
          {categories.map((c) => (
            <button
              key={c.category}
              type="button"
              onClick={() => setSelectedCategory(c.category)}
              className={cn(
                "whitespace-nowrap px-3 py-1 text-xs rounded-full border transition-all cursor-pointer font-medium",
                selectedCategory === c.category
                  ? "bg-primary text-white border-primary shadow-xs"
                  : "bg-white text-muted border-slate-200 hover:border-primary/40"
              )}
            >
              {c.category} ({c.count})
            </button>
          ))}
        </div>
      </div>

      {/* Catalog items list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <RefreshCw className="size-6 text-primary animate-spin" />
            <p className="text-xs text-muted">Memuat katalog dari API...</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-center space-y-2">
            <AlertCircle size={20} className="mx-auto text-red-500" />
            <p className="text-xs text-red-600 font-medium">{error}</p>
            <button
              type="button"
              onClick={fetchCatalog}
              className="px-3 py-1 bg-white text-xs font-semibold rounded-lg border border-red-200 text-red-700 hover:bg-red-100"
            >
              Coba Lagi
            </button>
          </div>
        ) : catalogItems.length === 0 ? (
          <div className="text-center py-12 text-muted text-xs space-y-1">
            <Store size={24} className="mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-ink">Tidak ada hasil katalog</p>
            <p>Coba gunakan kata kunci atau kategori yang berbeda.</p>
          </div>
        ) : (
          catalogItems.map((item) => {
            const IconComp = (item.icon && iconMap[item.icon]) ? iconMap[item.icon] : Store;
            const isSelected = selectedTypeId === item.id || selectedTypeId === item.slug;

            return (
              <div
                key={item.id}
                onClick={() => handleItemSelect(item)}
                className={cn(
                  "p-3 rounded-2xl border transition-all cursor-pointer",
                  isSelected
                    ? "border-primary bg-primary-soft/60 clay-soft shadow-sm"
                    : "border-slate-200/80 bg-white hover:border-primary/40 hover:bg-slate-50/80"
                )}
              >
                <div className="flex items-start space-x-3">
                  <div
                    className={cn(
                      "p-2.5 rounded-xl shrink-0 transition-colors",
                      isSelected ? "bg-primary text-white shadow-xs" : "bg-slate-100 text-muted"
                    )}
                  >
                    <IconComp size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-ink text-sm truncate">{item.name}</h3>
                      <span className="text-[10px] text-muted uppercase font-semibold bg-slate-100 px-1.5 py-0.5 rounded">
                        {item.scale || 'usaha'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-primary font-medium flex items-center gap-1">
                        <Tag size={10} />
                        {item.category}
                      </span>
                      <span className="text-[10.5px] text-muted">
                        · Radius: {item.default_radius_m}m
                      </span>
                    </div>

                    {item.description && (
                      <p className="text-xs text-muted mt-1.5 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer count */}
      <div className="p-3 border-t border-slate-200 bg-white/70 text-center text-[11px] text-muted flex items-center justify-between px-4">
        <span>{catalogItems.length} jenis usaha tersedia</span>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-semibold text-primary hover:underline md:hidden"
        >
          Selesai
        </button>
      </div>
    </div>
  );
};
