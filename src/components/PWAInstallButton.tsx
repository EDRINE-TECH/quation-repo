import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X, Check, Share } from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'full' | 'banner';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'compact' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showBrowserGuide, setShowBrowserGuide] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // If already running as an installed PWA on the phone, do not show install buttons
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (!isInstallable) {
      if (isIOS) {
        setShowIOSGuide(true);
      } else {
        setShowBrowserGuide(true);
      }
      return;
    }
    setIsInstalling(true);
    try {
      await install();
    } finally {
      setIsInstalling(false);
    }
  };

  // Variant: Banner mode
  if (variant === 'banner') {
    if (!isInstallable && !isIOS) return null;

    return (
      <div className="bg-gradient-to-r from-amber-500/15 via-emerald-500/15 to-amber-500/15 border border-amber-500/30 rounded-2xl p-3 flex items-center justify-between gap-2 shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-sm shrink-0 shadow-sm">
            <Smartphone size={18} />
          </div>
          <div>
            <p className="text-xs font-bold text-white leading-tight">Install Bill Quatation BQ</p>
            <p className="text-[10px] text-slate-400">Fast offline access from your home screen</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleInstallClick}
          disabled={isInstalling}
          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all shrink-0 cursor-pointer disabled:opacity-50"
        >
          {isIOS && !isInstallable ? <Share size={13} /> : <Download size={13} className="stroke-[2.5]" />}
          <span>Install</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <Smartphone size={18} className="text-amber-400" />
                  <span>Install on iPhone / iPad</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="w-7 h-7 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="text-xs text-slate-300 space-y-2.5">
                <p className="text-slate-400">To install Bill Quatation BQ on your home screen:</p>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <span>Tap the <strong>Share</strong> button <Share size={12} className="inline text-amber-400" /> in Safari's bottom toolbar.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <span>Scroll down and select <strong>"Add to Home Screen"</strong>.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <span>Tap <strong>Add</strong> in the top-right corner.</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Variant: Compact button (for headers)
  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        disabled={isInstalling}
        className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1 shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
        title="Install Bill Quatation BQ"
      >
        <Download size={13} className="stroke-[2.5]" />
        <span>Install</span>
      </button>

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Smartphone size={18} className="text-amber-400" />
                <span>Install on iPhone / iPad</span>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-2.5">
              <p className="text-slate-400">To install Bill Quatation BQ on your home screen:</p>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <span>Tap the <strong>Share</strong> button <Share size={12} className="inline text-amber-400" /> in Safari's bottom toolbar.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <span>Scroll down and select <strong>"Add to Home Screen"</strong>.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <span>Tap <strong>Add</strong> in the top-right corner.</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              Got It
            </button>
          </div>
        </div>
      )}

      {showBrowserGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Smartphone size={18} className="text-amber-400" />
                <span>Install Bill Quatation BQ</span>
              </div>
              <button
                type="button"
                onClick={() => setShowBrowserGuide(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-2.5">
              <p className="text-slate-400">
                To install Bill Quatation BQ as an offline app on Android or desktop:
              </p>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <span>Open this app directly in Chrome or Edge (not inside an embedded preview frame).</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <span>Tap the browser menu <strong>(⋮)</strong> and choose <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowBrowserGuide(false)}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};
