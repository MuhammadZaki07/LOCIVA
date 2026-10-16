import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { BusinessType, BusinessCategory, BusinessScale } from '@/lib/umkmCatalog';
import { cn } from '@/lib/utils';
import {
  Search, RefreshCw, AlertCircle, Store, Coffee, Utensils,
  Shirt, Scissors, ShoppingCart, Tag, LayoutGrid, List, X
} from 'lucide-react';
import api from '@/context/apiClient';

interface BusinessCatalogPanelProps {
  selectedTypeId: string | null;
  onSelect: (type: BusinessType) => void;
  isOpen: boolean;
  onClose: () => void;
  isEmbedded?: boolean;
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
  isEmbedded = false,
}) => {
  const [catalogItems, setCatalogItems] = useState<ApiBusinessType[]>([]);
  const [categories, setCategories] = useState<{ category: string; count: number }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const abortRef = useRef<AbortController | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Fetch categories from API
  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get('/business-types/categories');
      if (res.data?.success && Array.isArray(res.data?.data)) {
        setCategories(res.data.data);
      }
    } catch (err) {
      console.warn('Failed to load catalog categories:', err);
    }
  }, []);

  // Fetch catalog items from API with server-side query params and cancellation
  const fetchCatalog = useCallback(async (searchQuery: string, categoryFilter: string) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = { per_page: 60 };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (categoryFilter !== 'All' && categoryFilter !== 'Semua') {
        params.category = categoryFilter;
      }

      const res = await api.get('/business-types', {
        params,
        signal: abortRef.current.signal,
      });

      if (res.data?.success && Array.isArray(res.data?.data?.data)) {
        setCatalogItems(res.data.data.data);
      } else if (res.data?.success && Array.isArray(res.data?.data)) {
        setCatalogItems(res.data.data);
      }
    } catch (err: any) {
      if (err?.name === 'CanceledError' || err?.name === 'AbortError') return;
      console.warn('Failed to load business catalog:', err);
      setError('Unable to load business catalog from server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen, fetchCategories]);

  // 300ms debounced search & filter
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      fetchCatalog(search, selectedCategory);
    }, 300);
    return () => clearTimeout(timer);
  }, [isOpen, search, selectedCategory, fetchCatalog]);

  const handleItemSelect = (item: ApiBusinessType) => {
    const IconComp = (item.icon && iconMap[item.icon]) ? iconMap[item.icon] : Store;
    
    const transformed: BusinessType = {
      id: item.id,
      name: item.name,
      category: (item.category as BusinessCategory) || 'Food & Dining',
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
    onClose();
  };

  if (!isOpen) return null;

  const cardContent = (
    <div className={cn(
      "w-full bg-surface/98 overflow-hidden flex flex-col text-left",
      isEmbedded
        ? "h-full rounded-none border-none shadow-none"
        : "relative clay rounded-3xl max-w-4xl max-h-[88vh] shadow-2xl border border-white/80 animate-in fade-in zoom-in-95 duration-200"
    )}>
      {/* Header Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-200/80 bg-white/70 backdrop-blur-xs flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary-soft text-primary shadow-xs">
              <Store size={22} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-display font-bold text-ink">Business Catalog</h2>
              <p className="text-xs text-muted">
                Select a business type to analyze spatial suitability, footfall, and competitor density
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="hidden sm:flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200/60">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={cn(
                  "p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  viewMode === 'grid' ? "bg-white text-primary shadow-xs" : "text-muted hover:text-ink"
                )}
                title="Grid View"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={cn(
                  "p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  viewMode === 'list' ? "bg-white text-primary shadow-xs" : "text-muted hover:text-ink"
                )}
                title="List View"
              >
                <List size={16} />
              </button>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-muted hover:text-ink transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="p-4 border-b border-slate-100 bg-white/40 space-y-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-muted" />
            <input
              type="text"
              placeholder="Search business models (e.g. Coffee Shop, Laundry, Mart, Bakery)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-100/90 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary text-ink border border-slate-200/70"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              type="button"
              onClick={() => setSelectedCategory('All')}
              className={cn(
                "whitespace-nowrap px-3.5 py-1.5 text-xs rounded-full border transition-all cursor-pointer font-medium",
                selectedCategory === 'All'
                  ? "bg-primary text-white border-primary shadow-xs font-bold"
                  : "bg-white text-muted border-slate-200 hover:border-primary/40"
              )}
            >
              All Categories
            </button>
            {categories.map((c) => (
              <button
                key={c.category}
                type="button"
                onClick={() => setSelectedCategory(c.category)}
                className={cn(
                  "whitespace-nowrap px-3.5 py-1.5 text-xs rounded-full border transition-all cursor-pointer font-medium",
                  selectedCategory === c.category
                    ? "bg-primary text-white border-primary shadow-xs font-bold"
                    : "bg-white text-muted border-slate-200 hover:border-primary/40"
                )}
              >
                {c.category} ({c.count})
              </button>
            ))}
          </div>
        </div>

        {/* Catalog Items Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <RefreshCw className="size-7 text-primary animate-spin" />
              <p className="text-xs text-muted font-medium">Loading verified business models from API...</p>
            </div>
          ) : error ? (
            <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-center space-y-3 max-w-md mx-auto">
              <AlertCircle size={24} className="mx-auto text-red-500" />
              <p className="text-sm text-red-600 font-medium">{error}</p>
              <button
                type="button"
                onClick={() => fetchCatalog(search, selectedCategory)}
                className="px-4 py-1.5 bg-white text-xs font-bold rounded-xl border border-red-200 text-red-700 hover:bg-red-100 transition-colors cursor-pointer"
              >
                Retry Request
              </button>
            </div>
          ) : catalogItems.length === 0 ? (
            <div className="text-center py-16 text-muted text-xs space-y-2">
              <Store size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="font-bold text-ink text-sm">No business models found</p>
              <p>Try searching for a different keyword or select another category filter.</p>
            </div>
          ) : viewMode === 'grid' ? (
            /* Grid View */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-3.5">
              {catalogItems.map((item) => {
                const IconComp = (item.icon && iconMap[item.icon]) ? iconMap[item.icon] : Store;
                const isSelected = selectedTypeId === item.id || selectedTypeId === item.slug;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemSelect(item)}
                    className={cn(
                      "p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group",
                      isSelected
                        ? "border-primary bg-primary-soft/60 clay-soft shadow-sm"
                        : "border-slate-200/80 bg-white hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5"
                    )}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div
                          className={cn(
                            "p-2.5 rounded-xl shrink-0 transition-colors",
                            isSelected ? "bg-primary text-white shadow-xs" : "bg-slate-100 text-muted group-hover:text-primary group-hover:bg-primary-soft"
                          )}
                        >
                          <IconComp size={20} />
                        </div>
                        <span className="text-[10px] text-muted uppercase font-semibold bg-slate-100 px-2 py-0.5 rounded-md">
                          {item.scale || 'Business'}
                        </span>
                      </div>

                      <h3 className="font-bold text-ink text-sm leading-snug group-hover:text-primary transition-colors">
                        {item.name}
                      </h3>

                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-[11px] text-primary font-medium flex items-center gap-1">
                          <Tag size={10} />
                          {item.category}
                        </span>
                        <span className="text-[10.5px] text-muted">
                          · Radius: {item.default_radius_m}m
                        </span>
                      </div>

                      {item.description && (
                        <p className="text-xs text-muted mt-2 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-primary font-bold">
                      <span>Select model</span>
                      <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List View */
            <div className="space-y-2.5">
              {catalogItems.map((item) => {
                const IconComp = (item.icon && iconMap[item.icon]) ? iconMap[item.icon] : Store;
                const isSelected = selectedTypeId === item.id || selectedTypeId === item.slug;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemSelect(item)}
                    className={cn(
                      "p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 group",
                      isSelected
                        ? "border-primary bg-primary-soft/60 clay-soft shadow-sm"
                        : "border-slate-200/80 bg-white hover:border-primary/50 hover:bg-slate-50/80"
                    )}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={cn(
                          "p-2.5 rounded-xl shrink-0 transition-colors",
                          isSelected ? "bg-primary text-white shadow-xs" : "bg-slate-100 text-muted group-hover:text-primary"
                        )}
                      >
                        <IconComp size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-ink text-sm truncate">{item.name}</h3>
                          <span className="text-[9.5px] text-muted uppercase font-semibold bg-slate-100 px-1.5 py-0.5 rounded">
                            {item.scale || 'Business'}
                          </span>
                        </div>
                        <p className="text-xs text-muted truncate mt-0.5">{item.description}</p>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-3 text-right">
                      <div className="text-[11px] text-muted hidden sm:block">
                        <span className="font-medium text-primary">{item.category}</span>
                        <div>Radius {item.default_radius_m}m</div>
                      </div>
                      <span className="px-3 py-1 bg-primary text-white text-xs font-bold rounded-xl shadow-xs group-hover:bg-primary/90">
                        Select
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <div className="p-3.5 border-t border-slate-200 bg-white/70 text-center text-xs text-muted flex items-center justify-between px-6">
          <span>{catalogItems.length} business models available</span>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-primary hover:underline cursor-pointer"
          >
            Done
          </button>
        </div>
    </div>
  );

  if (isEmbedded) {
    return cardContent;
  }

  return (
    <div
      className="fixed inset-0 z-[600] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Business Model Catalog"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-xs"
        onClick={onClose}
      />
      {cardContent}
    </div>
  );
};
