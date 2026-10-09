import React from 'react';
import type { AnalysisResult } from '@/lib/analysisEngine';
import type { CandidateId } from './CandidateTabs';
import { cn } from '@/lib/utils';

interface ComparisonTableProps {
  results: Record<CandidateId, AnalysisResult | null>;
  activeCandidates: CandidateId[];
}

const colors: Record<CandidateId, string> = {
  A: 'text-primary bg-primary/10',
  B: 'text-[#2f9e6b] bg-[#2f9e6b]/10',
  C: 'text-[#c4922a] bg-[#c4922a]/10',
};

const borderColors: Record<CandidateId, string> = {
  A: 'border-primary',
  B: 'border-[#2f9e6b]',
  C: 'border-[#c4922a]',
};

export const ComparisonTable: React.FC<ComparisonTableProps> = ({ results, activeCandidates }) => {
  const validResults = activeCandidates.filter(id => results[id] !== null).map(id => ({ id, result: results[id]! }));

  if (validResults.length < 2) return null;

  // Determine the best candidate based on a simple heuristic: 
  // Opportunity - Competition + (Accessibility * 0.5)
  let bestId: CandidateId | null = null;
  let maxScore = -Infinity;

  validResults.forEach(({ id, result }) => {
    const score = result.opportunityScore - (result.competitionScore * 0.8) + (result.accessibilityScore * 0.5);
    if (score > maxScore) {
      maxScore = score;
      bestId = id;
    }
  });

  return (
    <div className="fixed inset-x-0 bottom-0 md:bottom-6 md:left-1/2 md:-translate-x-1/2 z-[450] bg-surface p-4 rounded-t-xl md:rounded-xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] border border-slate-200 md:w-auto w-full overflow-x-auto">
      <h3 className="font-bold text-ink mb-3 md:text-center text-left">Perbandingan Kandidat</h3>
      <table className="w-full text-sm text-left">
        <thead>
          <tr>
            <th className="pb-2 text-muted font-medium pr-4">Metrik</th>
            {validResults.map(({ id }) => (
              <th key={id} className={cn("pb-2 px-4 text-center font-bold border-b-2", borderColors[id], colors[id].split(' ')[0])}>
                Kandidat {id}
                {bestId === id && <span className="ml-2 inline-flex bg-yellow-400 text-yellow-900 text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-wider align-middle">Rekomendasi</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          <tr>
            <td className="py-2 text-ink">Potensi Pasar</td>
            {validResults.map(({ id, result }) => (
              <td key={id} className="py-2 px-4 text-center font-bold text-potential">{result.opportunityScore}</td>
            ))}
          </tr>
          <tr>
            <td className="py-2 text-ink">Persaingan</td>
            {validResults.map(({ id, result }) => (
              <td key={id} className="py-2 px-4 text-center font-bold text-warning">{result.competitionScore}</td>
            ))}
          </tr>
          <tr>
            <td className="py-2 text-ink">Aksesibilitas</td>
            {validResults.map(({ id, result }) => (
              <td key={id} className="py-2 px-4 text-center font-bold text-ink">{result.accessibilityScore}</td>
            ))}
          </tr>
          <tr>
            <td className="py-2 text-ink">Jml Pesaing</td>
            {validResults.map(({ id, result }) => (
              <td key={id} className="py-2 px-4 text-center text-muted">{result.competitorCount}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
};
