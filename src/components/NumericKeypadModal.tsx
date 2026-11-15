import React, { useState } from 'react';
import { X, Check, Delete } from 'lucide-react';
import { formatWithCommas, parseFormattedNumber } from '../utils/formatters';
import { CurrencyCode } from '../types';

interface NumericKeypadModalProps {
  isOpen: boolean;
  title: string;
  initialValue: number;
  isCurrency?: boolean;
  currency?: CurrencyCode;
  unitLabel?: string;
  onSave: (val: number) => void;
  onClose: () => void;
}

export const NumericKeypadModal: React.FC<NumericKeypadModalProps> = ({
  isOpen,
  title,
  initialValue,
  isCurrency = false,
  currency = 'UGX',
  unitLabel,
  onSave,
  onClose,
}) => {
  const [valStr, setValStr] = useState<string>(initialValue > 0 ? initialValue.toString() : '');

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (valStr.length >= 12) return;
    if (digit === '.' && valStr.includes('.')) return;
    if (valStr === '0' && digit !== '.') {
      setValStr(digit);
    } else {
      setValStr((prev) => prev + digit);
    }
  };

  const handleBackspace = () => {
    setValStr((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setValStr('');
  };

  const handleQuickAdd = (amount: number) => {
    const current = parseFormattedNumber(valStr);
    setValStr((current + amount).toString());
  };

  const numericVal = parseFormattedNumber(valStr);
  const formattedDisplay = valStr ? formatWithCommas(valStr) : '0';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150">
      <div 
        className="w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-t-3xl sm:rounded-2xl p-4 shadow-2xl text-white select-none pb-8 sm:pb-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <span className="text-xs uppercase tracking-wider text-amber-400 font-semibold">{title}</span>
            {unitLabel && <span className="text-xs text-slate-400 ml-1.5">({unitLabel})</span>}
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800/80 active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        {/* Display with commas */}
        <div className="my-3 px-3 py-3 bg-slate-950/80 rounded-xl border border-slate-800 text-right">
          <div className="text-xs text-slate-500 font-medium">
            {isCurrency ? `${currency} Value` : 'Quantity / Hours'}
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white flex items-center justify-end gap-1.5">
            {isCurrency && <span className="text-xs text-amber-400 font-sans font-bold">{currency}</span>}
            <span className={valStr ? 'text-white' : 'text-slate-600'}>
              {formattedDisplay}
            </span>
            {!isCurrency && unitLabel && (
              <span className="text-xs text-slate-400 font-sans ml-1">{unitLabel}</span>
            )}
          </div>
        </div>

        {/* Quick Steppers for trades */}
        {isCurrency ? (
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            {[10000, 50000, 100000, 500000].map((step) => (
              <button
                key={step}
                type="button"
                onClick={() => handleQuickAdd(step)}
                className="py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg active:scale-95 border border-slate-700/50"
              >
                +{step >= 1000000 ? `${step / 1000000}M` : `${step / 1000}k`}
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            {[1, 5, 10, 50].map((step) => (
              <button
                key={step}
                type="button"
                onClick={() => handleQuickAdd(step)}
                className="py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-lg active:scale-95 border border-slate-700/50"
              >
                +{step}
              </button>
            ))}
          </div>
        )}

        {/* Big Tap Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="h-13 bg-slate-800 hover:bg-slate-700 active:bg-amber-500/20 active:text-amber-300 text-xl font-bold rounded-xl flex items-center justify-center transition-colors shadow-sm"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-13 bg-slate-800/60 hover:bg-slate-800 text-rose-400 font-semibold rounded-xl flex items-center justify-center text-sm active:scale-95"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-13 bg-slate-800 hover:bg-slate-700 active:bg-amber-500/20 active:text-amber-300 text-xl font-bold rounded-xl flex items-center justify-center transition-colors shadow-sm"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-13 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl flex items-center justify-center active:scale-95"
          >
            <Delete size={20} />
          </button>
        </div>

        {/* Action Confirm Button */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl active:scale-95 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onSave(numericVal);
              onClose();
            }}
            className="py-3 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 text-sm shadow-lg shadow-amber-500/20"
          >
            <Check size={18} />
            <span>Apply</span>
          </button>
        </div>
      </div>
    </div>
  );
};
