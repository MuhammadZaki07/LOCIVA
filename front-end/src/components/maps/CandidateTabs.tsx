import React from 'react';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';

export type CandidateId = 'A' | 'B' | 'C' | 'D' | 'E' | string;

interface CandidateTabsProps {
  candidates: { id: CandidateId; exists: boolean }[];
  activeId: CandidateId;
  onChange: (id: CandidateId) => void;
  onAdd?: () => void;
  maxTabs?: number;
}

const colors: Record<string, string> = {
  A: 'bg-primary text-white',
  B: 'bg-[#2f9e6b] text-white',
  C: 'bg-[#c4922a] text-white',
  D: 'bg-[#e11d48] text-white',
  E: 'bg-[#8b5cf6] text-white',
  F: 'bg-[#06b6d4] text-white',
  G: 'bg-[#f97316] text-white',
  H: 'bg-[#6366f1] text-white',
};

const inactiveColors: Record<string, string> = {
  A: 'text-primary border-primary hover:bg-primary-soft',
  B: 'text-[#2f9e6b] border-[#2f9e6b] hover:bg-[#2f9e6b]/10',
  C: 'text-[#c4922a] border-[#c4922a] hover:bg-[#c4922a]/10',
  D: 'text-[#e11d48] border-[#e11d48] hover:bg-[#e11d48]/10',
  E: 'text-[#8b5cf6] border-[#8b5cf6] hover:bg-[#8b5cf6]/10',
  F: 'text-[#06b6d4] border-[#06b6d4] hover:bg-[#06b6d4]/10',
  G: 'text-[#f97316] border-[#f97316] hover:bg-[#f97316]/10',
  H: 'text-[#6366f1] border-[#6366f1] hover:bg-[#6366f1]/10',
};

export const CandidateTabs: React.FC<CandidateTabsProps> = ({
  candidates,
  activeId,
  onChange,
  onAdd,
  maxTabs = 8,
}) => {
  return (
    <div data-tour="candidate-tabs" className="flex items-center space-x-2 mb-4 overflow-x-auto pb-1">
      {candidates.filter(c => c.exists).map(c => {
        const activeClass = colors[c.id] || 'bg-slate-700 text-white';
        const inactiveClass = inactiveColors[c.id] || 'text-slate-700 border-slate-300 hover:bg-slate-100';
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(c.id)}
            className={cn(
              "px-4 py-2 rounded-lg font-bold transition-all text-sm border-2 cursor-pointer shrink-0",
              activeId === c.id ? activeClass + " border-transparent" : inactiveClass + " bg-transparent"
            )}
          >
            Candidate {c.id}
          </button>
        );
      })}
      {onAdd && candidates.filter(c => c.exists).length < maxTabs && (
        <button
          type="button"
          onClick={onAdd}
          className="px-3.5 py-2 rounded-lg font-medium text-sm border-2 border-dashed border-slate-300 text-muted hover:border-primary hover:text-primary transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus size={14} />
          <span>Add</span>
        </button>
      )}
    </div>
  );
};
