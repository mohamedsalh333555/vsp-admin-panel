import React from 'react';
import { X, ExternalLink, Download } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const ImagePreviewModal = ({ isOpen, onClose, title, imageUrl, isPdf = false }) => {
  const { t } = useLanguage();
  if (!isOpen || !imageUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/90 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl bg-vsp-surface border border-vsp-border rounded-2xl shadow-2xl overflow-hidden z-10 glass-panel">
        {/* Header */}
        <div className="px-6 py-4 border-b border-vsp-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-vsp-accent animate-pulse" />
            <h3 className="text-sm font-bold text-white tracking-wide">{title || t('preview_doc')}</h3>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={imageUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg text-vsp-textSecondary hover:text-white hover:bg-vsp-card border border-transparent hover:border-vsp-border transition-all flex items-center gap-1.5 text-xs font-semibold px-3"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{t('open_in_new_tab')}</span>
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-vsp-textSecondary hover:text-white hover:bg-vsp-card border border-transparent hover:border-vsp-border transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewer */}
        <div className="p-4 flex items-center justify-center min-h-[400px] max-h-[75vh] overflow-auto bg-black/40">
          {isPdf || imageUrl.endsWith('.pdf') ? (
            <iframe
              src={imageUrl}
              title={title}
              className="w-full h-[70vh] rounded-xl border border-vsp-border"
            />
          ) : (
            <img
              src={imageUrl}
              alt={title || 'Document'}
              className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-lg border border-vsp-border"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://placehold.co/600x400/18181B/A1A1AA?text=Document+Unavailable';
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
