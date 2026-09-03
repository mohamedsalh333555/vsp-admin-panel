import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export const StatCard = ({
  label,
  value,
  icon: Icon,
  trend,
  subtext,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden bg-vsp-surface border border-vsp-border rounded-2xl p-5 transition-all duration-200 group hover:border-zinc-700 hover:bg-vsp-surface/90 ${
        onClick ? 'cursor-pointer active:scale-[0.99]' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold text-vsp-textSecondary group-hover:text-zinc-200 transition-colors">
          {label}
        </span>
        {Icon && (
          <div className="w-9 h-9 rounded-xl bg-vsp-card border border-vsp-border flex items-center justify-center text-zinc-400 group-hover:text-vsp-accent group-hover:border-vsp-accent/20 transition-colors">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <h3 className="text-2xl lg:text-3xl font-black text-white tracking-tight font-sans">
          {value}
        </h3>
        {trend !== undefined && trend !== null && (
          <div
            className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${
              Number(trend) >= 0
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
            }`}
          >
            {Number(trend) >= 0 ? (
              <TrendingUp className="w-3 h-3 text-emerald-400" />
            ) : (
              <TrendingDown className="w-3 h-3 text-rose-400" />
            )}
            <span>{Number(trend) >= 0 ? `+${trend}%` : `${trend}%`}</span>
          </div>
        )}
      </div>

      {subtext && (
        <p className="text-[11px] text-zinc-500 mt-2.5 font-medium">
          {subtext}
        </p>
      )}
    </div>
  );
};
