import React from 'react';
import { cn } from '@/lib/utils';

interface ScoreGaugeProps {
  score: number; // 0 - 100
  label: string;
  inverted?: boolean; // If true, lower is better (e.g. competition)
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({ score, label, inverted = false }) => {
  let colorClass = 'text-potential';
  let bgClass = 'bg-potential';

  if (inverted) {
    if (score > 66) {
      colorClass = 'text-warning';
      bgClass = 'bg-warning';
    } else if (score > 33) {
      colorClass = 'text-consider';
      bgClass = 'bg-consider';
    }
  } else {
    if (score < 33) {
      colorClass = 'text-warning';
      bgClass = 'bg-warning';
    } else if (score < 66) {
      colorClass = 'text-consider';
      bgClass = 'bg-consider';
    }
  }

  return (
    <div className="flex flex-col space-y-1">
      <div className="flex justify-between items-center text-sm">
        <span className="text-muted font-medium">{label}</span>
        <span className={cn("font-bold", colorClass)}>{score}/100</span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
        <div 
          className={cn("h-2 rounded-full transition-all duration-500", bgClass)} 
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
};
