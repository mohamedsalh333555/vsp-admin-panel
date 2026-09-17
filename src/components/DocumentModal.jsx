import React, { useState } from 'react';
import { CloseCircle, SearchZoomIn1, SearchZoomOut1, RotateRight } from 'iconsax-react';
import { useLanguage } from '../context/LanguageContext';

export const DocumentModal = ({ title, url, onClose }) => {
  const { t } = useLanguage();
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!url) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-vsp-surface border border-vsp-border rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-vsp-border flex items-center justify-between">
          <h3 className="font-bold text-white text-base">{title}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
              className="p-1.5 bg-vsp-card border border-vsp-border rounded-lg text-white hover:text-vsp-accent"
            >
              <SearchZoomIn1 className="w-4 h-4" variant="Outline" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
              className="p-1.5 bg-vsp-card border border-vsp-border rounded-lg text-white hover:text-vsp-accent"
            >
              <SearchZoomOut1 className="w-4 h-4" variant="Outline" />
            </button>
            <button
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="p-1.5 bg-vsp-card border border-vsp-border rounded-lg text-white hover:text-vsp-accent"
            >
              <RotateRight className="w-4 h-4" variant="Outline" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/30"
            >
              <CloseCircle className="w-4 h-4" variant="Outline" />
            </button>
          </div>
        </div>

        <div className="p-6 flex-1 overflow-auto bg-black/40 flex items-center justify-center min-h-[400px]">
          <img
            src={url}
            alt={title}
            style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
            className="max-h-[60vh] object-contain transition-transform duration-200"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://via.placeholder.com/600x400?text=Document+Image+Not+Found';
            }}
          />
        </div>

        <div className="p-3 border-t border-vsp-border bg-vsp-card text-center text-xs text-vsp-textSecondary">
          {t('view')} — {t('actions')}
        </div>
      </div>
    </div>
  );
};
