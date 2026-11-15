import React, { useState } from 'react';
import { Quote, QuoteStatus, Profile, QuoteType, Client, DeviceLicenseState } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { FREE_PLAN_QUOTE_LIMIT, isPaidPlanActive, getRemainingDays } from '../utils/licensing';
import { 
  Plus, 
  Search, 
  FileText, 
  Trash2, 
  Edit3, 
  Eye, 
  MapPin,
  User,
  Users,
  Briefcase
} from 'lucide-react';

import { PWAInstallButton } from './PWAInstallButton';

interface QuoteListProps {
  quotes: Quote[];
  clients?: Client[];
  profile: Profile;
  deviceLicense?: DeviceLicenseState;
  onEditQuote: (quote: Quote) => void;
  onPreviewQuote: (quote: Quote) => void;
  onNewQuote: (type: QuoteType) => void;
  onDuplicateQuote?: (quote: Quote) => void;
  onDeleteQuote: (id: string) => void;
  onStatusChange: (id: string, newStatus: QuoteStatus) => void;
  onViewClients?: () => void;
}

export const QuoteList: React.FC<QuoteListProps> = ({
  quotes,
  clients = [],
  profile,
  deviceLicense,
  onEditQuote,
  onPreviewQuote,
  onNewQuote,
  onDeleteQuote,
  onStatusChange,
  onViewClients,
}) => {
  const [filterStatus, setFilterStatus] = useState<QuoteStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const currency = profile.currency || 'UGX';

  const filteredQuotes = quotes.filter((q) => {
    const matchesStatus = filterStatus === 'all' || q.status === filterStatus;
    const clientName = q.client?.name || clients.find((c) => c.id === q.client_id)?.name || '';
    const qText = `${q.quote_number} ${q.job_title} ${clientName} ${q.job_location || ''}`.toLowerCase();
    const matchesSearch = !searchQuery || qText.includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: QuoteStatus) => {
    switch (status) {
      case 'draft':
        return <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold">DRAFT</span>;
      case 'sent':
        return <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-bold">SENT</span>;
      case 'accepted':
        return <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">ACCEPTED</span>;
      case 'declined':
        return <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold">DECLINED</span>;
      case 'lost':
        return <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">LOST</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3.5 pb-6">
      {/* PWA Phone Install Banner */}
      <PWAInstallButton variant="banner" />

      {/* Top Action & Search Bar */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
          <div>
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <span>Quatation</span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-800 text-amber-400 rounded-full">
                {quotes.length}
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              {deviceLicense
                ? isPaidPlanActive(deviceLicense)
                  ? `Paid plan · ${getRemainingDays(deviceLicense.plan_expires_at)} days left · Device ${deviceLicense.device_code}`
                  : `Free plan · ${Math.min(deviceLicense.free_quotes_used, FREE_PLAN_QUOTE_LIMIT)} of ${FREE_PLAN_QUOTE_LIMIT} used · Device ${deviceLicense.device_code}`
                : 'Manage, edit, and send quotations to clients'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onViewClients && (
              <button
                type="button"
                onClick={onViewClients}
                className="py-2.5 px-3.5 bg-slate-800 hover:bg-slate-750 active:scale-95 text-amber-300 hover:text-amber-200 border border-slate-700 font-bold rounded-xl flex items-center gap-1.5 text-xs sm:text-sm transition-all cursor-pointer shadow-xs"
              >
                <Users size={16} />
                <span>View Clients</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onNewQuote('materials_labour')}
              className="py-2.5 px-3.5 sm:px-4 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black rounded-xl flex items-center gap-1.5 shadow-lg shadow-amber-500/20 text-xs sm:text-sm transition-all cursor-pointer"
            >
              <Plus size={18} />
              <span>New Quotation</span>
            </button>
          </div>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-3 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by quote #, client, project, or location..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400"
          />
        </div>

        {/* Status Filter Tabs (Scrollable on small devices) */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          {(['all', 'draft', 'sent', 'accepted', 'declined', 'lost'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl capitalize font-medium shrink-0 transition-all ${
                filterStatus === st
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Quotes Cards List */}
      {filteredQuotes.length === 0 ? (
        <div className="p-8 text-center bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl space-y-3">
          <FileText size={32} className="mx-auto text-slate-600" />
          <p className="text-slate-400 text-sm font-medium">No quotations found matching your filter.</p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {onViewClients && (
              <button
                type="button"
                onClick={onViewClients}
                className="text-xs bg-slate-800 text-amber-300 hover:text-amber-200 border border-slate-700 px-4 py-2 rounded-xl font-bold inline-flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-xs"
              >
                <Users size={14} />
                <span>View Clients</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onNewQuote('materials_labour')}
              className="text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2 rounded-xl font-black inline-flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 transition-all"
            >
              <Plus size={14} className="stroke-[3]" />
              <span>Create First Quotation</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredQuotes.map((q) => {
            const lineCount = q.sections.reduce((acc, s) => acc + s.lines.length, 0);
            const clientName = q.client?.name || clients.find((c) => c.id === q.client_id)?.name || 'Unassigned Client';
            const projectName = q.job_title || 'Untitled Project';
            const projectLocation = q.job_location || '';

            return (
              <div
                key={q.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-md transition-all"
              >
                {/* Header row: Quote #, Status Badge, Total Amount, Date */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-amber-400 text-sm sm:text-base tracking-wide bg-amber-400/10 border border-amber-400/20 px-2.5 py-0.5 rounded-lg">
                      {q.quote_number}
                    </span>
                    {getStatusBadge(q.status)}
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-black text-emerald-400 text-base sm:text-lg block leading-tight">
                      {formatCurrency(q.total, currency)}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {formatDate(q.date)}
                    </span>
                  </div>
                </div>

                {/* Key Details requested by user: Client's name, Project name, Project location */}
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-2.5">
                  {/* Client's Name */}
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                      <User size={13} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                        Client's name
                      </span>
                      <p className="font-bold text-white text-xs sm:text-sm truncate">
                        {clientName}
                      </p>
                    </div>
                  </div>

                  {/* Project Name */}
                  <div className="flex items-start gap-2.5 pt-2 border-t border-slate-850">
                    <div className="w-6 h-6 rounded-lg bg-sky-400/10 border border-sky-400/20 text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Briefcase size={13} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                        Project name
                      </span>
                      <p className="font-semibold text-slate-200 text-xs sm:text-sm line-clamp-1">
                        {projectName}
                      </p>
                    </div>
                  </div>

                  {/* Project Location */}
                  <div className="flex items-start gap-2.5 pt-2 border-t border-slate-850">
                    <div className="w-6 h-6 rounded-lg bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin size={13} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                        Project location
                      </span>
                      <p className={`text-xs truncate ${projectLocation ? 'font-medium text-slate-300' : 'text-slate-500 italic'}`}>
                        {projectLocation || 'No location set'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Meta details: Line count, quote type */}
                <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-2.5">
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="bg-slate-800 px-2 py-0.5 rounded-md text-slate-400 font-medium">
                      {lineCount} {lineCount === 1 ? 'line item' : 'line items'}
                    </span>
                    <span className="capitalize text-slate-500">
                      {q.quote_type.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Status selector & Action buttons */}
                <div className="flex items-center justify-between gap-2 border-t border-slate-800/60 pt-2.5">
                  {/* Status Dropdown */}
                  <select
                    value={q.status}
                    onChange={(e) => onStatusChange(q.id, e.target.value as QuoteStatus)}
                    className="bg-slate-950 border border-slate-800 text-[11px] text-slate-300 rounded-lg px-2 py-1 focus:outline-hidden"
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="accepted">Accepted</option>
                    <option value="declined">Declined</option>
                    <option value="lost">Lost</option>
                  </select>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onPreviewQuote(q)}
                      className="p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800 active:scale-95"
                      title="Preview Client Card"
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditQuote(q)}
                      className="px-3 py-1.5 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg active:scale-95 flex items-center gap-1"
                    >
                      <Edit3 size={13} />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(q.id)}
                      className="p-2 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 active:scale-95"
                      title="Delete Quote"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {confirmDeleteId === q.id && (
                  <div className="mt-2.5 p-2.5 bg-rose-950/70 border border-rose-500/50 rounded-xl flex items-center justify-between text-xs animate-in fade-in">
                    <span className="text-rose-200 font-medium">Delete quote {q.quote_number}?</span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteQuote(q.id);
                          setConfirmDeleteId(null);
                        }}
                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
