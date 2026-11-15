/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Quote, 
  Client, 
  SavedItem, 
  Profile, 
  QuoteType, 
  QuoteStatus,
  DeviceLicenseState
} from './types';
import { 
  getStoredProfile, 
  saveStoredProfile, 
  getStoredClients, 
  saveStoredClients, 
  getStoredSavedItems, 
  saveStoredSavedItems, 
  getStoredQuotes, 
  saveStoredQuotes, 
  getNextQuoteNumber, 
  recalculateQuote,
  createDefaultSectionsForType 
} from './services/storage';
import {
  FREE_PLAN_QUOTE_LIMIT,
  getStoredDeviceLicense,
  saveStoredDeviceLicense,
  hydrateDeviceLicenseFromIDB,
  isPaidPlanActive,
  isPaidPlanExpired,
  applyActivationToLicense,
} from './utils/licensing';
import { QuoteList } from './components/QuoteList';
import { QuoteBuilder } from './components/QuoteBuilder';
import { ClientsManager } from './components/ClientsManager';
import { SavedItemsManager } from './components/SavedItemsManager';
import { BusinessProfileView } from './components/BusinessProfileView';
import { ClientCardPreview } from './components/ClientCardPreview';
import { AuthModal } from './components/AuthModal';
import { DeviceLicenseGate } from './components/DeviceLicenseGate';
import { ExpiryReminderCard } from './components/ExpiryReminderCard';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { 
  FileText, 
  Users, 
  Package, 
  Building2, 
  Smartphone,
  ArrowLeft, 
  Check,
  CheckCircle2,
  X
} from 'lucide-react';

type Tab = 'quotes' | 'price_list' | 'profile';

