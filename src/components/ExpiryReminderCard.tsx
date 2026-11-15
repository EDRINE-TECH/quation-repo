import React, { useState } from 'react';
import {
  Clock,
  AlertTriangle,
  KeyRound,
  Copy,
  Check,
  X,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { DeviceLicenseState } from '../types';
import {
  MONTHLY_PRICE_UGX,
  DAYS_PER_MONTH,
  getRemainingDays,
  verifyActivationCode,
} from '../utils/licensing';

interface ExpiryReminderCardProps {
  license: DeviceLicenseState;
  nowMs: number;
  onActivatePlan: (months: number, normalizedCode: string) => void;
}

export const ExpiryReminderCard: React.FC<ExpiryReminderCardProps> = ({
  license,
  nowMs,
  onActivatePlan,
}) => {
  const [isRenewOpen, setIsRenewOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activationInput, setActivationInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (license.plan !== 'paid' || !license.plan_expires_at) return null;

  const expMs = new Date(license.plan_expires_at).getTime();
  if (!Number.isFinite(expMs) || nowMs >= expMs) return null;

  const msLeft = expMs - nowMs;
  const daysLeft = getRemainingDays(license.plan_expires_at, nowMs);

  // Only show starting from 7 days left down to the locking day
  if (daysLeft < 1 || daysLeft > 7) return null;

  const isUrgent = daysLeft <= 3;
  const hoursLeft = Math.max(1, Math.ceil(msLeft / (1000 * 60 * 60)));
  const lockDateText = new Date(expMs).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const headline =
    daysLeft === 1
      ? hoursLeft <= 24
        ? `App locks today (${hoursLeft}h left)`
        : '1 day left before app locks'
      : `${daysLeft} days left before app locks`;

  const handleCopyCode = async () => {
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
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore fallback errors
    }
  };

  const handleRenewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const res = verifyActivationCode(
      license.device_code,
      activationInput,
      license.redeemed_codes
    );

    if (!res.valid || !res.months || !res.normalizedCode) {
      setErrorMsg(res.error || 'Invalid activation code.');
      return;
    }

    setSuccessMsg(
      `Extended by ${res.months} ${res.months === 1 ? 'month' : 'months'} (${res.days} days)!`
    );
    setTimeout(() => {
      onActivatePlan(res.months!, res.normalizedCode!);
      setActivationInput('');
      setSuccessMsg('');
      setIsRenewOpen(false);
    }, 550);
  };

  return (
    <>
      {/* Dedicated Top Notification Card Row (isolated above <main>, never overlaps content) */}
      <div className="shrink-0 bg-slate-950 px-3 pt-2.5 pb-2 border-b border-slate-800/80 z-30">
        <div
          role="status"
          aria-live="polite"
          className={`rounded-2xl border px-3.5 py-2.5 flex items-center justify-between gap-2.5 shadow-md ${
            isUrgent
              ? 'bg-rose-950/55 border-rose-500/50 text-rose-100'
              : 'bg-amber-950/45 border-amber-500/45 text-amber-100'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isUrgent
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}
            >
              {isUrgent ? <AlertTriangle size={18} /> : <Clock size={18} />}
            </div>

            <div className="min-w-0">
              <p className="text-xs font-extrabold tracking-tight text-white truncate tabular-nums">
                {headline}
              </p>
              <p className="text-[11px] text-slate-300 truncate tabular-nums">
                Locks {lockDateText} · Device {license.device_code} · {MONTHLY_PRICE_UGX.toLocaleString()} UGX
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setErrorMsg('');
              setSuccessMsg('');
              setIsRenewOpen(true);
            }}
            className={`min-h-[38px] px-3 py-1.5 rounded-xl font-black text-xs shrink-0 active:scale-95 transition-all cursor-pointer whitespace-nowrap ${
              isUrgent
                ? 'bg-rose-500 hover:bg-rose-400 text-slate-950'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
            }`}
          >
            Renew
          </button>
        </div>
      </div>

      {/* Renew Subscription Modal */}
      {isRenewOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsRenewOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl space-y-4 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-base font-extrabold text-white">
                  Renew Subscription
                </h2>
                <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
                  {headline} · {MONTHLY_PRICE_UGX.toLocaleString()} UGX / {DAYS_PER_MONTH} days
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsRenewOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between gap-2">
              <div>
                <span className="text-[11px] text-slate-400 block">
                  Copy Device Code &amp; send to developer
                </span>
                <span className="font-mono font-black text-xl tracking-[0.25em] text-amber-400 select-all">
                  {license.device_code}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="min-h-[42px] px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95 transition-all"
              >
                {copied ? <Check size={14} className="stroke-[3]" /> : <Copy size={14} />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>

            <form onSubmit={handleRenewSubmit} className="space-y-3">
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
                  placeholder="Paste activation code here"
                  className="w-full min-h-[46px] bg-slate-950 border border-slate-700 focus:border-emerald-400 rounded-xl px-4 py-2.5 text-center font-mono font-black text-base tracking-[0.22em] text-white uppercase placeholder:text-slate-600 placeholder:text-xs placeholder:tracking-normal placeholder:font-sans focus:outline-hidden"
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
                className="w-full min-h-[46px] py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 font-black text-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <KeyRound size={17} />
                <span>Activate</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
