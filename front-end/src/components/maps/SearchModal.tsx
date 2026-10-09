import React, { useState, useCallback, useRef, useEffect } from "react";
import { Search, X, MapPin, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
  address?: {
    city?: string;
    state?: string;
    country?: string;
  };
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (lat: number, lng: number, name: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, onSelect }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults([]);
      setError(null);
      setSearched(false);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  const handleSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      setSearched(false);
      return;
    }

    // Cancel prior request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        q: trimmed,
        format: "jsonv2",
        addressdetails: "1",
        limit: "8",
        countrycodes: "id", // Prioritize Indonesia
      });

      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
        headers: { "Accept-Language": "id,en", "User-Agent": "LOCIVA/1.0 (location-intelligence)" },
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data: SearchResult[] = await res.json();
      setResults(data);
      setSearched(true);
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      setError("Gagal menghubungi server pencarian. Periksa koneksi internet.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce search input
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleInput = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => handleSearch(val), 450);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    handleSearch(query);
  };

  const handleSelect = (r: SearchResult) => {
    onSelect(parseFloat(r.lat), parseFloat(r.lon), r.display_name.split(",")[0]);
    onClose();
  };

  const shortName = (r: SearchResult) => r.display_name.split(",")[0];
  const subName = (r: SearchResult) =>
    r.display_name.split(",").slice(1, 4).join(",").trim();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[600] flex items-start justify-center pt-[6vh] px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Cari Lokasi"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-xs"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative clay rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
        {/* Search Input */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3 border-b border-slate-100">
          {loading ? (
            <Loader2 size={20} className="text-primary animate-spin shrink-0" />
          ) : (
            <Search size={20} className="text-muted shrink-0" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            placeholder="Cari tempat, jalan, kota (mis: Jl. Sudirman, Malang)..."
            className="flex-1 bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(""); setResults([]); setSearched(false); }}
              className="p-1 rounded-full hover:bg-slate-100 text-muted"
            >
              <X size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-muted"
          >
            <X size={15} />
          </button>
        </form>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {error && (
            <div className="p-4 flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!error && searched && results.length === 0 && (
            <div className="p-6 text-center text-muted text-sm">
              Tidak ada hasil untuk <strong>"{query}"</strong>.<br />
              <span className="text-xs">Coba tambahkan nama kota atau provinsi.</span>
            </div>
          )}

          {!error && results.length > 0 && (
            <ul>
              {results.map((r, i) => (
                <li key={r.place_id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(r)}
                    className={cn(
                      "w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-primary-soft/60 transition-colors",
                      i < results.length - 1 && "border-b border-slate-50"
                    )}
                  >
                    <MapPin size={16} className="text-primary mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">{shortName(r)}</p>
                      <p className="text-xs text-muted truncate mt-0.5">{subName(r)}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!searched && !loading && !error && (
            <div className="p-6 text-center text-muted text-xs space-y-1">
              <Search size={24} className="mx-auto text-slate-200 mb-2" />
              <p>Ketik nama tempat, jalan, atau kota</p>
              <p className="text-slate-400">Data dari Nominatim / OpenStreetMap</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
