import React from 'react';
import { AlertCircle } from 'lucide-react';

export const EmptyState = ({
  icon: Icon,
  title,
  subtitle,
  description,
  actionText,
  actionLabel,
  onAction,
  actionIcon: ActionIcon,
  isError = false,
}) => {
  const effectiveSubtitle = subtitle || description;
  const effectiveActionText = actionText || actionLabel;
  const EffectiveIcon = Icon || (isError ? AlertCircle : null);

  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center bg-vsp-surface border rounded-2xl ${
      isError ? 'border-red-500/30' : 'border-vsp-border'
    }`}>
      {EffectiveIcon && (
        <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center mb-4 ${
          isError
            ? 'bg-red-500/10 border-red-500/30 text-red-400'
            : 'bg-vsp-card border-vsp-border text-vsp-textSecondary'
        }`}>
          <EffectiveIcon className={`w-8 h-8 ${isError ? 'text-red-400' : 'text-vsp-accent'}`} />
        </div>
      )}
      <h3 className="text-base font-bold text-white mb-1">{title}</h3>
      {effectiveSubtitle && (
        <p className="text-xs text-vsp-textSecondary max-w-sm mb-6 leading-relaxed">
          {effectiveSubtitle}
        </p>
      )}
      {effectiveActionText && onAction && (
        <button
          onClick={onAction}
          className={`flex items-center gap-2 px-5 py-2.5 font-bold text-xs rounded-xl shadow-lg transition-all ${
            isError
              ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20'
              : 'bg-vsp-accent hover:bg-vsp-accentHover text-black shadow-vsp-accent/20'
          }`}
        >
          {ActionIcon && <ActionIcon className="w-4 h-4" />}
          <span>{effectiveActionText}</span>
        </button>
      )}
    </div>
  );
};
