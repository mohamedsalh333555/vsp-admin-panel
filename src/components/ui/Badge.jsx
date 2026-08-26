import React from 'react';

export const Badge = ({ children, variant = 'default', size = 'sm' }) => {
  const variantMap = {
    default: 'bg-zinc-800/80 text-zinc-300 border-zinc-700/80',
    accent: 'bg-zinc-800 text-zinc-200 border-zinc-700',
    primary: 'bg-zinc-800 text-zinc-200 border-zinc-700',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    danger: 'bg-red-500/10 text-red-400 border-red-500/20',
    blue: 'bg-zinc-800 text-zinc-300 border-zinc-700',
    purple: 'bg-zinc-800 text-zinc-300 border-zinc-700',
  };

  const sizeMap = {
    xs: 'text-[10px] px-1.5 py-0.5',
    sm: 'text-xs px-2.5 py-1',
    md: 'text-sm px-3 py-1.5',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 font-bold border rounded-lg ${
        variantMap[variant] || variantMap.default
      } ${sizeMap[size]}`}
    >
      {children}
    </span>
  );
};
