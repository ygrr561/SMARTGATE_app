import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, Info } from 'lucide-react';

interface RiskScoreBadgeProps {
  score: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH';
  factors?: string[];
  compact?: boolean;
}

export const RiskScoreBadge: React.FC<RiskScoreBadgeProps> = ({ score, level, factors = [], compact = false }) => {
  const [showPopover, setShowPopover] = useState(false);

  let bgClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
  let badgeIcon = <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />;
  let labelText = 'LOW RISK';

  if (level === 'HIGH' || score >= 70) {
    bgClass = 'bg-rose-50 text-rose-800 border-rose-200';
    badgeIcon = <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />;
    labelText = 'HIGH RISK';
  } else if (level === 'MEDIUM' || score >= 30) {
    bgClass = 'bg-amber-50 text-amber-800 border-amber-200';
    badgeIcon = <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />;
    labelText = 'MED RISK';
  }

  return (
    <div className="relative inline-block" onMouseEnter={() => setShowPopover(true)} onMouseLeave={() => setShowPopover(false)}>
      <button
        type="button"
        id={`risk-badge-${score}`}
        onClick={(e) => { e.stopPropagation(); setShowPopover(!showPopover); }}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all hover:shadow-xs cursor-pointer ${bgClass}`}
      >
        {badgeIcon}
        <span>AI: {score}/100</span>
        {!compact && <span className="font-mono text-[10px] uppercase opacity-85">({labelText})</span>}
        <Info className="w-3 h-3 opacity-60 ml-0.5" />
      </button>

      {showPopover && (
        <div
          role="tooltip"
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-neutral-900 text-neutral-100 text-xs rounded-xl shadow-xl border border-neutral-800 pointer-events-none animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5 mb-2 font-medium">
            <span className="flex items-center gap-1 text-neutral-300">
              SmartGate AI Risk Assessment
            </span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
              level === 'LOW' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
              level === 'MEDIUM' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
              'bg-rose-950 text-rose-400 border border-rose-800'
            }`}>
              {score}/100
            </span>
          </div>

          <div className="text-[11px] text-neutral-400 mb-2">
            Dynamic heuristic model evaluating past visits, gate behavior, pass code validity, and time of day.
          </div>

          {factors && factors.length > 0 ? (
            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold block">Contributing Factors:</span>
              <ul className="space-y-1 pl-1">
                {factors.map((f, i) => (
                  <li key={i} className="text-[11px] text-neutral-300 flex items-start gap-1.5">
                    <span className="text-amber-400 font-mono mt-0.5">•</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-[11px] text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Normal parameters verified, no risk anomalies detected.
            </p>
          )}

          {/* Tooltip caret */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-900" />
        </div>
      )}
    </div>
  );
};
