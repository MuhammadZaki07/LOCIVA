import React, { useState, useEffect, useCallback, useRef } from "react";
import api, { classifyApiError } from "@/context/apiClient";
import { useToast } from "@/components/ui/Toast";
import { useDebounce } from "@/hooks/useDebounce";
import {
  Bookmark,
  Trash2,
  MapPin,
  Calendar,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  X,
  Target,
  HelpCircle,
  Search,
  Store,
} from "lucide-react";

export interface SavedCandidateItem {
  id: string;
  candidate_id: string;
  latitude: number;
  longitude: number;
  radius_m: number;
  business_type: {
    id: string;
    name: string;
    slug: string;
  } | null;
  location: {
    name?: string;
    address?: string;
  } | null;
  score: {
    total_score: number;
    target_market_score: number;
    competition_score: number;
    accessibility_score: number;
  } | null;
  created_at?: string;
}

export interface SavedSimulationSession {
  id: string;
  name: string;
  description?: string;
  simulations: SavedCandidateItem[];
  created_at: string;
}

export interface UserBusinessItem {
  id: string;
  name: string;
  business_type?: {
    id: string;
    name: string;
  };
}

interface SavedCandidatesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCandidate: (candidate: SavedCandidateItem) => void;
  selectedBusinessId?: string | null;
  selectedBusinessTypeId?: string | null;
  selectedBusinessName?: string | null;
}

interface PaginationMeta {
  current_page?: number;
  last_page?: number;
  total?: number;
}

interface SessionPage {
  sessions: SavedSimulationSession[];
  meta: PaginationMeta | null;
}

/**
 * Mendukung beberapa kemungkinan bentuk response ApiResponse
 * dan Laravel ResourceCollection dengan pagination.
 */
const parseSessionPage = (response: any): SessionPage => {
  const candidates = [
    {
      data: response?.data?.data,
      meta: response?.data?.meta,
    },
    {
      data: response?.data?.data?.data,
      meta: response?.data?.data?.meta,
    },
    {
      data: response?.data?.data?.data?.data,
      meta: response?.data?.data?.data?.meta,
    },
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate.data)) {
      return {
        sessions: candidate.data,
        meta: candidate.meta ?? null,
      };
    }
  }

  return {
    sessions: [],
    meta: null,
  };
};

const ITEMS_PER_PAGE = 10;

