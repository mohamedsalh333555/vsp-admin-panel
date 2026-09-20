import React, { useState, useEffect } from 'react';
import {
  CloseCircle,
  ExportCurve,
  RotateRight,
  Refresh2,
  Danger,
  DocumentText,
  SearchZoomIn1,
  SearchZoomOut1,
  Messages3,
} from 'iconsax-react';
import { useLanguage } from '../../context/LanguageContext';

export const ImagePreviewModal = ({
  isOpen,
  onClose,
  title,
  imageUrl,
  isPdf = false,
  ownerPhone = null,
  ownerName = null,
  onRequestReupload = null,
}) => {
  const { t, lang } = useLanguage();
  const isAr = lang === 'ar';

  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [retryKey, setRetryKey] = useState(0);

  // Reset state whenever url changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      setHasError(false);
      setIsLoading(true);
    }
  }, [isOpen, imageUrl, retryKey]);

  if (!isOpen || !imageUrl) return null;

  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);
    setRetryKey((prev) => prev + 1);
  };

  const handleWhatsAppContact = () => {
    if (onRequestReupload) {
      onRequestReupload();
      return;
    }
    if (!ownerPhone) return;
    let clean = ownerPhone.replace(/[^0-9]/g, '');
    if (clean.startsWith('01')) {
      clean = '2' + clean;
    }
    const msg = encodeURIComponent(
      isAr
        ? `مرحباً أستاذ ${ownerName || ''}، معك إدارة منصة VSP الرياضية. نود إبلاغك بأن ملف (${title || 'المستند المطلوب'}) غير متاح أو لم يكتمل رفعه بالشكل الصحيح على المنصة. يرجى التكرم بإعادة رفعه عبر التطبيق أو إرساله لنا هنا لمساعدتك في توثيق حسابك وملعبك.`
        : `Hello ${ownerName || ''}, this is VSP Platform Administration. The document (${title}) is unavailable or incomplete. Please re-upload it via the app or reply here so we can complete your verification.`
    );
    window.open(`https://wa.me/${clean}?text=${msg}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/90 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl bg-vsp-surface border border-vsp-border rounded-2xl shadow-2xl overflow-hidden z-10 glass-panel flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-vsp-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Status Indicator: Red on error, Amber on loading, Emerald on success */}
            {hasError ? (
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500/50" />
            ) : isLoading ? (
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            ) : (
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
            )}
            <h3 className="text-sm font-bold text-white tracking-wide">{title || t('preview_doc')}</h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Interactive Image Controls (Only when loaded successfully) */}
            {!hasError && !isLoading && !isPdf && (
              <>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
                  className="p-1.5 bg-vsp-card hover:bg-vsp-border border border-vsp-border text-zinc-300 hover:text-white rounded-lg transition-colors"
                  title="تكبير"
                >
                  <SearchZoomIn1 className="w-3.5 h-3.5" variant="Outline" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
                  className="p-1.5 bg-vsp-card hover:bg-vsp-border border border-vsp-border text-zinc-300 hover:text-white rounded-lg transition-colors"
                  title="تصغير"
                >
                  <SearchZoomOut1 className="w-3.5 h-3.5" variant="Outline" />
                </button>
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="p-1.5 bg-vsp-card hover:bg-vsp-border border border-vsp-border text-zinc-300 hover:text-white rounded-lg transition-colors"
                  title="تدوير"
                >
                  <RotateRight className="w-3.5 h-3.5" variant="Outline" />
                </button>
              </>
            )}

            {/* Open in new tab: Only show if NOT broken */}
            {!hasError && (
              <a
                href={imageUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg text-vsp-textSecondary hover:text-white hover:bg-vsp-card border border-transparent hover:border-vsp-border transition-all flex items-center gap-1.5 text-xs font-semibold px-3"
              >
                <ExportCurve className="w-3.5 h-3.5" variant="Outline" />
                <span>{t('open_in_new_tab')}</span>
              </a>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-vsp-textSecondary hover:text-white hover:bg-vsp-card border border-transparent hover:border-vsp-border transition-all"
            >
              <CloseCircle className="w-4 h-4" variant="Outline" />
            </button>
          </div>
        </div>

        {/* Viewer Area */}
        <div className="p-6 flex-1 overflow-auto bg-black/50 flex items-center justify-center min-h-[420px] max-h-[75vh] relative">
          {/* 1. Loading State */}
          {isLoading && !hasError && (
            <div className="flex flex-col items-center justify-center space-y-3 text-center">
              <RotateRight className="w-8 h-8 text-vsp-accent animate-spin" variant="Outline" />
              <p className="text-xs text-zinc-400 font-semibold">جاري جلب المستند من خادم التخزين...</p>
            </div>
          )}

          {/* 2. Error State (Native Arabic UI, No external broken placeholders) */}
          {hasError ? (
            <div className="flex flex-col items-center justify-center text-center p-8 max-w-md space-y-4 animate-in fade-in zoom-in duration-200">
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center text-red-400 shadow-lg shadow-red-500/10">
                <Danger className="w-8 h-8" variant="Outline" />
              </div>

              <div className="space-y-1.5">
                <h4 className="text-base font-bold text-white">تعذر عرض هذا المستند</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  الملف غير متاح في حاوية التخزين السحابي (قد يكون حدث انقطاع أثناء الرفع من تطبيق الموبايل، أو لم يتم إنشاء الحاوية بعد).
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleRetry}
                  className="px-4 py-2 bg-vsp-card hover:bg-zinc-800 border border-vsp-border text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-sm"
                >
                  <Refresh2 className="w-3.5 h-3.5 text-zinc-400" variant="Outline" />
                  <span>إعادة المحاولة</span>
                </button>

                {(ownerPhone || onRequestReupload) && (
                  <button
                    type="button"
                    onClick={handleWhatsAppContact}
                    className="px-4 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-sm"
                  >
                    <Messages3 className="w-4 h-4" variant="Outline" />
                    <span>مراسلة المالك لطلب إعادة الرفع</span>
                  </button>
                )}
              </div>
            </div>
          ) : isPdf || imageUrl.endsWith('.pdf') ? (
            <iframe
              key={retryKey}
              src={imageUrl}
              title={title}
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setHasError(true);
              }}
              className="w-full h-[70vh] rounded-xl border border-vsp-border"
            />
          ) : (
            <img
              key={retryKey}
              src={imageUrl}
              alt={title || 'Document'}
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                display: isLoading ? 'none' : 'block',
              }}
              onLoad={() => {
                setIsLoading(false);
                setHasError(false);
              }}
              onError={() => {
                setIsLoading(false);
                setHasError(true);
              }}
              className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-2xl transition-transform duration-200"
            />
          )}
        </div>

        {/* Footer Info / Tip */}
        <div className="px-6 py-2.5 border-t border-vsp-border bg-vsp-card/40 flex items-center justify-between text-[11px] text-vsp-textSecondary">
          <span>{hasError ? 'حالة الوثيقة: غير متاحة بالفحص التخزيني' : 'انقر على أزرار التحكم للتكبير أو التدوير'}</span>
          <span className="text-zinc-500 font-mono text-[10px] truncate max-w-[280px]">
            {imageUrl}
          </span>
        </div>
      </div>
    </div>
  );
};
