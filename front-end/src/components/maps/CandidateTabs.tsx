import React from 'react';
import { cn } from '@/lib/utils';

export type CandidateId = 'A' | 'B' | 'C';

interface CandidateTabsProps {
  candidates: { id: CandidateId, exists: boolean }[];
  activeId: CandidateId;
  onChange: (id: CandidateId) => void;
  onAdd?: () => void;
}

const colors: Record<CandidateId, string> = {
  A: 'bg-primary text-white',
  B: 'bg-[#2f9e6b] text-white',
  C: 'bg-[#c4922a] text-white',
};

const inactiveColors: Record<CandidateId, string> = {
  A: 'text-primary border-primary hover:bg-primary-soft',
  B: 'text-[#2f9e6b] border-[#2f9e6b] hover:bg-[#2f9e6b]/10',
  C: 'text-[#c4922a] border-[#c4922a] hover:bg-[#c4922a]/10',
};

export const CandidateTabs: React.FC<CandidateTabsProps> = ({ candidates, activeId, onChange, onAdd }) => {
  return (
    <div className="flex items-center space-x-2 mb-4">
      {candidates.filter(c => c.exists).map(c => (
        <button
          key={c.id}
          onClick={() => onChange(c.id)}
          className={cn(
            "px-4 py-2 rounded-lg font-bold transition-all text-sm border-2",
            activeId === c.id ? colors[c.id] + " border-transparent" : inactiveColors[c.id] + " bg-transparent"
          )}
        >
          Kandidat {c.id}
        </button>
      ))}
      {onAdd && candidates.filter(c => c.exists).length < 3 && (
        <button
          onClick={onAdd}
          className="px-4 py-2 rounded-lg font-medium text-sm border-2 border-dashed border-slate-300 text-muted hover:border-primary hover:text-primary transition-colors"
        >
          + Tambah
        </button>
      )}
    </div>
  );
};