export default function App() {
  // App state
  const [activeTab, setActiveTab] = useState<Tab>('quotes');
  const [profile, setProfile] = useState<Profile>(() => getStoredProfile());
  const [clients, setClients] = useState<Client[]>(() => getStoredClients());
  const [savedItems, setSavedItems] = useState<SavedItem[]>(() => getStoredSavedItems());
  const [quotes, setQuotes] = useState<Quote[]>(() => getStoredQuotes());
  const [deviceLicense, setDeviceLicense] = useState<DeviceLicenseState>(() =>
    getStoredDeviceLicense(getStoredQuotes().length)
  );
  const [isClientsModalOpen, setIsClientsModalOpen] = useState(false);

  // Active builder / preview quote
  const [activeQuoteId, setActiveQuoteId] = useState<string | null>(null);
  const [previewQuote, setPreviewQuote] = useState<Quote | null>(null);
  const [previewSavedToast, setPreviewSavedToast] = useState(false);

  // Auth modal
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('builder@trade.ug');
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  // Live clock tick (60s) for 7-day expiry reminder & automatic lock
  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Reconcile IndexedDB backup for device license on mount
  useEffect(() => {
    let mounted = true;
    hydrateDeviceLicenseFromIDB(deviceLicense).then((hydrated) => {
      if (mounted) {
        setDeviceLicense(hydrated);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Persistence triggers
  useEffect(() => {
    saveStoredProfile(profile);
  }, [profile]);

  useEffect(() => {
    saveStoredDeviceLicense(deviceLicense);
  }, [deviceLicense]);

  // Keep Profile plan fields synchronized with DeviceLicenseState
  useEffect(() => {
    const activePaid = isPaidPlanActive(deviceLicense, nowMs);
    const desiredPlan: 'free' | 'paid' = activePaid ? 'paid' : 'free';
    if (
      profile.plan !== desiredPlan ||
      profile.plan_expires_at !== deviceLicense.plan_expires_at ||
      profile.device_code !== deviceLicense.device_code ||
      profile.free_quotes_used !== deviceLicense.free_quotes_used
    ) {
      setProfile((prev) => ({
        ...prev,
        plan: desiredPlan,
        plan_expires_at: deviceLicense.plan_expires_at,
        device_code: deviceLicense.device_code,
        free_quotes_used: deviceLicense.free_quotes_used,
      }));
    }
  }, [deviceLicense, nowMs, profile.plan, profile.plan_expires_at, profile.device_code, profile.free_quotes_used]);

  useEffect(() => {
    saveStoredClients(clients);
  }, [clients]);

  useEffect(() => {
    saveStoredSavedItems(savedItems);
  }, [savedItems]);

  useEffect(() => {
    saveStoredQuotes(quotes);
  }, [quotes]);

  const paidActive = isPaidPlanActive(deviceLicense, nowMs);
  const paidExpired = isPaidPlanExpired(deviceLicense, nowMs);
  const freeQuotaExhausted = !paidActive && deviceLicense.free_quotes_used >= FREE_PLAN_QUOTE_LIMIT;
  // Lock app when free quota is finished (once not actively finishing the 5th quote) or when paid subscription expires
  const isAppLocked = paidExpired || (freeQuotaExhausted && !activeQuoteId && !previewQuote);

  const handleConfirmNewDevice = useCallback(() => {
    setDeviceLicense((prev) => {
      const next: DeviceLicenseState = {
        ...prev,
        device_registered: true,
        updated_at: new Date().toISOString(),
      };
      saveStoredDeviceLicense(next);
      return next;
    });
  }, []);

  const handleActivatePlan = useCallback((months: number, normalizedCode: string) => {
    setDeviceLicense((prev) => {
      const next = applyActivationToLicense(prev, months, normalizedCode);
      saveStoredDeviceLicense(next);
      return next;
    });
  }, []);

  // Handlers for Quotes
  const handleNewQuote = (type: QuoteType) => {
    if (!paidActive && deviceLicense.free_quotes_used >= FREE_PLAN_QUOTE_LIMIT) {
      setActiveQuoteId(null);
      setPreviewQuote(null);
      return;
    }

    const newQuoteId = `q_${Date.now()}`;
    const nextNumber = getNextQuoteNumber(quotes);
    createDefaultSectionsForType(type, newQuoteId);

    const newQuote: Quote = {
      id: newQuoteId,
      quote_number: nextNumber,
      quote_type: type,
      status: 'draft',
      date: new Date().toISOString().split('T')[0],
      valid_until: new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0],
      job_title: '',
      job_location: '',
      client_id: undefined,
      client: undefined,
      sections: [],
      subtotal: 0,
      discount_type: 'percentage',
      discount_value: 0,
      discount_amount: 0,
      tax_rate: profile.tax_rate || 0,
      tax_amount: 0,
      total: 0,
      deposit_type: 'percentage',
      deposit_value: 50,
      deposit_amount: 0,
      total_cost: 0,
      total_profit: 0,
      profit_margin_percent: 0,
      client_view_mode: 'full',
      notes_terms: '50% deposit required upon signing to mobilize materials. Balance payable on completion and inspection. Quotation valid for 14 days.',
      payment_stages: [
        { id: `ps_${Date.now()}_1`, name: 'Mobilization Deposit', percent: 50, amount: 0 },
        { id: `ps_${Date.now()}_2`, name: 'Upon Site Inspection', percent: 30, amount: 0 },
        { id: `ps_${Date.now()}_3`, name: 'Final Handover', percent: 20, amount: 0 },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const recalculated = recalculateQuote(newQuote, profile.tax_rate);
    setQuotes((prev) => {
      const next = [recalculated, ...prev];
      saveStoredQuotes(next);
      return next;
    });
    if (!paidActive) {
      setDeviceLicense((prev) => {
        const next: DeviceLicenseState = {
          ...prev,
          free_quotes_used: prev.free_quotes_used + 1,
          updated_at: new Date().toISOString(),
        };
        saveStoredDeviceLicense(next);
        return next;
      });
    }
    setActiveQuoteId(newQuoteId);
  };

  const handleSaveActiveQuote = useCallback((updated: Quote) => {
    setQuotes((prev) => {
      const exists = prev.some((q) => q.id === updated.id);
      const next = exists ? prev.map((q) => (q.id === updated.id ? updated : q)) : [updated, ...prev];
      saveStoredQuotes(next);
      return next;
    });
  }, []);

  const handleAddSavedItem = useCallback((newItem: SavedItem) => {
    setSavedItems((prev) => {
      const next = [newItem, ...prev];
      saveStoredSavedItems(next);
      return next;
    });
  }, []);

  const handleUpdateProfile = useCallback((updatedProfile: Profile) => {
    setProfile(updatedProfile);
    saveStoredProfile(updatedProfile);
  }, []);

  const handleDuplicateQuote = (quoteToDup: Quote) => {
    const nextNumber = getNextQuoteNumber(quotes);
    const duplicated: Quote = {
      ...quoteToDup,
      id: `q_${Date.now()}`,
      quote_number: nextNumber,
      status: 'draft',
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sections: quoteToDup.sections.map((sec) => ({
        ...sec,
        id: `sec_${Math.random().toString(36).substring(2, 9)}`,
        lines: sec.lines.map((l) => ({
          ...l,
          id: `line_${Math.random().toString(36).substring(2, 9)}`,
        })),
      })),
    };
    const recalculated = recalculateQuote(duplicated, profile.tax_rate);
    setQuotes((prev) => {
      const next = [recalculated, ...prev];
      saveStoredQuotes(next);
      return next;
    });
    setActiveQuoteId(duplicated.id);
  };

  const handleDeleteQuote = (id: string) => {
    setQuotes((prev) => {
      const next = prev.filter((q) => q.id !== id);
      saveStoredQuotes(next);
      return next;
    });
    if (activeQuoteId === id) setActiveQuoteId(null);
    if (previewQuote?.id === id) setPreviewQuote(null);
  };

  const handleStatusChange = (id: string, newStatus: QuoteStatus) => {
    setQuotes((prev) => {
      const next = prev.map((q) => (q.id === id ? { ...q, status: newStatus, updated_at: new Date().toISOString() } : q));
      saveStoredQuotes(next);
      return next;
    });
  };

  // Client handlers
  const handleAddNewClient = (clientData: Partial<Client>): Client => {
    const newClient: Client = {
      id: `cli_${Math.random().toString(36).substring(2, 9)}`,
      name: clientData.name || 'New Client',
      phone: clientData.phone || '',
      email: clientData.email,
      address: clientData.address,
      notes: clientData.notes,
      created_at: new Date().toISOString(),
    };
    setClients((prev) => [newClient, ...prev]);
    return newClient;
  };

  const handleStartQuoteForClient = (client: Client) => {
    if (!paidActive && deviceLicense.free_quotes_used >= FREE_PLAN_QUOTE_LIMIT) {
      setIsClientsModalOpen(false);
      setActiveQuoteId(null);
      setPreviewQuote(null);
      return;
    }

    const newQuoteId = `q_${Date.now()}`;
    const nextNumber = getNextQuoteNumber(quotes);
    createDefaultSectionsForType('materials_labour', newQuoteId);

    const newQuote: Quote = {
      id: newQuoteId,
      quote_number: nextNumber,
      quote_type: 'materials_labour',
      status: 'draft',
      date: new Date().toISOString().split('T')[0],
      valid_until: new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0],
      job_title: '',
      job_location: client.address || '',
      client_id: client.id,
      client: client,
      sections: [],
      subtotal: 0,
      discount_type: 'percentage',
      discount_value: 0,
      discount_amount: 0,
      tax_rate: profile.tax_rate || 0,
      tax_amount: 0,
      total: 0,
      deposit_type: 'percentage',
      deposit_value: 50,
      deposit_amount: 0,
      total_cost: 0,
      total_profit: 0,
      profit_margin_percent: 0,
      client_view_mode: 'full',
      notes_terms: '50% deposit required upon signing to mobilize materials. Balance payable on completion and inspection. Quotation valid for 14 days.',
      payment_stages: [
        { id: `ps_${Date.now()}_1`, name: 'Mobilization Deposit', percent: 50, amount: 0 },
        { id: `ps_${Date.now()}_2`, name: 'Upon Site Inspection', percent: 30, amount: 0 },
        { id: `ps_${Date.now()}_3`, name: 'Final Handover', percent: 20, amount: 0 },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const recalculated = recalculateQuote(newQuote, profile.tax_rate);
    setQuotes((prev) => {
      const next = [recalculated, ...prev];
      saveStoredQuotes(next);
      return next;
    });
    if (!paidActive) {
      setDeviceLicense((prev) => {
        const next: DeviceLicenseState = {
          ...prev,
          free_quotes_used: prev.free_quotes_used + 1,
          updated_at: new Date().toISOString(),
        };
        saveStoredDeviceLicense(next);
        return next;
      });
    }
    setActiveQuoteId(newQuoteId);
  };

  const activeQuote = quotes.find((q) => q.id === activeQuoteId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950 flex flex-col items-center justify-start sm:py-4 sm:px-4">
      {/* Desktop Helper: indicates Phone-Only PWA mode */}
      <div className="hidden sm:flex items-center justify-between w-full max-w-[430px] mb-2 px-3.5 py-1.5 bg-slate-900/80 border border-slate-800 rounded-full text-[11px] text-slate-400 shadow-md">
        <div className="flex items-center gap-1.5 font-semibold text-amber-400">
          <Smartphone size={13} />
          <span>Bill Quatation BQ · PWA</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500">Mobile Viewport</span>
          <PWAInstallButton variant="compact" />
        </div>
      </div>

      {/* =========================================================================
          THE PHONE CONTAINER (Constrained strictly for phones)
          ========================================================================= */}
      <div className="w-full max-w-[430px] h-screen h-dvh sm:h-auto sm:min-h-[860px] sm:max-h-[92vh] sm:rounded-[40px] sm:border-[8px] sm:border-slate-800 bg-slate-950 shadow-2xl relative flex flex-col overflow-hidden sm:ring-1 sm:ring-slate-700/50">
        {/* Dynamic Island / Speaker Notch for phone simulation on desktop */}
        <div className="hidden sm:flex items-center justify-center pt-2 pb-1 bg-slate-900 border-b border-slate-800/60 shrink-0">
          <div className="w-24 h-4 bg-slate-950 rounded-full flex items-center justify-center gap-1.5 border border-slate-800/80">
            <div className="w-2 h-2 rounded-full bg-slate-800" />
            <div className="w-8 h-1 bg-slate-750 rounded-full" />
          </div>
        </div>

        {/* =========================================================================
            PHONE APP BAR (Header)
            ========================================================================= */}
        <header className="bg-slate-900 border-b border-slate-800 px-3 py-2.5 flex items-center justify-between gap-2 z-30 shadow-md shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div 
              onClick={() => {
                setActiveQuoteId(null);
                setPreviewQuote(null);
                setActiveTab('quotes');
              }}
              className="cursor-pointer flex items-center gap-2 group min-w-0"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 font-black flex items-center justify-center text-sm shadow-sm group-hover:scale-105 transition-transform shrink-0">
                BQ
              </div>
              <div className="min-w-0">
                <span className="font-extrabold text-sm tracking-tight text-white block truncate whitespace-nowrap">
                  Bill Quatation BQ
                </span>
                <p className="text-[10px] text-slate-400 font-medium truncate max-w-[170px]">
                  {profile.business_name || 'Quotation Builder'}
                </p>
              </div>
            </div>
          </div>

          {/* User Account / Auth Indicator & PWA Install Button */}
          <div className="flex items-center gap-1.5">
            <PWAInstallButton variant="compact" />
            <button
              type="button"
              onClick={() => setIsAuthOpen(true)}
              className="px-2 py-1 rounded-lg text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium flex items-center gap-1 active:scale-95 cursor-pointer"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Account</span>
            </button>
          </div>
        </header>

        {/* =========================================================================
            MAIN CONTENT ROUTER (or Device Setup / Free Plan Lock Gate)
            ========================================================================= */}
        {!deviceLicense.device_registered ? (
          <DeviceLicenseGate
            mode="unregistered"
            license={deviceLicense}
            onConfirmDevice={handleConfirmNewDevice}
            onActivatePlan={handleActivatePlan}
          />
        ) : isAppLocked ? (
          <DeviceLicenseGate
            mode="locked"
            license={deviceLicense}
            onConfirmDevice={handleConfirmNewDevice}
            onActivatePlan={handleActivatePlan}
          />
        ) : (
        <>
        <ExpiryReminderCard
          license={deviceLicense}
          nowMs={nowMs}
          onActivatePlan={handleActivatePlan}
        />
        <main className="p-3 flex-1 overflow-y-auto pb-28 sm:pb-24">
        {/* VIEW 1: ACTIVE QUOTATION BUILDER */}
        {activeQuoteId && activeQuote ? (
          <QuoteBuilder
            key={activeQuote.id}
            initialQuote={activeQuote}
            clients={clients}
            savedItems={savedItems}
            profile={profile}
            onSaveQuote={handleSaveActiveQuote}
            onBack={() => setActiveQuoteId(null)}
            onAddNewClient={handleAddNewClient}
            onAddSavedItem={handleAddSavedItem}
            onUpdateProfile={handleUpdateProfile}
          />
        ) : previewQuote ? (
          /* VIEW 2: FULL PREVIEW CLIENT CARD */
          <div className="max-w-2xl mx-auto pb-28 space-y-4 animate-in fade-in duration-150">
            {/* Save Success Toast */}
            {previewSavedToast && (
              <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-slate-950 font-black px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 text-xs sm:text-sm animate-in fade-in slide-in-from-top-4 duration-200 border-2 border-emerald-300">
                <CheckCircle2 size={18} className="stroke-[3]" />
                <span>Quotation Saved Successfully!</span>
              </div>
            )}

            {/* Sticky Preview Header Actions (In front when scrolling) */}
            <div className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md py-2 flex items-center justify-between border-b border-slate-800/80 -mx-3 px-3 shadow-md">
              <button
                type="button"
                onClick={() => setPreviewQuote(null)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-slate-700 cursor-pointer active:scale-95 transition-all"
              >
                <ArrowLeft size={16} />
                <span>Back to Quotation</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleSaveActiveQuote(previewQuote);
                    setPreviewSavedToast(true);
                    setTimeout(() => setPreviewSavedToast(false), 2500);
                  }}
                  className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 text-xs font-black rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                >
                  <Check size={16} className="stroke-[3]" />
                  <span>Save Quotation</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveQuoteId(previewQuote.id);
                    setPreviewQuote(null);
                  }}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl active:scale-95 cursor-pointer"
                >
                  Edit in Builder
                </button>
              </div>
            </div>

            <ClientCardPreview
              quote={previewQuote}
              profile={profile}
              interactive={true}
              onUpdateProfile={handleUpdateProfile}
              onViewModeChange={(mode) => {
                const updated = recalculateQuote({ ...previewQuote, client_view_mode: mode }, profile.tax_rate);
                setPreviewQuote(updated);
                handleSaveActiveQuote(updated);
              }}
            />
          </div>
        ) : (
          /* VIEW 3: TABS (Quotes, Price List, Profile) */
          <>
            {activeTab === 'quotes' && (
              <QuoteList
                quotes={quotes}
                clients={clients}
                profile={profile}
                deviceLicense={deviceLicense}
                onEditQuote={(q) => setActiveQuoteId(q.id)}
                onPreviewQuote={(q) => setPreviewQuote(q)}
                onNewQuote={handleNewQuote}
                onDuplicateQuote={handleDuplicateQuote}
                onDeleteQuote={handleDeleteQuote}
                onStatusChange={handleStatusChange}
                onViewClients={() => setIsClientsModalOpen(true)}
              />
            )}

            {activeTab === 'price_list' && (
              <SavedItemsManager
                items={savedItems}
                profile={profile}
                onAddItem={(item) => setSavedItems((prev) => [item, ...prev])}
                onUpdateItem={(item) => setSavedItems((prev) => prev.map((i) => (i.id === item.id ? item : i)))}
                onDeleteItem={(id) => setSavedItems((prev) => prev.filter((i) => i.id !== id))}
                onNavigateToProfile={() => setActiveTab('profile')}
              />
            )}

            {activeTab === 'profile' && (
              <BusinessProfileView
                profile={profile}
                quotes={quotes}
                deviceLicense={deviceLicense}
                onSaveProfile={handleUpdateProfile}
                onActivatePlan={handleActivatePlan}
              />
            )}
          </>
        )}
      </main>

        {/* =========================================================================
            BOTTOM NAVIGATION BAR (Always Visible & In Front When Scrolling Down or Up)
            ========================================================================= */}
        {!activeQuoteId && !previewQuote && (
          <nav className="fixed sm:sticky bottom-0 left-0 right-0 z-50 w-full max-w-[430px] mx-auto bg-slate-900/98 backdrop-blur-xl border-t border-slate-800/90 px-2 py-1.5 shadow-[0_-8px_30px_rgba(0,0,0,0.85)] shrink-0 pb-[max(0.6rem,env(safe-area-inset-bottom))]">
            <div className="grid grid-cols-3 gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('quotes')}
                className={`py-2 flex flex-col items-center justify-center rounded-xl transition-all cursor-pointer ${
                  activeTab === 'quotes'
                    ? 'text-amber-400 font-bold bg-slate-800/80 scale-102'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText size={18} />
                <span className="text-[10px] mt-1 font-medium">Quatation</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('price_list')}
                className={`py-2 flex flex-col items-center justify-center rounded-xl transition-all cursor-pointer ${
                  activeTab === 'price_list'
                    ? 'text-amber-400 font-bold bg-slate-800/80 scale-102'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Package size={18} />
                <span className="text-[10px] mt-1 font-medium">Price list</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={`py-2 flex flex-col items-center justify-center rounded-xl transition-all cursor-pointer ${
                  activeTab === 'profile'
                    ? 'text-amber-400 font-bold bg-slate-800/80 scale-102'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Building2 size={18} />
                <span className="text-[10px] mt-1 font-medium">Profile</span>
              </button>
            </div>
          </nav>
        )}
        </>
        )}

        {/* Offline Indicator Banner */}
        <OfflineIndicator />
      </div>

      {/* View Clients Modal Overlay */}
      {isClientsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-3.5 px-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-amber-400" />
                <h3 className="font-bold text-white text-sm">
                  Clients Directory
                </h3>
                <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-800 text-amber-400 rounded-full">
                  {clients.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsClientsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close Clients"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              <ClientsManager
                clients={clients}
                onAddClient={(c) => setClients((prev) => [c, ...prev])}
                onUpdateClient={(c) => setClients((prev) => prev.map((item) => (item.id === c.id ? c : item)))}
                onDeleteClient={(id) => setClients((prev) => prev.filter((c) => c.id !== id))}
                onStartQuoteForClient={(c) => {
                  setIsClientsModalOpen(false);
                  handleStartQuoteForClient(c);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        currentUserEmail={userEmail}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={(email, businessName) => {
          setUserEmail(email);
          if (businessName) {
            setProfile((prev) => ({ ...prev, business_name: businessName }));
          }
        }}
      />
    </div>
  );
}
