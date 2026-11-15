import React, { useState } from 'react';
import {
  Lock,
  Smartphone,
  Copy,
  Check,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { DeviceLicenseState } from '../types';
import {
  FREE_PLAN_QUOTE_LIMIT,
  MONTHLY_PRICE_UGX,
  DAYS_PER_MONTH,
  normalizeCode,
  verifyActivationCode,
  isPaidPlanExpired,
} from '../utils/licensing';

interface DeviceLicenseGateProps {
  mode: 'unregistered' | 'locked';
  license: DeviceLicenseState;
  onConfirmDevice: () => void;
  onActivatePlan: (months: number, normalizedCode: string) => void;
}

export const DeviceLicenseGate: React.FC<DeviceLicenseGateProps> = ({
  mode,
  license,
  onConfirmDevice,
  onActivatePlan,
}) => {
  const [deviceInput, setDeviceInput] = useState('');
  const [activationInput, setActivationInput] = useState('');
  const [showActivationOnSetup, setShowActivationOnSetup] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const expired = isPaidPlanExpired(license);

  const handleCopyDeviceCode = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(license.device_code);
      } else {
        const ta = document.createElement('textarea');
        ta.value = license.device_code;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setErrorMsg('Copy failed. Please copy the 4-character device code manually.');
    }
  };

  const handleConfirmNewDevice = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const entered = normalizeCode(deviceInput);
    if (!entered) {
      setErrorMsg('Please enter the 4-character device code shown above.');
      return;
    }
    if (entered !== normalizeCode(license.device_code)) {
      setErrorMsg(`Device code mismatch. Please enter ${license.device_code}.`);
      return;
    }
    onConfirmDevice();
  };

  const handleActivateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const result = verifyActivationCode(
      license.device_code,
      activationInput,
      license.redeemed_codes
    );

    if (!result.valid || !result.months || !result.normalizedCode) {
      setErrorMsg(result.error || 'Invalid activation code.');
      return;
    }

    setSuccessMsg(
      `Activated for ${result.months} ${result.months === 1 ? 'month' : 'months'} (${result.days} days)!`
    );
    setTimeout(() => {
      onActivatePlan(result.months!, result.normalizedCode!);
    }, 500);
  };

  if (mode === 'unregistered') {
    return (
      <div className="flex-1 flex flex-col justify-center p-4 sm:p-5 bg-slate-950 animate-in fade-in duration-150">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-5">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center">
              <Smartphone size={24} />
            </div>
            <h1 className="text-lg font-extrabold text-white tracking-tight">
              New Device Registration
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              This device has been assigned a unique 4-character Device Code. Enter it below to connect your device and start your {FREE_PLAN_QUOTE_LIMIT} free quotations.
            </p>
          </div>

          {/* Generated Device Code Display + Copy */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-semibold">Your Device Code</span>
              <span className="font-mono text-amber-400">4 characters</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="font-mono font-black text-2xl tracking-[0.28em] text-white select-all">
                {license.device_code}
              </div>
              <button
                type="button"
                onClick={handleCopyDeviceCode}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-amber-400 font-bold text-xs flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer shrink-0"
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {!showActivationOnSetup ? (
            <form onSubmit={handleConfirmNewDevice} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Enter Device Code to Connect
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={deviceInput}
                  onChange={(e) => {
                    setDeviceInput(e.target.value.toUpperCase());
                    setErrorMsg('');
                  }}
                  placeholder={`Type ${license.device_code}`}
                  className="w-full min-h-[46px] bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-4 py-2.5 text-center font-mono font-bold text-base tracking-[0.25em] text-white uppercase focus:outline-hidden"
                />
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0 text-rose-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
              >
                <ShieldCheck size={18} />
                <span>Connect Device & Start Free Plan</span>
              </button>

              <div className="pt-2 border-t border-slate-800/80 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowActivationOnSetup(true);
                    setErrorMsg('');
                  }}
                  className="text-xs font-semibold text-amber-400 hover:underline py-1.5 cursor-pointer"
                >
                  Already paid? Enter 6-character activation code
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleActivateSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Paste 6-Character Activation Code
                </label>
                <input
                  type="text"
                  maxLength={8}
                  value={activationInput}
                  onChange={(e) => {
                    setActivationInput(e.target.value.toUpperCase());
                    setErrorMsg('');
                  }}
                  placeholder="6-character code"
                  className="w-full min-h-[46px] bg-slate-950 border border-slate-700 focus:border-emerald-400 rounded-xl px-4 py-2.5 text-center font-mono font-bold text-base tracking-[0.25em] text-white uppercase focus:outline-hidden"
                />
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0 text-rose-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                  <Check size={15} className="shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              >
                <KeyRound size={18} />
                <span>Activate</span>
              </button>

              <div className="pt-2 border-t border-slate-800/80 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowActivationOnSetup(false);
                    setErrorMsg('');
                  }}
                  className="text-xs font-semibold text-slate-400 hover:text-white py-1.5 cursor-pointer"
                >
                  Back to Free Plan Device Setup
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  // LOCKED STATE (Free plan finished or Paid plan expired)
  return (
    <div className="flex-1 flex flex-col justify-center p-4 sm:p-5 bg-slate-950 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-5">
        {/* Lock Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 mx-auto flex items-center justify-center">
            <Lock size={24} />
          </div>
          <h1 className="text-lg font-extrabold text-white tracking-tight">
            {expired ? 'Subscription Expired — App Locked' : 'Free Plan Finished — App Locked'}
          </h1>
          <p className="text-xs text-slate-300 leading-relaxed">
            {expired
              ? `Your paid subscription has ended. Pay ${MONTHLY_PRICE_UGX.toLocaleString()} UGX (${DAYS_PER_MONTH} days/month) and copy this device code and send it to the developer for payment and activation.`
              : `You have used all ${FREE_PLAN_QUOTE_LIMIT} free quotations. Pay ${MONTHLY_PRICE_UGX.toLocaleString()} UGX and copy this device code and send it to the developer for payment and activation.`}
          </p>
        </div>

        {/* Device Code + Copy Button */}
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-semibold">Device Code</span>
            <span className="font-mono text-amber-400 tabular-nums">
              {MONTHLY_PRICE_UGX.toLocaleString()} UGX / Month ({DAYS_PER_MONTH} days)
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="font-mono font-black text-2xl tracking-[0.28em] text-amber-400 select-all">
              {license.device_code}
            </div>
            <button
              type="button"
              onClick={handleCopyDeviceCode}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-md shadow-amber-500/15"
            >
              {copied ? <Check size={15} className="stroke-[3]" /> : <Copy size={15} />}
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>
          </div>
        </div>

        {/* Activation Code Input + Activate Button */}
        <form onSubmit={handleActivateSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Paste Activation Code
            </label>
            <input
              type="text"
              maxLength={8}
              value={activationInput}
              onChange={(e) => {
                setActivationInput(e.target.value.toUpperCase());
                setErrorMsg('');
              }}
              placeholder="Paste 6-character code here"
              className="w-full min-h-[48px] bg-slate-950 border border-slate-700 focus:border-emerald-400 rounded-xl px-4 py-3 text-center font-mono font-black text-lg tracking-[0.25em] text-white uppercase placeholder:text-slate-600 placeholder:text-xs placeholder:tracking-normal placeholder:font-sans focus:outline-hidden"
            />
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
              <Sparkles size={15} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <KeyRound size={18} />
            <span>Activate</span>
          </button>
        </form>
      </div>
    </div>
  );
};
