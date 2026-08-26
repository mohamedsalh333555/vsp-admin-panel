import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const Toast = ({ message, type = 'success', onClose, duration = 4000 }) => {
  useEffect(() => {
    if (!duration) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const config = {
    success: {
      icon: CheckCircle2,
      border: 'border-emerald-500/40',
      bg: 'bg-emerald-950/80 text-emerald-300',
      iconColor: 'text-emerald-400',
    },
    error: {
      icon: AlertCircle,
      border: 'border-red-500/40',
      bg: 'bg-red-950/80 text-red-300',
      iconColor: 'text-red-400',
    },
    info: {
      icon: Info,
      border: 'border-vsp-accent/40',
      bg: 'bg-zinc-900/90 text-vsp-accent',
      iconColor: 'text-vsp-accent',
    },
  };

  const current = config[type] || config.info;
  const Icon = current.icon;

  return (
    <div className="fixed bottom-6 left-6 z-50 animate-bounce-in">
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-2xl ${current.bg} ${current.border}`}
      >
        <Icon className={`w-5 h-5 shrink-0 ${current.iconColor}`} />
        <span className="text-xs font-bold leading-tight">{message}</span>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
