import React from 'react';

interface RadiusControlProps {
  radius: number;
  onChange: (radius: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}

export const RadiusControl: React.FC<RadiusControlProps> = ({ 
  radius, 
  onChange, 
  min = 100, 
  max = 3000,
  disabled = false
}) => {
  return (
    <div className="flex flex-col space-y-2 p-3 bg-surface clay-soft rounded-lg">
      <div className="flex justify-between items-center text-sm">
        <span className="text-ink font-medium">Radius Analisis</span>
        <span className="text-primary font-bold">{radius}m</span>
      </div>
      <input 
        type="range" 
        min={min} 
        max={max} 
        step={100}
        value={radius}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
        disabled={disabled}
      />
      <div className="flex justify-between text-xs text-muted">
        <span>{min}m</span>
        <span>{max}m</span>
      </div>
    </div>
  );
};
