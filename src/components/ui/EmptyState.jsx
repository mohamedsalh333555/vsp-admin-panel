import React from 'react';

export const EmptyState = ({
  icon: Icon,
  title,
  subtitle,
  actionText,
  onAction,
  actionIcon: ActionIcon,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-vsp-surface border border-vsp-border rounded-2xl">
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-vsp-card border border-vsp-border flex items-center justify-center text-vsp-textSecondary mb-4">
          <Icon className="w-8 h-8 text-vsp-accent" />
        </div>
      )}
      <h3 className="text-base font-bold text-white mb-1">{title}</h3>
      {subtitle && <p className="text-xs text-vsp-textSecondary max-w-sm mb-6 leading-relaxed">{subtitle}</p>}
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="flex items-center gap-2 px-5 py-2.5 bg-vsp-accent hover:bg-vsp-accentHover text-black font-bold text-xs rounded-xl shadow-lg shadow-vsp-accent/20 transition-all"
        >
          {ActionIcon && <ActionIcon className="w-4 h-4" />}
          <span>{actionText}</span>
        </button>
      )}
    </div>
  );
};
