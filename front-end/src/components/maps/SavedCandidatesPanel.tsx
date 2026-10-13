import React, { useState, useEffect, useCallback } from "react";
import api, { classifyApiError } from "@/context/apiClient";
import { useToast } from "@/components/ui/Toast";
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
  Sparkles,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

interface SavedCandidatesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCandidate: (candidate: SavedCandidateItem) => void;
}

export const SavedCandidatesPanel: React.FC<SavedCandidatesPanelProps> = ({
  isOpen,
  onClose,
  onSelectCandidate,
}) => {
  const [sessions, setSessions] = useState<SavedSimulationSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchSavedSessions = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Please sign in to view your saved candidate locations.");
      setSessions([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get("/simulations/sessions");
      if (res.data?.success && Array.isArray(res.data?.data)) {
        setSessions(res.data.data);
      } else {
        setSessions([]);
      }
    } catch (err: any) {
      const classified = classifyApiError(err);
      setError(classified.message || "Failed to load saved candidate sessions.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchSavedSessions();
    }
  }, [isOpen, fetchSavedSessions]);

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
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        setConfirmDeleteId(null);
      }
    } catch (err: any) {
      toast({
        title: "Delete Failed",
        description: err.response?.data?.message || "Could not delete simulation session.",
        variant: "error",
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (!isOpen) return null;

  // Flatten candidates across sessions with session reference
  const candidateList: { session: SavedSimulationSession; candidate: SavedCandidateItem }[] = [];
  sessions.forEach((session) => {
    (session.simulations || []).forEach((candidate) => {
      candidateList.push({ session, candidate });
    });
  });

  return (
    <div className="flex flex-col h-full w-full bg-surface text-ink text-left">
      {/* Header */}
      <div className="p-4 border-b border-slate-200/80 flex items-center justify-between shrink-0 bg-white/95 backdrop-blur-xs">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <Bookmark size={18} />
          </div>
          <div>
            <h3 className="font-display font-bold text-base text-ink">Saved Candidates</h3>
            <p className="text-xs text-muted">
              {candidateList.length} saved location {candidateList.length === 1 ? "point" : "points"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer"
          title="Close saved candidates"
        >
          <X size={18} />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <div className="size-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-muted font-medium">Loading saved candidates...</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 space-y-3">
            <div className="flex items-start gap-2 text-amber-800 text-xs font-semibold">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={fetchSavedSessions}
              className="px-3 py-1.5 rounded-xl bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 hover:bg-amber-700 transition-colors cursor-pointer"
            >
              <RefreshCw size={13} />
              Retry Loading
            </button>
          </div>
        ) : candidateList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50">
            <div className="size-12 rounded-2xl bg-indigo-50 text-primary flex items-center justify-center">
              <Target size={24} />
            </div>
            <div>
              <h4 className="font-bold text-sm text-ink">No Saved Candidates Yet</h4>
              <p className="text-xs text-muted mt-1 max-w-xs leading-relaxed">
                Select a business type in the Catalog, place Candidate A, B, or C on the map, and click "Save Candidate" to pin it here.
              </p>
            </div>
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
                  className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-primary/40 transition-all space-y-2.5 relative group"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="size-6 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                        {candidate.candidate_id || "A"}
                      </span>
                      <div>
                        <h4 className="font-bold text-xs text-ink leading-tight">
                          {candidate.business_type?.name || session.name || "Candidate Location"}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] text-muted mt-0.5">
                          <span className="flex items-center gap-0.5">
                            <Calendar size={10} />
                            {dateStr}
                          </span>
                          <span>·</span>
                          <span>Radius {candidate.radius_m || 500}m</span>
                        </div>
                      </div>
                    </div>

                    {/* Delete confirmation trigger */}
                    {!isConfirming ? (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(session.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Delete candidate"
                      >
                        <Trash2 size={14} />
                      </button>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={isDeleting}
                          onClick={() => handleDeleteSession(session.id)}
                          className="px-2 py-1 rounded-lg bg-red-600 text-white font-bold text-[10px] hover:bg-red-700 transition-colors cursor-pointer"
                        >
                          {isDeleting ? "Deleting..." : "Confirm"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-1.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[10px] hover:bg-slate-200 transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Coordinates & Location */}
                  <div className="flex items-start gap-1 text-[11px] text-slate-600">
                    <MapPin size={12} className="shrink-0 mt-0.5 text-slate-400" />
                    <span className="truncate">
                      {candidate.location?.address ||
                        candidate.location?.name ||
                        `${candidate.latitude.toFixed(5)}, ${candidate.longitude.toFixed(5)}`}
                    </span>
                  </div>

                  {/* Feasibility Scores Badge */}
                  {candidate.score && (
                    <div className="grid grid-cols-3 gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-100 text-center">
                      <div>
                        <div className="text-[10px] text-muted">Opportunity</div>
                        <div className="font-bold text-xs text-primary">
                          {Math.round(candidate.score.total_score || candidate.score.target_market_score || 0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted">Competition</div>
                        <div className="font-bold text-xs text-amber-600">
                          {Math.round(candidate.score.competition_score || 0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted">Access</div>
                        <div className="font-bold text-xs text-emerald-600">
                          {Math.round(candidate.score.accessibility_score || 0)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <button
                    type="button"
                    onClick={() => onSelectCandidate(candidate)}
                    className="w-full py-1.5 rounded-xl bg-slate-100 hover:bg-primary hover:text-white text-ink text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ExternalLink size={13} />
                    View & Analyze on Map
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/60 text-[10.5px] text-muted flex items-start gap-1.5 shrink-0">
        <HelpCircle size={13} className="shrink-0 mt-0.5 text-primary" />
        <span>Saved candidate points are stored securely in your LOCIVA account.</span>
      </div>
    </div>
  );
};