export const SavedCandidatesPanel: React.FC<SavedCandidatesPanelProps> = ({
  isOpen,
  onClose,
  onSelectCandidate,
  selectedBusinessId,
  selectedBusinessTypeId,
  selectedBusinessName,
}) => {
  const [sessions, setSessions] = useState<SavedSimulationSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Internal filter state synchronized with props but user-changeable
  const [filterBusinessId, setFilterBusinessId] = useState<string | null>(selectedBusinessId ?? null);
  const [filterBusinessTypeId, setFilterBusinessTypeId] = useState<string | null>(selectedBusinessTypeId ?? null);
  const [filterBusinessName, setFilterBusinessName] = useState<string | null>(selectedBusinessName ?? null);
  const [userBusinesses, setUserBusinesses] = useState<UserBusinessItem[]>([]);
  const [loadingBusinesses, setLoadingBusinesses] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false);
  const requestIdRef = useRef(0);
  const prevBusinessRef = useRef<string | null>(null);

  // Sync with incoming props when changed from parent
  useEffect(() => {
    setFilterBusinessId(selectedBusinessId ?? null);
    setFilterBusinessTypeId(selectedBusinessTypeId ?? null);
    setFilterBusinessName(selectedBusinessName ?? null);
  }, [selectedBusinessId, selectedBusinessTypeId, selectedBusinessName]);

  // Load user businesses to populate the business filter dropdown
  useEffect(() => {
    if (!isOpen) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    const fetchBiz = async () => {
      setLoadingBusinesses(true);
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
        console.warn("Failed to load user businesses in SavedCandidatesPanel:", err);
      } finally {
        setLoadingBusinesses(false);
      }
    };
    fetchBiz();
  }, [isOpen]);

  // Reset pencarian ketika usaha yang dipilih berubah
  useEffect(() => {
    const currentBizKey = `${filterBusinessId || ""}-${filterBusinessTypeId || ""}`;
    if (prevBusinessRef.current !== null && prevBusinessRef.current !== currentBizKey) {
      setSearchQuery("");
    }
    prevBusinessRef.current = currentBizKey;
  }, [filterBusinessId, filterBusinessTypeId]);

  const { toast } = useToast();

  /**
   * Mengambil halaman pertama.
   * Dipanggil ketika panel dibuka atau pencarian berubah.
   */
  const fetchSavedSessions = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const token = localStorage.getItem("token");

    loadingMoreRef.current = false;
    setIsLoadingMore(false);
    setIsLoading(true);
    setError(null);
    setSessions([]);
    setCurrentPage(1);
    setHasMore(false);

    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }

    if (!token) {
      setError("Please sign in to view your saved candidate locations.");
      setIsLoading(false);
      return;
    }

    try {
      const params: Record<string, any> = {
        search: debouncedSearchQuery.trim(),
        per_page: ITEMS_PER_PAGE,
        page: 1,
      };
      if (filterBusinessId) {
        params.business_id = filterBusinessId;
      } else if (filterBusinessTypeId) {
        params.business_type_id = filterBusinessTypeId;
      }

      const res = await api.get("/simulations/sessions", { params });

      // Abaikan response lama jika pencarian sudah berubah.
      if (requestId !== requestIdRef.current) return;

      if (res.data?.success === false) {
        throw new Error(
          res.data?.message || "Failed to load saved candidate sessions.",
        );
      }

      const { sessions: items, meta } = parseSessionPage(res);

      setSessions(items);
      setCurrentPage(Number(meta?.current_page ?? 1));

      setHasMore(
        meta?.last_page != null
          ? Number(meta.current_page ?? 1) < Number(meta.last_page)
          : items.length === ITEMS_PER_PAGE,
      );
    } catch (err: unknown) {
      if (requestId !== requestIdRef.current) return;

      const classified = classifyApiError(err);

      setError(
        classified.message || "Failed to load saved candidate sessions.",
      );
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [debouncedSearchQuery, filterBusinessId, filterBusinessTypeId]);

  useEffect(() => {
    if (!isOpen) {
      // Batalkan efek response dari request yang sudah tidak relevan.
      requestIdRef.current += 1;
      loadingMoreRef.current = false;
      setIsLoading(false);
      setIsLoadingMore(false);
      return;
    }

    void fetchSavedSessions();

    return () => {
      requestIdRef.current += 1;
    };
  }, [isOpen, fetchSavedSessions]);

  /**
   * Memuat halaman berikutnya secara otomatis saat pengguna scroll.
   */
  const loadMoreSessions = useCallback(async () => {
    if (!isOpen || isLoading || loadingMoreRef.current || !hasMore) {
      return;
    }

    const requestId = requestIdRef.current;
    const nextPage = currentPage + 1;

    loadingMoreRef.current = true;
    setIsLoadingMore(true);

    try {
      const params: Record<string, any> = {
        search: debouncedSearchQuery.trim(),
        per_page: ITEMS_PER_PAGE,
        page: nextPage,
      };
      if (filterBusinessId) {
        params.business_id = filterBusinessId;
      } else if (filterBusinessTypeId) {
        params.business_type_id = filterBusinessTypeId;
      }

      const res = await api.get("/simulations/sessions", { params });

      // Jangan gabungkan hasil dari pencarian sebelumnya.
      if (requestId !== requestIdRef.current) return;

      if (res.data?.success === false) {
        throw new Error(
          res.data?.message || "Failed to load more saved sessions.",
        );
      }

      const { sessions: items, meta } = parseSessionPage(res);

      // Hindari sesi duplikat jika response memiliki data berulang.
      setSessions((previous) => {
        const existingIds = new Set(previous.map((session) => session.id));

        const newSessions = items.filter(
          (session) => !existingIds.has(session.id),
        );

        return [...previous, ...newSessions];
      });

      const resolvedPage = Number(meta?.current_page ?? nextPage);

      setCurrentPage(resolvedPage);

      setHasMore(
        meta?.last_page != null
          ? resolvedPage < Number(meta.last_page)
          : items.length === ITEMS_PER_PAGE,
      );
    } catch (err: unknown) {
      if (requestId === requestIdRef.current) {
        const classified = classifyApiError(err);

        toast({
          title: "Gagal Memuat Data",
          description:
            classified.message || "Could not load more saved sessions.",
          variant: "error",
        });
      }
    } finally {
      if (requestId === requestIdRef.current) {
        loadingMoreRef.current = false;
        setIsLoadingMore(false);
      }
    }
  }, [isOpen, isLoading, hasMore, currentPage, debouncedSearchQuery, toast]);

  const handleCandidateScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;

    const nearBottom =
      element.scrollTop + element.clientHeight >= element.scrollHeight - 120;

    if (nearBottom) {
      void loadMoreSessions();
    }
  };

  const handleFilterSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    requestIdRef.current += 1;
    setSessions([]);
    setCurrentPage(1);
    setSearchQuery("");

    if (!val) {
      setFilterBusinessId(null);
      setFilterBusinessTypeId(null);
      setFilterBusinessName(null);
      return;
    }

    if (val.startsWith("biz:")) {
      const bId = val.replace("biz:", "");
      const found = userBusinesses.find((b) => b.id === bId);
      setFilterBusinessId(bId);
      setFilterBusinessTypeId(null);
      setFilterBusinessName(found?.name || "Usaha");
    } else if (val.startsWith("type:")) {
      const tId = val.replace("type:", "");
      setFilterBusinessId(null);
      setFilterBusinessTypeId(tId);
      setFilterBusinessName(selectedBusinessName || "Model Usaha");
    }
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
  };

  const handleDeleteSession = async (sessionId: string) => {
    setDeletingId(sessionId);

    try {
      const res = await api.delete(`/simulations/sessions/${sessionId}`);

      if (res.data?.success) {
        toast({
          title: "Candidate Removed",
          description: "Saved simulation session was deleted successfully.",
          variant: "success",
        });

        setSessions((previous) =>
          previous.filter((session) => session.id !== sessionId),
        );

        setConfirmDeleteId(null);
      }
    } catch (err: any) {
      toast({
        title: "Delete Failed",
        description:
          err.response?.data?.message || "Could not delete simulation session.",
        variant: "error",
      });
    } finally {
      setDeletingId(null);
    }
  };

  /**
   * Flatten kandidat dari sesi yang sudah berhasil dimuat.
   * Pencarian tidak lagi dilakukan di frontend.
   */
  const candidateList: {
    session: SavedSimulationSession;
    candidate: SavedCandidateItem;
  }[] = [];

  sessions.forEach((session) => {
    (session.simulations || []).forEach((candidate) => {
      candidateList.push({ session, candidate });
    });
  });

  if (!isOpen) return null;

  return (
    <div className="flex h-full w-full flex-col bg-surface text-left text-ink">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/95 p-4 backdrop-blur-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 font-bold text-primary">
            <Bookmark size={18} />
          </div>

          <div>
            <h3 className="font-display text-base font-bold text-ink">
              Saved Candidates
            </h3>

            <p className="text-xs text-muted">
              {candidateList.length} kandidat dimuat
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-xl p-1.5 text-slate-500 transition-colors hover:bg-slate-100"
          title="Close saved candidates"
          aria-label="Close saved candidates"
        >
          <X size={18} />
        </button>
      </div>

      {/* Business Filter Selector */}
      <div className="shrink-0 border-b border-slate-200/80 bg-slate-50/70 px-4 py-2.5 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
          <span className="flex items-center gap-1.5">
            <Store size={12} className="text-primary shrink-0" />
            Filter Berdasarkan Usaha:
          </span>
          {(filterBusinessId || filterBusinessTypeId) && (
            <button
              type="button"
              onClick={() => {
                requestIdRef.current += 1;
                setSessions([]);
                setCurrentPage(1);
                setFilterBusinessId(null);
                setFilterBusinessTypeId(null);
                setFilterBusinessName(null);
              }}
              className="text-[10px] text-primary hover:underline font-medium cursor-pointer"
            >
              Semua Usaha
            </button>
          )}
        </div>

        <select
          value={
            filterBusinessId
              ? `biz:${filterBusinessId}`
              : filterBusinessTypeId
              ? `type:${filterBusinessTypeId}`
              : ""
          }
          onChange={handleFilterSelectChange}
          aria-label="Filter kandidat berdasarkan usaha"
          className="w-full text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-medium text-ink focus:border-primary/50 outline-none cursor-pointer shadow-2xs"
        >
          <option value="">Semua Usaha (Semua Kandidat Tersimpan)</option>
          {userBusinesses.length > 0 && (
            <optgroup label="Usaha Terdaftar Anda">
              {userBusinesses.map((b) => (
                <option key={b.id} value={`biz:${b.id}`}>
                  {b.name} {b.business_type?.name ? `(${b.business_type.name})` : ""}
                </option>
              ))}
            </optgroup>
          )}
          {selectedBusinessTypeId && (
            <optgroup label="Model Usaha Terpilih di Peta">
              <option value={`type:${selectedBusinessTypeId}`}>
                {selectedBusinessName || "Model Usaha"}
              </option>
            </optgroup>
          )}
        </select>

        {filterBusinessName && (
          <div className="flex items-center justify-between rounded-lg bg-indigo-50 px-2.5 py-1.5 border border-indigo-100 text-xs text-indigo-900">
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-semibold text-[10.5px] text-indigo-700">Aktif:</span>
              <span className="truncate font-medium text-[10.5px]">{filterBusinessName}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                requestIdRef.current += 1;
                setSessions([]);
                setCurrentPage(1);
                setFilterBusinessId(null);
                setFilterBusinessTypeId(null);
                setFilterBusinessName(null);
              }}
              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold shrink-0 ml-2 cursor-pointer"
              title="Hapus filter usaha"
            >
              Reset ✕
            </button>
          </div>
        )}
      </div>

      {/* Backend Search */}
      <div className="shrink-0 border-b border-slate-200/80 bg-white px-4 py-3">
        <div className="relative">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />

          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Cari kandidat, usaha, alamat..."
            aria-label="Cari kandidat tersimpan"
            className="clay-press w-full rounded-[10px] border border-slate-200 bg-slate-50 py-2 pl-9 pr-9 text-xs text-ink outline-none transition-all placeholder:text-muted focus:border-primary/50 focus:bg-white"
          />

          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer rounded-md p-1 text-muted transition-colors hover:bg-slate-200 hover:text-ink"
              title="Clear search"
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between text-[10px] text-muted">
          <span>
            {debouncedSearchQuery.trim()
              ? "Hasil pencarian backend"
              : "Kandidat tersimpan"}
          </span>

          <span>{candidateList.length} kandidat dimuat</span>
        </div>


      </div>

      {/* Main Content Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleCandidateScroll}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4"
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center space-y-3 py-16">
            <div className="size-8 animate-spin rounded-full border-3 border-primary border-t-transparent" />

            <p className="text-xs font-medium text-muted">
              Loading saved candidates...
            </p>
          </div>
        ) : error ? (
          <div className="space-y-3 rounded-2xl border border-amber-200/80 bg-amber-50/80 p-4">
            <div className="flex items-start gap-2 text-xs font-semibold text-amber-800">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>

            <button
              type="button"
              onClick={() => void fetchSavedSessions()}
              className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-amber-700"
            >
              <RefreshCw size={13} />
              Retry Loading
            </button>
          </div>
        ) : candidateList.length === 0 ? (
          <div className="flex flex-col items-center justify-center space-y-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-4 py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-indigo-50 text-primary">
              {debouncedSearchQuery.trim() ? (
                <Search size={24} />
              ) : (
                <Target size={24} />
              )}
            </div>

            <div>
              <h4 className="text-sm font-bold text-ink">
                {debouncedSearchQuery.trim()
                  ? "Kandidat Tidak Ditemukan"
                  : filterBusinessName
                  ? `Belum Ada Kandidat untuk ${filterBusinessName}`
                  : "No Saved Candidates Yet"}
              </h4>

              <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted">
                {debouncedSearchQuery.trim()
                  ? "Tidak ada kandidat yang cocok dengan pencarian. Coba kata kunci lain."
                  : selectedBusinessName
                  ? `Belum ada kandidat tersimpan untuk model usaha "${selectedBusinessName}". Tempatkan kandidat di peta dan simpan untuk menampilkannya di sini.`
                  : 'Select a business type in the Catalog, place Candidate A, B, or C on the map, and click "Save Candidate" to pin it here.'}
              </p>
            </div>

            {debouncedSearchQuery.trim() && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="clay-press cursor-pointer rounded-[10px] bg-primary px-3 py-2 text-xs font-semibold text-white"
              >
                Hapus Pencarian
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {candidateList.map(({ session, candidate }) => {
              const dateStr = session.created_at
                ? new Date(session.created_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "Recent";

              const isConfirming = confirmDeleteId === session.id;
              const isDeleting = deletingId === session.id;

              return (
                <div
                  key={`${session.id}-${candidate.id}`}
                  className="group relative space-y-2.5 rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs transition-all hover:border-primary/40"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex size-6 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                        {candidate.candidate_id || "A"}
                      </span>

                      <div>
                        <h4 className="text-xs font-bold leading-tight text-ink">
                          {candidate.business_type?.name ||
                            session.name ||
                            "Candidate Location"}
                        </h4>

                        <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted">
                          <span className="flex items-center gap-0.5">
                            <Calendar size={10} />
                            {dateStr}
                          </span>

                          <span>·</span>

                          <span>Radius {candidate.radius_m || 500}m</span>
                        </div>
                      </div>
                    </div>

                    {/* Delete Confirmation */}
                    {!isConfirming ? (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(session.id)}
                        className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        title="Delete candidate session"
                        aria-label="Delete candidate session"
                      >
                        <Trash2 size={14} />
                      </button>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={isDeleting}
                          onClick={() => void handleDeleteSession(session.id)}
                          className="cursor-pointer rounded-lg bg-red-600 px-2 py-1 text-[10px] font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isDeleting ? "Deleting..." : "Confirm"}
                        </button>

                        <button
                          type="button"
                          disabled={isDeleting}
                          onClick={() => setConfirmDeleteId(null)}
                          className="cursor-pointer rounded-lg bg-slate-100 px-1.5 py-1 text-[10px] text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Coordinates & Location */}
                  <div className="flex items-start gap-1 text-[11px] text-slate-600">
                    <MapPin
                      size={12}
                      className="mt-0.5 shrink-0 text-slate-400"
                    />

                    <span className="break-words">
                      {candidate.location?.address ||
                        candidate.location?.name ||
                        (Number.isFinite(Number(candidate.latitude)) &&
                        Number.isFinite(Number(candidate.longitude))
                          ? `${Number(candidate.latitude).toFixed(5)}, ${Number(candidate.longitude).toFixed(5)}`
                          : "Koordinat tersimpan")}
                    </span>
                  </div>

                  {/* Feasibility Scores */}
                  {candidate.score && (
                    <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-slate-100 bg-slate-50 p-2 text-center">
                      <div>
                        <div className="text-[10px] text-muted">
                          Opportunity
                        </div>

                        <div className="text-xs font-bold text-primary">
                          {Math.round(
                            candidate.score.total_score ||
                              candidate.score.target_market_score ||
                              0,
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] text-muted">
                          Competition
                        </div>

                        <div className="text-xs font-bold text-amber-600">
                          {Math.round(candidate.score.competition_score || 0)}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] text-muted">Access</div>

                        <div className="text-xs font-bold text-emerald-600">
                          {Math.round(candidate.score.accessibility_score || 0)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  <button
                    type="button"
                    onClick={() => onSelectCandidate(candidate)}
                    className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-slate-100 py-1.5 text-xs font-bold text-ink transition-all hover:bg-primary hover:text-white"
                  >
                    <ExternalLink size={13} />
                    View & Analyze on Map
                  </button>
                </div>
              );
            })}

            {/* Infinite Scroll Loading Indicator */}
            {isLoadingMore && (
              <div className="flex items-center justify-center gap-2 py-4 text-[11px] text-muted">
                <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span>Memuat kandidat berikutnya...</span>
              </div>
            )}

            {!hasMore && (
              <p className="py-3 text-center text-[10px] text-muted">
                Semua sesi yang cocok telah dimuat.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="flex shrink-0 items-start gap-1.5 border-t border-slate-100 bg-slate-50/60 p-3 text-[10.5px] text-muted">
        <HelpCircle size={13} className="mt-0.5 shrink-0 text-primary" />

        <span>
          Saved candidate points are stored securely in your LOCIVA account.
        </span>
      </div>
    </div>
  );
};
