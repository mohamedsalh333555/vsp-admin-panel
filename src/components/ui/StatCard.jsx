import React from 'react';

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
      className={`bg-vsp-surface border border-vsp-border rounded-2xl p-5 transition-all duration-200 hover:bg-vsp-card/60 hover:border-zinc-700 ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-vsp-textSecondary">{label}</span>
        {Icon && (
          <div className="w-9 h-9 rounded-xl bg-vsp-card border border-vsp-border flex items-center justify-center text-zinc-400">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <h3 className="text-2xl font-black text-white tracking-tight">{value}</h3>
        {trend && (
          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
              trend > 0 ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            {trend > 0 ? `+${trend}%` : `${trend}%`}
          </span>
        )}
      </div>

      {subtext && (
        <p className="text-[11px] text-zinc-500 mt-2 font-medium">
          {subtext}
        </p>
      )}
    </div>
  );
};
