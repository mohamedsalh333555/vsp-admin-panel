import React from 'react';
import { WifiSquare } from 'iconsax-react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export const NetworkBanner = () => {
  const isOnline = useNetworkStatus();

  if (isOnline) return null;

  return (
    <div className="bg-red-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all duration-300 z-50 sticky top-0 border-b border-red-700">
      <WifiSquare className="w-4 h-4 text-white animate-pulse" variant="Outline" />
      <span>لا يوجد اتصال بالإنترنت — البيانات المعروضة قد تكون قديمة</span>
    </div>
  );
};
