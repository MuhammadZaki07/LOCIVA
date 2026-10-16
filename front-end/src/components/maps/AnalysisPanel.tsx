import React from 'react';
import type { AnalysisResult } from '@/lib/analysisEngine';
import type { BusinessType } from '@/lib/umkmCatalog';
import { ScoreGauge } from './ScoreGauge';
import { RadiusControl } from './RadiusControl';
import { cn } from '@/lib/utils';
import { formatDistance, CATEGORY_BY_ID } from '@/lib/Osm';
import { AlertTriangle, Target, Activity, Save, CheckCircle2, Globe, Database, X } from 'lucide-react';

interface AnalysisPanelProps {
  business: BusinessType;
  result: AnalysisResult | null;
  isAnalyzing: boolean;
  error: string | null;
  radius: number;
  onRadiusChange: (r: number) => void;
  isOpen: boolean;
  onClose: () => void;
  candidateExists: boolean;
  isPersistedInDb: boolean;
  onSaveCandidate: () => void;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  business,
  result,
  isAnalyzing,
  error,
  radius,
  onRadiusChange,
  isOpen,
  onClose,
  candidateExists,
  isPersistedInDb,
  onSaveCandidate,
}) => {
  return (
    <div className={cn(
      "fixed md:static inset-x-0 bottom-0 md:inset-auto md:right-0 z-[500] w-full md:w-96 bg-surface border-t md:border-l border-slate-200 flex flex-col transition-transform duration-300 max-h-[85vh] md:max-h-screen",
      !isOpen && "translate-y-full md:translate-y-0 md:translate-x-full md:hidden"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-surface md:bg-transparent flex justify-between items-center sticky top-0 z-10">
        <div>
          <h2 className="text-xl font-display font-bold text-ink">
            Candidate {result?.candidateId || 'A'}
          </h2>
          <p className="text-sm text-muted">{business.name}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors cursor-pointer"
          title="Close Analysis Panel"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <RadiusControl
          radius={radius}
          onChange={onRadiusChange}
          min={business.minRadius}
          max={business.maxRadius}
          disabled={isAnalyzing}
        />

        {/* Explicit save button */}
        {candidateExists && (
          <button
            type="button"
            onClick={onSaveCandidate}
            disabled={isPersistedInDb || isAnalyzing || result?.isValidLocation === false}
            className={cn(
              "w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all",
              result?.isValidLocation === false
                ? "bg-slate-200 text-slate-500 cursor-not-allowed opacity-60"
                : isPersistedInDb
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default"
                : "bg-primary text-white hover:bg-primary/90 shadow-sm cursor-pointer"
            )}
          >
            {result?.isValidLocation === false ? (
              <>
                <AlertTriangle size={16} />
                Cannot Save Non-Land Location
              </>
            ) : isPersistedInDb ? (
              <>
                <CheckCircle2 size={16} />
                Candidate Saved to Database
              </>
            ) : (
              <>
                <Save size={16} />
                Save Candidate to Database
              </>
            )}
          </button>
        )}

        {isAnalyzing ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted font-medium text-sm">Analyzing location feasibility...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-start space-x-3 border border-red-200">
            <AlertTriangle className="shrink-0 mt-0.5" size={18} />
            <p className="text-sm">{error}</p>
          </div>
        ) : result && result.isValidLocation === false ? (
          <div className="p-4 bg-amber-50/90 border border-amber-200/80 rounded-2xl space-y-3 text-left">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
              <AlertTriangle className="shrink-0 text-amber-600" size={18} />
              <span>Unsupported Location (Sea / Offshore)</span>
            </div>
            <p className="text-xs text-amber-900 leading-relaxed">
              {result.unsupportedReason || "The candidate coordinates are located in open sea or offshore waters. Land-based commercial feasibility scores cannot be calculated for water bodies."}
            </p>
            <div className="p-2.5 rounded-xl bg-white/70 border border-amber-200/50 text-[11px] text-amber-800">
              <span className="font-semibold">Action needed:</span> Drag or click candidate marker onto a valid land area or populated settlement to view feasibility analysis.
            </div>
          </div>
        ) : result ? (
          <>
            {/* Data warnings */}
            {result.dataWarnings.length > 0 && (
              <div className="p-3 bg-orange-50 text-orange-700 rounded-xl text-xs flex items-start space-x-2 border border-orange-200">
                <AlertTriangle className="shrink-0 mt-0.5" size={16} />
                <div className="space-y-1">
                  {result.dataWarnings.map((w, i) => <p key={i}>{w}</p>)}
                </div>
              </div>
            )}

            {/* Scores */}
            <div className="space-y-4">
              <h3 className="font-bold text-ink text-base">Location Scores</h3>
              <ScoreGauge score={result.opportunityScore ?? 0} label="Market Opportunity" />
              <ScoreGauge score={result.competitionScore ?? 0} label="Competition Level" inverted />
              <ScoreGauge score={result.accessibilityScore ?? 0} label="Accessibility" />
              <ScoreGauge score={result.dataConfidence} label="Data Confidence" />
            </div>

            {/* Data Transparency: Sources */}
            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50 space-y-2">
              <h4 className="text-xs font-bold text-ink uppercase tracking-wide">Data Source Transparency</h4>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-muted">
                  <Globe size={13} className="text-sky-500" />
                  OpenStreetMap (Overpass)
                </span>
                <span className="font-semibold text-ink">
                  {result.allPlaces?.length ?? 0} Places
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-muted">
                  <Database size={13} className="text-indigo-500" />
                  LOCIVA Internal DB
                </span>
                <span className="font-semibold text-ink">
                  {result.internalBusinessCount ?? 0} Businesses
                </span>
              </div>
              <p className="text-[10.5px] text-slate-400 pt-1.5 border-t border-slate-200/60 leading-relaxed">
                Analysis reflects real sampled spatial data and does not guarantee commercial outcomes. OpenStreetMap coverage varies across regions.
              </p>
            </div>

            {/* Factors */}
            <div className="space-y-3">
              <h3 className="font-bold text-ink text-base">Key Factors</h3>
              <div className="grid grid-cols-1 gap-2">
                {result.factors.map(f => (
                  <div key={f.key} className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex items-start space-x-3">
                    <div className={cn(
                      "mt-0.5",
                      f.impact === 'positive' ? "text-green-600" : f.impact === 'negative' ? "text-red-600" : "text-slate-400"
                    )}>
                      {f.impact === 'positive' ? <Target size={16} /> : f.impact === 'negative' ? <AlertTriangle size={16} /> : <Activity size={16} />}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-ink">{f.label}</div>
                      <div className="text-xs text-muted mt-0.5">{f.note}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Nearby Places */}
            <div className="space-y-3">
              <h3 className="font-bold text-ink text-base">Nearby Places ({result.relevantPOI.length})</h3>
              <div className="space-y-2">
                {result.relevantPOI.length > 0 ? result.relevantPOI.map((poi, idx) => {
                  const cat = CATEGORY_BY_ID[poi.category as keyof typeof CATEGORY_BY_ID];
                  return (
                    <div key={idx} className="flex justify-between items-center text-sm p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center space-x-2 overflow-hidden">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat?.color || '#ccc' }} />
                        <span className="truncate text-ink font-medium">{poi.name || cat?.label || poi.category}</span>
                      </div>
                      <span className="text-muted font-medium whitespace-nowrap ml-2 text-xs">
                        {formatDistance(poi.distance)}
                      </span>
                    </div>
                  );
                }) : (
                  <p className="text-sm text-muted">No relevant places found within this radius.</p>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-muted text-sm">
            {candidateExists
              ? "Loading analysis data..."
              : "Click anywhere on the map to place a candidate point."}
          </div>
        )}
      </div>
    </div>
  );
};
