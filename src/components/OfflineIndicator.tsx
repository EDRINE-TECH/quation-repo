import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-18 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-amber-500/95 text-slate-950 font-bold px-3.5 py-1.5 text-xs shadow-2xl border border-amber-300 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <WifiOff size={14} className="stroke-[2.5]" />
      <span>Offline Mode — Cached data active</span>
    </div>
  );
};
