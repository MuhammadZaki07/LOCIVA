import React, { useState, useEffect, useCallback, useRef } from "react";
import type {
  BusinessType,
  BusinessCategory,
  BusinessScale,
} from "@/lib/umkmCatalog";
import { cn } from "@/lib/utils";
import {
  Search,
  RefreshCw,
  AlertCircle,
  Store,
  Coffee,
  Utensils,
  Shirt,
  Scissors,
  ShoppingCart,
  Tag,
  LayoutGrid,
  List,
  X,
} from "lucide-react";
import api from "@/context/apiClient";

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

const iconMap: Record<
  string,
  React.ComponentType<{ size?: number; className?: string }>
> = {
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
  const [categories, setCategories] = useState<
    { category: string; count: number }[]
  >([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeSourceTab, setActiveSourceTab] = useState<
    "catalog" | "my_businesses"
  >("catalog");
  const [userBusinesses, setUserBusinesses] = useState<any[]>([]);
  const [loadingUserBusinesses, setLoadingUserBusinesses] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const fetchUserBusinesses = useCallback(async () => {
    if (!token) return;
    setLoadingUserBusinesses(true);
    try {
      const res = await api.get("/businesses/user");
      const data = res.data?.data;
      const items = Array.isArray(data)
        ? data
        : Array.isArray(data?.Data)
          ? data.Data
          : Array.isArray(data?.data)
            ? data.data
            : [];
      setUserBusinesses(items);
    } catch (err) {
      console.warn("Failed to load user businesses:", err);
    } finally {
      setLoadingUserBusinesses(false);
    }
  }, [token]);

  useEffect(() => {
    if (isOpen && token) {
      fetchUserBusinesses();
    }
  }, [isOpen, token, fetchUserBusinesses]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Fetch categories from API
  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get("/business-types/categories");
      if (res.data?.success && Array.isArray(res.data?.data)) {
        setCategories(res.data.data);
      }
    } catch (err) {
      console.warn("Failed to load catalog categories:", err);
    }
  }, []);

  // Fetch catalog items from API with server-side query params and cancellation
  const fetchCatalog = useCallback(
    async (searchQuery: string, categoryFilter: string) => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setLoading(true);
      setError(null);
      try {
        const params: Record<string, any> = { per_page: 60 };
        if (searchQuery.trim()) params.search = searchQuery.trim();
        if (categoryFilter !== "All" && categoryFilter !== "Semua") {
          params.category = categoryFilter;
        }

        const res = await api.get("/business-types", {
          params,
          signal: abortRef.current.signal,
        });

        if (res.data?.success && Array.isArray(res.data?.data?.data)) {
          setCatalogItems(res.data.data.data);
        } else if (res.data?.success && Array.isArray(res.data?.data)) {
          setCatalogItems(res.data.data);
        }
      } catch (err: any) {
        if (err?.name === "CanceledError" || err?.name === "AbortError") return;
        console.warn("Failed to load business catalog:", err);
        setError("Unable to load business catalog from server");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

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

  const handleUserBusinessSelect = (biz: any) => {
    const bType = biz.business_type || {};
    const IconComp =
      bType.icon && iconMap[bType.icon] ? iconMap[bType.icon] : Store;

    const transformed: BusinessType = {
      id: bType.id || biz.business_type_id,
      business_id: biz.id,
      name: biz.name,
      category: (bType.category as BusinessCategory) || "Makanan & Minuman",
      scale: (bType.scale as BusinessScale) || "warung",
      description: biz.address || bType.description || "",
      icon: IconComp as any,
      defaultRadius: bType.default_radius_m || 500,
      minRadius: bType.min_radius_m || 100,
      maxRadius: bType.max_radius_m || 2000,
      targetDemographics: bType.target_demographics || [
        { category: "commercial", weight: 15 },
        { category: "residential", weight: 15 },
      ],
      competitorCategories: bType.competitor_categories || [
        "fast_food",
        "restaurant",
        "cafe",
      ],
    };

    onSelect(transformed);
    onClose();
  };

  const handleItemSelect = (item: ApiBusinessType) => {
    const IconComp =
      item.icon && iconMap[item.icon] ? iconMap[item.icon] : Store;

    const transformed: BusinessType = {
      id: item.id,
      name: item.name,
      category: (item.category as BusinessCategory) || "Food & Dining",
      scale: (item.scale as BusinessScale) || "warung",
      description: item.description || "",
      icon: IconComp as any,
      defaultRadius: item.default_radius_m || 500,
      minRadius: item.min_radius_m || 100,
      maxRadius: item.max_radius_m || 2000,
      targetDemographics: item.target_demographics || [
        { category: "commercial", weight: 15 },
        { category: "residential", weight: 15 },
      ],
      competitorCategories: item.competitor_categories || [
        "fast_food",
        "restaurant",
        "cafe",
      ],
    };

    onSelect(transformed);
    onClose();
  };

  if (!isOpen) return null;

  const cardContent = (
    <div
      className={cn(
        "w-full bg-surface/98 overflow-hidden flex flex-col text-left",
        isEmbedded
          ? "h-full rounded-none border-none shadow-none"
          : "relative clay rounded-3xl max-w-4xl max-h-[88vh] shadow-2xl border border-white/80 animate-in fade-in zoom-in-95 duration-200",
      )}
    >
      {/* Header Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-200/80 bg-white/70 backdrop-blur-xs flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-display font-bold text-ink">
              Business Catalog
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="hidden sm:flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200/60">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  viewMode === "grid"
                    ? "bg-white text-primary shadow-xs"
                    : "text-muted hover:text-ink",
                )}
                title="Grid View"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={cn(
                  "p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  viewMode === "list"
                    ? "bg-white text-primary shadow-xs"
                    : "text-muted hover:text-ink",
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
        <div className="flex items-center gap-2 mt-2">
          <button
            type="button"
            onClick={() => setActiveSourceTab("catalog")}
            className={cn(
              "px-2 py-1 text-xs rounded-lg font-medium transition-all cursor-pointer",
              activeSourceTab === "catalog"
                ? "bg-primary text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200",
            )}
          >
            Katalog Model Usaha
          </button>
          {token && (
            <button
              type="button"
              onClick={() => setActiveSourceTab("my_businesses")}
              className={cn(
                "px-2 py-1 text-xs rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5",
                activeSourceTab === "my_businesses"
                  ? "bg-primary text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200",
              )}
            >
              Usaha Terdaftar Saya
              {userBusinesses.length > 0 && (
                <span className="size-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center">
                  {userBusinesses.length}
                </span>
              )}
            </button>
          )}
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
            onClick={() => setSelectedCategory("All")}
            className={cn(
              "whitespace-nowrap px-3.5 py-1.5 text-xs rounded-full border transition-all cursor-pointer font-medium",
              selectedCategory === "All"
                ? "bg-primary text-white border-primary shadow-xs font-bold"
                : "bg-white text-muted border-slate-200 hover:border-primary/40",
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
                  : "bg-white text-muted border-slate-200 hover:border-primary/40",
              )}
            >
              {c.category} ({c.count})
            </button>
          ))}
        </div>
      </div>

      {/* My Businesses View */}
      {activeSourceTab === "my_businesses" && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {loadingUserBusinesses ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <RefreshCw className="size-7 text-primary animate-spin" />
              <p className="text-xs text-muted font-medium">
                Memuat usaha terdaftar Anda...
              </p>
            </div>
          ) : userBusinesses.length === 0 ? (
            <div className="p-8 text-center space-y-3 max-w-md mx-auto">
              <Store size={36} className="mx-auto text-slate-400" />
              <p className="text-sm font-bold text-ink">
                Belum Ada Usaha Terdaftar
              </p>
              <p className="text-xs text-muted">
                Anda belum mendaftarkan usaha di akun ini. Anda dapat
                menggunakan tab Katalog Usaha atau mendaftarkan usaha Anda
                melalui Dashboard.
              </p>
              <button
                type="button"
                onClick={() => setActiveSourceTab("catalog")}
                className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl"
              >
                Pilih dari Katalog Usaha
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {userBusinesses.map((biz) => {
                const isSelected =
                  selectedTypeId === biz.id ||
                  selectedTypeId === biz.business_type_id;
                return (
                  <div
                    key={biz.id}
                    onClick={() => handleUserBusinessSelect(biz)}
                    className={cn(
                      "p-4 rounded-2xl border transition-all cursor-pointer text-left flex flex-col justify-between hover:shadow-md",
                      isSelected
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-slate-200 bg-white hover:border-primary/40",
                    )}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                          <Store size={16} />
                        </span>
                        <h3 className="text-sm font-bold text-ink truncate">
                          {biz.name}
                        </h3>
                      </div>
                      <p className="text-xs text-muted mb-1">
                        {biz.business_type?.name || "Usaha Terdaftar"} ·{" "}
                        {biz.business_type?.category || "UMKM"}
                      </p>
                      {biz.address && (
                        <p className="text-[11px] text-slate-500 line-clamp-2">
                          {biz.address}
                        </p>
                      )}
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-primary font-semibold">
                        Pilih untuk Simulasi
                      </span>
                      <span className="text-slate-400">
                        Radius ~{biz.business_type?.default_radius_m || 500}m
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Catalog Items Container */}
      {activeSourceTab === "catalog" && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <RefreshCw className="size-7 text-primary animate-spin" />
              <p className="text-xs text-muted font-medium">
                Loading verified business models from API...
              </p>
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
              <p className="font-bold text-ink text-sm">
                No business models found
              </p>
              <p>
                Try searching for a different keyword or select another category
                filter.
              </p>
            </div>
          ) : viewMode === "grid" ? (
            /* Grid View */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-3.5">
              {catalogItems.map((item) => {
                const isSelected =
                  selectedTypeId === item.id || selectedTypeId === item.slug;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemSelect(item)}
                    className={cn(
                      "group cursor-pointer overflow-hidden rounded-2xl border bg-white transition-all duration-200",
                      isSelected
                        ? "border-primary bg-primary-soft/40 shadow-sm"
                        : "border-slate-200/80 hover:border-primary/40 hover:shadow-md",
                    )}
                  >
                    {/* Image */}
                    <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
                      <img
                        src={
                          item.image ||
                          `/images/business-types/${item.slug}.jpg`
                        }
                        alt={item.name}
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = "/image-placeholder.png";
                        }}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />

                      <span className="absolute left-3 top-3 rounded-lg border border-white/70 bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink backdrop-blur-sm">
                        {item.scale || "Business"}
                      </span>

                      {isSelected && (
                        <span className="absolute right-3 top-3 rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm">
                          Selected
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex items-center justify-between gap-3 p-3.5">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-ink transition-colors group-hover:text-primary">
                          {item.name}
                        </h3>

                        <p className="mt-1 truncate text-xs text-muted">
                          {item.category}
                          <span className="mx-1.5 text-slate-300">·</span>
                          Radius {item.default_radius_m} m
                        </p>
                      </div>

                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all",
                          isSelected
                            ? "border-primary bg-primary text-white"
                            : "border-slate-200 text-muted group-hover:border-primary group-hover:text-primary",
                        )}
                      >
                        <span className="text-base leading-none">
                          {isSelected ? "✓" : "↗"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List View */

            <div className="space-y-2">
              {catalogItems.map((item) => {
                const isSelected =
                  selectedTypeId === item.id || selectedTypeId === item.slug;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemSelect(item)}
                    className={cn(
                      "group flex cursor-pointer items-center gap-3 rounded-2xl border p-2.5 transition-all duration-200",
                      isSelected
                        ? "border-primary/60 bg-primary-soft/40 shadow-sm"
                        : "border-slate-200/80 bg-white hover:border-primary/40 hover:shadow-sm",
                    )}
                  >
                    {/* Thumbnail */}
                    <div
                      className={cn(
                        "relative h-[68px] w-[84px] shrink-0 overflow-hidden rounded-xl bg-slate-100",
                        isSelected && "ring-2 ring-primary/20",
                      )}
                    >
                      <img
                        src={
                          item.image ||
                          `/images/business-types/${item.slug}.jpg`
                        }
                        alt={item.name}
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = "/image-placeholder.png";
                        }}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />

                      {isSelected && (
                        <div className="absolute inset-0 bg-primary/10" />
                      )}
                    </div>

                    {/* Business information */}
                    <div className="min-w-0 flex-1 py-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <h3
                          className={cn(
                            "truncate text-sm font-semibold transition-colors",
                            isSelected ? "text-primary" : "text-ink",
                          )}
                        >
                          {item.name}
                        </h3>

                        <span className="hidden shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted sm:inline-flex">
                          {item.scale || "Business"}
                        </span>
                      </div>

                      <p className="mt-1 truncate text-xs text-muted">
                        {item.category}
                      </p>

                      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted">
                        <span className="rounded-md bg-slate-50 px-2 py-1">
                          Radius {item.default_radius_m} m
                        </span>
                      </div>
                    </div>

                    {/* Selection indicator */}
                    <div className="flex shrink-0 items-center pl-1">
                      <div
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-full border transition-all duration-200",
                          isSelected
                            ? "border-primary bg-primary text-white shadow-sm"
                            : "border-slate-200 text-transparent group-hover:border-primary/50",
                        )}
                      >
                        {isSelected ? (
                          <span className="text-xs font-semibold">✓</span>
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-300 group-hover:bg-primary/50" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

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
