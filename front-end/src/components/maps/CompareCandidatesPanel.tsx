import React, { useState } from "react";
import type { AnalysisResult } from "@/lib/analysisEngine";
import type { CandidateId } from "./CandidateTabs";
import { cn } from "@/lib/utils";
import { Scale, CheckCircle2, AlertCircle, X, HelpCircle, Trophy, Clock, FileWarning } from "lucide-react";

interface CompareCandidatesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  results: Record<CandidateId, AnalysisResult | null>;
  activeCandidates: CandidateId[];
  onFlyToCandidate?: (id: CandidateId) => void;
}

const colorMap: Record<CandidateId, { text: string; bg: string; border: string }> = {
  A: { text: "text-primary", bg: "bg-primary/10", border: "border-primary" },
  B: { text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-600" },
  C: { text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-600" },
};

export const CompareCandidatesPanel: React.FC<CompareCandidatesPanelProps> = ({
  isOpen,
  onClose,
  results,
  activeCandidates,
  onFlyToCandidate,
}) => {
  // Let user pick which candidates to include in comparison
  const [selectedIds, setSelectedIds] = useState<Record<CandidateId, boolean>>({
    A: true,
    B: true,
    C: true,
  });

  if (!isOpen) return null;

  // Filter candidates that actually have analysis results
  const existingWithResults = activeCandidates.filter((id) => results[id] !== null);
  const comparedList = existingWithResults.filter((id) => selectedIds[id]);

  // Determine best candidate recommendation among selected
  let bestId: CandidateId | null = null;
  let maxScore = -Infinity;

  comparedList.forEach((id) => {
    const res = results[id];
    if (res && res.isValidLocation !== false && res.opportunityScore !== null) {
      const opp = res.opportunityScore;
      const comp = res.competitionScore ?? 0;
      const acc = res.accessibilityScore ?? 0;
      const composite = opp - comp * 0.8 + acc * 0.5;
      if (composite > maxScore) {
        maxScore = composite;
        bestId = id;
      }
    }
  });

  const toggleCandidateSelection = (id: CandidateId) => {
    setSelectedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex flex-col h-full w-full bg-surface text-ink text-left">
      {/* Header */}
      <div className="p-4 border-b border-slate-200/80 flex items-center justify-between shrink-0 bg-white/95 backdrop-blur-xs">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <Scale size={18} />
          </div>
          <div>
            <h3 className="font-display font-bold text-base text-ink">Compare Candidates</h3>
            <p className="text-xs text-muted">Side-by-side location intelligence comparison</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer"
          title="Close comparison"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Candidate Selection Checkboxes */}
        {existingWithResults.length > 0 && (
          <div className="p-3 rounded-2xl bg-white border border-slate-200 space-y-2">
            <div className="text-[11px] font-bold text-muted uppercase tracking-wider">
              Select Candidates to Compare
            </div>
            <div className="flex flex-wrap gap-2">
              {(["A", "B", "C"] as CandidateId[]).map((id) => {
                const exists = results[id] !== null;
                const isChecked = Boolean(selectedIds[id]);

                return (
                  <button
                    key={id}
                    type="button"
                    disabled={!exists}
                    onClick={() => toggleCandidateSelection(id)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer",
                      !exists && "opacity-40 border-slate-200 bg-slate-50 cursor-not-allowed",
                      exists && isChecked && `${colorMap[id].bg} ${colorMap[id].border} ${colorMap[id].text}`,
                      exists && !isChecked && "bg-white border-slate-200 text-slate-400 hover:text-ink"
                    )}
                  >
                    <span>Candidate {id}</span>
                    {exists && isChecked && <CheckCircle2 size={13} />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Not enough candidates state */}
        {existingWithResults.length < 2 ? (
          <div className="p-5 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 text-center space-y-2.5">
            <div className="size-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <AlertCircle size={20} />
            </div>
            <h4 className="font-bold text-sm text-ink">
              {existingWithResults.length === 0
                ? "No Candidate Points Available"
                : "Add Another Candidate to Compare"}
            </h4>
            <p className="text-xs text-muted leading-relaxed max-w-xs mx-auto">
              Comparison is most actionable with two or three candidate locations. Place Candidate A and Candidate B on the map to compare their spatial metrics.
            </p>
          </div>
        ) : comparedList.length < 2 ? (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
            Please check at least two candidate options above to render the side-by-side comparison table.
          </div>
        ) : (
          /* Side-by-side Metrics Comparison Table */
          <div className="space-y-3">
            {bestId && (
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-900">
                <Trophy size={16} className="text-emerald-600 shrink-0" />
                <span>
                  <strong>Recommendation:</strong> Candidate <strong>{bestId}</strong> presents the most favorable balance of market potential vs competition.
                </span>
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="py-2.5 px-3 text-left font-bold text-slate-500">Metrik</th>
                    {comparedList.map((id) => {
                      const res = results[id];
                      const isStale = res?.isStaleOsm || res?.sources?.find(s => s.id === 'openstreetmap')?.status === 'stale';
                      const isTruncated = res?.isTruncated;
                      return (
                        <th
                          key={id}
                          className={cn("py-2.5 px-2 text-center font-bold border-l border-slate-200", colorMap[id].text)}
                        >
                          <div className="flex flex-col items-center gap-0.5">
                            <div className="flex items-center justify-center gap-1">
                              <span>Poin {id}</span>
                              {bestId === id && (
                                <span className="size-2 rounded-full bg-emerald-500" title="Direkomendasikan" />
                              )}
                            </div>
                            <div className="flex items-center gap-1 font-normal">
                              {isStale && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] px-1 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                                  <Clock size={8} /> Stale
                                </span>
                              )}
                              {isTruncated && (
                                <span className="text-[9px] px-1 py-0.5 rounded bg-amber-100 text-amber-700 font-bold">250+</span>
                              )}
                            </div>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Market Opportunity */}
                  <tr>
                    <td className="py-2.5 px-3 font-medium text-slate-700">Peluang Pasar</td>
                    {comparedList.map((id) => {
                      const res = results[id];
                      return (
                        <td key={id} className="py-2.5 px-2 text-center font-bold border-l border-slate-100 text-primary">
                          {res?.opportunityScore ?? "N/A"}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Competition */}
                  <tr>
                    <td className="py-2.5 px-3 font-medium text-slate-700">Tingkat Persaingan</td>
                    {comparedList.map((id) => {
                      const res = results[id];
                      return (
                        <td key={id} className="py-2.5 px-2 text-center font-bold border-l border-slate-100 text-amber-600">
                          {res?.competitionScore ?? "N/A"}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Accessibility */}
                  <tr>
                    <td className="py-2.5 px-3 font-medium text-slate-700">Aksesibilitas</td>
                    {comparedList.map((id) => {
                      const res = results[id];
                      return (
                        <td key={id} className="py-2.5 px-2 text-center font-bold border-l border-slate-100 text-slate-700">
                          {res?.accessibilityScore ?? "N/A"}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Competitor Count */}
                  <tr>
                    <td className="py-2.5 px-3 font-medium text-slate-700">Kompetitor dalam Radius</td>
                    {comparedList.map((id) => {
                      const res = results[id];
                      return (
                        <td key={id} className="py-2.5 px-2 text-center font-semibold border-l border-slate-100 text-slate-600">
                          {res?.competitorCount ?? 0}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Report Count / Civic Risk */}
                  <tr>
                    <td className="py-2.5 px-3 font-medium text-slate-700">
                      <span className="flex items-center gap-1">
                        <FileWarning size={12} className="text-rose-500" />
                        Laporan Risiko
                      </span>
                    </td>
                    {comparedList.map((id) => {
                      const res = results[id];
                      const count = res?.reportCount;
                      return (
                        <td key={id} className="py-2.5 px-2 text-center border-l border-slate-100">
                          <span className={cn(
                            "text-sm font-bold tabular-nums",
                            typeof count === 'number' && count > 0 ? "text-rose-600" : "text-emerald-600"
                          )}>
                            {typeof count === 'number' ? count : '—'}
                          </span>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Nearest Competitor */}
                  <tr>
                    <td className="py-2.5 px-3 font-medium text-slate-700">Kompetitor Terdekat</td>
                    {comparedList.map((id) => {
                      const res = results[id];
                      const comp = res?.nearestCompetitor;
                      return (
                        <td key={id} className="py-2.5 px-2 text-center border-l border-slate-100 text-[10.5px] text-muted">
                          {comp ? `${comp.distance}m` : "Tidak Ada"}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Data Confidence */}
                  <tr>
                    <td className="py-2.5 px-3 font-medium text-slate-700">Kepercayaan Data</td>
                    {comparedList.map((id) => {
                      const res = results[id];
                      return (
                        <td key={id} className="py-2.5 px-2 text-center border-l border-slate-100 font-semibold text-slate-600">
                          {res?.dataConfidence ? `${res.dataConfidence}%` : "Rendah"}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Quick fly-to action */}
                  {onFlyToCandidate && (
                    <tr className="bg-slate-50/50">
                      <td className="py-2 px-3 text-slate-500 font-medium">Map Action</td>
                      {comparedList.map((id) => (
                        <td key={id} className="py-2 px-2 text-center border-l border-slate-100">
                          <button
                            type="button"
                            onClick={() => onFlyToCandidate(id)}
                            className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                          >
                            Focus {id}
                          </button>
                        </td>
                      ))}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/60 text-[10.5px] text-muted flex items-start gap-1.5 shrink-0">
        <HelpCircle size={13} className="shrink-0 mt-0.5 text-primary" />
        <span>Scores are computed from live OpenStreetMap & LOCIVA spatial indexes.</span>
      </div>
    </div>
  );
};
