import React, { useState, useEffect, useRef } from "react";
import { Search, MapPin, Loader2, X } from "lucide-react";

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface RouteLocationSearchProps {
  label: string;
  placeholder: string;
  initialValue?: string;
  onSelect: (
    lat: number,
    lng: number,
    name: string,
    displayName: string,
  ) => void;
}

export const RouteLocationSearch: React.FC<RouteLocationSearchProps> = ({
  label,
  placeholder,
  initialValue = "",
  onSelect,
}) => {
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSearch = async (value: string) => {
    const trimmed = value.trim();

    abortRef.current?.abort();

    if (!trimmed) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        q: trimmed,
        format: "jsonv2",
        addressdetails: "1",
        limit: "10",
        countrycodes: "id",
      });

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params}`,
        {
          headers: { "Accept-Language": "en,id" },
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        throw new Error(`Status ${response.status}`);
      }

      const data: SearchResult[] = await response.json();

      if (!controller.signal.aborted) {
        setResults(data);
        setSearched(true);
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError("Unable to search locations. Please try again.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  const handleInput = (value: string) => {
    setQuery(value);
    setResults([]);
    setSearched(false);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      void handleSearch(value);
    }, 350);
  };

  return (
    <div className="relative space-y-1">
      <label className="block text-xs font-semibold text-muted">{label}</label>

      <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-primary">
        {loading ? (
          <Loader2 size={15} className="animate-spin text-primary shrink-0" />
        ) : (
          <Search size={15} className="text-muted shrink-0" />
        )}

        <input
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent text-xs text-ink outline-none"
        />

        {query && (
          <button
            type="button"
            onClick={() => {
              if (debounceRef.current) clearTimeout(debounceRef.current);
              abortRef.current?.abort();
              setQuery("");
              setResults([]);
              setSearched(false);
              setLoading(false);
              setError(null);
            }}
            className="text-muted hover:text-ink"
            aria-label="Clear location search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {searched && results.length === 0 && !loading && !error && (
        <p className="text-xs text-muted p-2">No locations found.</p>
      )}

      {results.length > 0 && (
        <ul className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {results.map((result) => (
            <li key={result.place_id}>
              <button
                type="button"
                onClick={() => {
                  const name = result.display_name.split(",")[0];
                  setQuery(result.display_name);
                  setResults([]);
                  setSearched(false);
                  onSelect(
                    Number(result.lat),
                    Number(result.lon),
                    name,
                    result.display_name,
                  );
                }}
                className="flex w-full items-start gap-2 p-3 text-left hover:bg-primary-soft/60 border-b border-slate-100 last:border-b-0"
              >
                <MapPin size={15} className="mt-0.5 shrink-0 text-primary" />
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-ink">
                    {result.display_name.split(",")[0]}
                  </span>
                  <span className="block text-[11px] text-muted">
                    {result.display_name.split(",").slice(1, 4).join(",")}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
