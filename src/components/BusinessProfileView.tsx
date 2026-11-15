import React, { useState, useRef, useEffect } from 'react';
import { Profile, CurrencyCode, PaymentMethodItem, PaymentMethodType, LogoSettings, QuotationLayoutSettings, Quote, DeviceLicenseState } from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_PAYMENT_METHODS, DEFAULT_QUOTATION_LAYOUT } from '../services/storage';
import { formatWithCommas, parseFormattedNumber } from '../utils/formatters';
import { ClientCardPreview } from './ClientCardPreview';
import {
  FREE_PLAN_QUOTE_LIMIT,
  DAYS_PER_MONTH,
  verifyActivationCode,
  isPaidPlanActive,
  getRemainingDays,
} from '../utils/licensing';
import { 
  Building2, 
  Upload, 
  Trash2, 
  Phone, 
  CreditCard, 
  Banknote, 
  Smartphone, 
  Percent, 
  ShieldCheck, 
  Check, 
  Sparkles,
  Tag,
  Plus,
  Edit2,
  X,
  Briefcase,
  Layers,
  Coins,
  AlertTriangle,
  Landmark,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sliders,
  Maximize2,
  Minimize2,
  ArrowUpDown,
  FileText,
  CheckCircle2,
  Eye,
  EyeOff,
  Type,
  Copy,
  KeyRound,
  AlertCircle
} from 'lucide-react';

interface BusinessProfileViewProps {
  profile: Profile;
  onSaveProfile: (profile: Profile) => void;
  quotes?: Quote[];
  deviceLicense?: DeviceLicenseState;
  onActivatePlan?: (months: number, normalizedCode: string) => void;
}

const OCCUPATION_PRESETS: { label: string; description: string; categories: string[] }[] = [
  {
    label: 'Builder / Mason / Civil Works',
    description: 'Foundation, structural, bricks, cement & site works',
    categories: ['Materials', 'Labour', 'Transport', 'Equipment', 'Other'],
  },
  {
    label: 'Painter & Decorator',
    description: 'Interior/exterior paints, primers, scaffolding & prep',
    categories: ['Paints & Undercoats', 'Wall Prep & Sanding', 'Labour', 'Scaffolding & Ladder', 'Sundries'],
  },
  {
    label: 'MC / Events Host / DJ',
    description: 'Emcee hosting, sound systems, stage & mics',
    categories: ['Hosting & MC Services', 'PA Sound System', 'Wireless Mics & Tech', 'Stage & Lighting', 'Travel / Logistics'],
  },
  {
    label: 'Electrician & Solar',
    description: 'Wiring, consumer units, solar systems & installation',
    categories: ['Cables & Conduits', 'Switches & Sockets', 'Solar & Inverters', 'Electrician Labour', 'Testing & Commissioning'],
  },
  {
    label: 'Plumber & Drainage',
    description: 'Pipes, fittings, sanitary ware & plumbing works',
    categories: ['Pipes & Fittings', 'Sanitary Ware & Taps', 'Tanks & Pumps', 'Plumber Labour', 'Transport'],
  },
  {
    label: 'Carpentry & Joinery',
    description: 'Timber, roofing, wardrobes, doors & carpentry labor',
    categories: ['Timber & Hardwood', 'Board & Plywood', 'Hardware & Hinges', 'Joinery Labour', 'Transport'],
  },
];

const DEFAULT_LOGO_SETTINGS: LogoSettings = {
  width: 64,
  height: 64,
  zoom: 1.0,
};

export const BusinessProfileView: React.FC<BusinessProfileViewProps> = ({
  profile,
  onSaveProfile,
  quotes,
  deviceLicense,
  onActivatePlan,
}) => {
  const [showCardPreviewModal, setShowCardPreviewModal] = useState<boolean>(false);
  const [deviceCodeCopied, setDeviceCodeCopied] = useState<boolean>(false);
  const [activationInput, setActivationInput] = useState<string>('');
  const [activationError, setActivationError] = useState<string>('');
  const [activationSuccess, setActivationSuccess] = useState<string>('');
  const [formData, setFormData] = useState<Profile>(() => {
    const categories = profile.categories && profile.categories.length > 0 
      ? profile.categories 
      : [...DEFAULT_CATEGORIES];

    let methods = profile.payment_details?.methods;
    if (!methods || !Array.isArray(methods) || methods.length === 0) {
      methods = [...DEFAULT_PAYMENT_METHODS];
    }

    const logo_settings = profile.logo_settings && typeof profile.logo_settings.width === 'number'
      ? profile.logo_settings
      : { ...DEFAULT_LOGO_SETTINGS };

    const quotation_layout: QuotationLayoutSettings = {
      ...DEFAULT_QUOTATION_LAYOUT,
      ...(profile.quotation_layout || {}),
    };

    return {
      ...profile,
      categories,
      logo_settings,
      quotation_layout,
      payment_details: {
        ...profile.payment_details,
        methods,
      },
    };
  });

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      plan: profile.plan,
      plan_expires_at: profile.plan_expires_at,
      ...(profile.quotation_layout
        ? {
            quotation_layout: {
              ...DEFAULT_QUOTATION_LAYOUT,
              ...profile.quotation_layout,
            },
          }
        : {}),
    }));
  }, [profile.quotation_layout, profile.plan, profile.plan_expires_at]);

  const defaultPreviewQuote: Quote = {
    id: 'preview_sample_quote',
    quote_number: 'QT-0001',
    quote_type: 'materials_labour',
    status: 'draft',
    date: new Date().toISOString().split('T')[0],
    valid_until: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    expected_duration: { frequency: 'days', value: 7 },
    job_title: 'Quotation for Services',
    job_location: formData.address || 'Kampala, Uganda',
    client: {
      id: 'preview_cli_1',
      name: 'Valued Client',
      phone: '+256 700 123 456',
      email: 'client@example.com',
      address: 'Plot 12, Kololo, Kampala',
      created_at: new Date().toISOString(),
    },
    sections: [
      {
        id: 'sec_1',
        quote_id: 'preview_sample_quote',
        name: 'Scheduled Services & Deliverables',
        position: 1,
        lines: [
          {
            id: 'line_1',
            section_id: 'sec_1',
            line_type: 'item',
            description: 'Service / Product Item One',
            quantity: 1,
            unit: 'Unit',
            unit_price: 250000,
            total_price: 250000,
            position: 1,
          },
          {
            id: 'line_2',
            section_id: 'sec_1',
            line_type: 'item',
            description: 'Service / Product Item Two',
            quantity: 1,
            unit: 'Unit',
            unit_price: 150000,
            total_price: 150000,
            position: 2,
          },
          {
            id: 'line_3',
            section_id: 'sec_1',
            line_type: 'item',
            description: 'Service / Product Item Three',
            quantity: 1,
            unit: 'Unit',
            unit_price: 100000,
            total_price: 100000,
            position: 3,
          },
        ],
      },
    ],
    subtotal: 500000,
    discount_type: 'percentage',
    discount_value: 0,
    discount_amount: 0,
    tax_rate: formData.tax_rate || 0,
    tax_amount: 0,
    total: 500000,
    deposit_type: 'percentage',
    deposit_value: 50,
    deposit_amount: 250000,
    payment_stages: [
      { id: 'ps_1', name: 'Completion of Task One', percent: 50, amount: 250000 },
      { id: 'ps_2', name: 'Completion of Task Two', percent: 30, amount: 150000 },
      { id: 'ps_3', name: 'Final Delivery / Handover', percent: 20, amount: 100000 },
    ],
    client_view_mode: 'full',
    show_options_and_terms: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const previewQuoteToUse = (quotes && quotes.length > 0) ? quotes[0] : defaultPreviewQuote;

  const [saveMessage, setSaveMessage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Logo Settings controls toggle
  const [showLogoControls, setShowLogoControls] = useState<boolean>(true);

  // Quotation Resize controls (auto-save immediately so Quotation page & exports always reflect latest settings)
  const handleQuotationLayoutPatch = (patch: Partial<QuotationLayoutSettings>) => {
    const nextLayout: QuotationLayoutSettings = {
      ...DEFAULT_QUOTATION_LAYOUT,
      ...(formData.quotation_layout || {}),
      ...patch,
    };
    setFormData((prev) => ({
      ...prev,
      quotation_layout: nextLayout,
    }));
    onSaveProfile({
      ...profile,
      quotation_layout: nextLayout,
    });
  };

  const handleQuotationLayoutChange = <K extends keyof QuotationLayoutSettings>(
    field: K,
    value: QuotationLayoutSettings[K]
  ) => {
    handleQuotationLayoutPatch({ [field]: value } as Partial<QuotationLayoutSettings>);
  };

  const handleResetQuotationLayout = () => {
    const resetLayout: QuotationLayoutSettings = { ...DEFAULT_QUOTATION_LAYOUT };
    setFormData((prev) => ({
      ...prev,
      quotation_layout: resetLayout,
    }));
    onSaveProfile({
      ...profile,
      quotation_layout: resetLayout,
    });
  };

  // Category State
  const [newCatInput, setNewCatInput] = useState<string>('');
  const [editingCatIndex, setEditingCatIndex] = useState<number | null>(null);
  const [editingCatValue, setEditingCatValue] = useState<string>('');
  const [confirmDeleteCatIndex, setConfirmDeleteCatIndex] = useState<number | null>(null);
  const [showPresets, setShowPresets] = useState<boolean>(false);
  const [catActionFeedback, setCatActionFeedback] = useState<string>('');

  // Payment Method State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<PaymentMethodItem | null>(null);
  const [confirmDeleteMethodId, setConfirmDeleteMethodId] = useState<string | null>(null);

  // Payment Method Form State
  const [pmType, setPmType] = useState<PaymentMethodType>('mobile_money');
  const [pmTitle, setPmTitle] = useState<string>('MTN Mobile Money');
  const [pmAccountNumber, setPmAccountNumber] = useState<string>('');
  const [pmAccountName, setPmAccountName] = useState<string>('');
  const [pmInstructions, setPmInstructions] = useState<string>('');

  // Per-section hide / show toggle state
  const [hiddenSections, setHiddenSections] = useState<Record<string, boolean>>({});

  const toggleSection = (sectionKey: string) => {
    setHiddenSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const sectionKeys = ['brand_identity', 'quotation_sizing', 'categories', 'payment_details', 'subscription_plan'];
  const areAllCollapsed = sectionKeys.length > 0 && sectionKeys.every((key) => !!hiddenSections[key]);

  const toggleAllSections = () => {
    const nextState = !areAllCollapsed;
    setHiddenSections({
      brand_identity: nextState,
      quotation_sizing: nextState,
      categories: nextState,
      payment_details: nextState,
      subscription_plan: nextState,
    });
  };

  const [logoError, setLogoError] = useState<string>('');

  // Logo Handlers
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setLogoError('Logo image should be under 2MB.');
      setTimeout(() => setLogoError(''), 3500);
      return;
    }
    setLogoError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setFormData((prev) => ({
          ...prev,
          logo_url: event.target?.result as string,
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setFormData((prev) => ({ ...prev, logo_url: undefined }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleLogoSettingChange = (field: keyof LogoSettings, value: number) => {
    setFormData((prev) => ({
      ...prev,
      logo_settings: {
        ...(prev.logo_settings || DEFAULT_LOGO_SETTINGS),
        [field]: value,
      },
    }));
  };

  const handleResetLogoSettings = () => {
    setFormData((prev) => ({
      ...prev,
      logo_settings: { ...DEFAULT_LOGO_SETTINGS },
    }));
  };

  // -------------------------------------------------------------
  // CATEGORIES LOGIC (NO window.confirm / NO window.alert)
  // -------------------------------------------------------------
  const handleAddCategory = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newCatInput.trim();
    if (!trimmed) return;

    const currentCats = formData.categories || [];
    if (currentCats.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      setCatActionFeedback(`Category "${trimmed}" already exists.`);
      setTimeout(() => setCatActionFeedback(''), 3000);
      return;
    }

    setFormData((prev) => ({
      ...prev,
      categories: [...(prev.categories || []), trimmed],
    }));
    setNewCatInput('');
    setCatActionFeedback(`Added "${trimmed}" to categories.`);
    setTimeout(() => setCatActionFeedback(''), 2500);
  };

  const handleExecuteDeleteCategory = (indexToDelete: number) => {
    const currentCats = formData.categories || [];
    if (currentCats.length <= 1) {
      setCatActionFeedback('You must keep at least one category.');
      setTimeout(() => setCatActionFeedback(''), 3000);
      setConfirmDeleteCatIndex(null);
      return;
    }

    const deletedName = currentCats[indexToDelete];
    setFormData((prev) => ({
      ...prev,
      categories: (prev.categories || []).filter((_, idx) => idx !== indexToDelete),
    }));

    setConfirmDeleteCatIndex(null);
    if (editingCatIndex === indexToDelete) {
      setEditingCatIndex(null);
    }
    setCatActionFeedback(`Deleted "${deletedName}".`);
    setTimeout(() => setCatActionFeedback(''), 2500);
  };

  const handleStartEditCat = (index: number) => {
    setEditingCatIndex(index);
    setEditingCatValue((formData.categories || [])[index] || '');
    setConfirmDeleteCatIndex(null);
  };

  const handleSaveEditCat = (index: number) => {
    const trimmed = editingCatValue.trim();
    if (!trimmed) return;

    const currentCats = formData.categories || [];
    if (
      currentCats.some(
        (c, idx) => idx !== index && c.toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      setCatActionFeedback(`Category "${trimmed}" already exists.`);
      setTimeout(() => setCatActionFeedback(''), 3000);
      return;
    }

    setFormData((prev) => ({
      ...prev,
      categories: (prev.categories || []).map((cat, idx) => (idx === index ? trimmed : cat)),
    }));
    setEditingCatIndex(null);
    setEditingCatValue('');
  };

  const handleApplyPreset = (presetCategories: string[], label: string) => {
    setFormData((prev) => ({
      ...prev,
      categories: [...presetCategories],
    }));
    setShowPresets(false);
    setCatActionFeedback(`Loaded ${label} categories! Tap Save below to save.`);
    setTimeout(() => setCatActionFeedback(''), 3500);
  };

  // -------------------------------------------------------------
  // PAYMENT METHODS LOGIC
  // -------------------------------------------------------------
  const openAddPaymentMethodModal = () => {
    setEditingPaymentMethod(null);
    setPmType('mobile_money');
    setPmTitle('MTN Mobile Money');
    setPmAccountNumber('');
    setPmAccountName('');
    setPmInstructions('');
    setIsPaymentModalOpen(true);
  };

  const openEditPaymentMethodModal = (method: PaymentMethodItem) => {
    setEditingPaymentMethod(method);
    setPmType(method.type);
    setPmTitle(method.title);
    setPmAccountNumber(method.account_number || '');
    setPmAccountName(method.account_name || '');
    setPmInstructions(method.instructions || '');
    setIsPaymentModalOpen(true);
  };

  const handleSavePaymentMethod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pmTitle.trim()) {
      setCatActionFeedback('Method title is required.');
      return;
    }

    const currentMethods = formData.payment_details.methods || [];

    if (editingPaymentMethod) {
      const updatedList = currentMethods.map((m) =>
        m.id === editingPaymentMethod.id
          ? {
              ...m,
              type: pmType,
              title: pmTitle.trim(),
              provider: pmTitle.trim(),
              account_number: pmAccountNumber.trim(),
              account_name: pmAccountName.trim(),
              instructions: pmInstructions.trim(),
            }
          : m
      );

      setFormData((prev) => ({
        ...prev,
        payment_details: {
          ...prev.payment_details,
          methods: updatedList,
        },
      }));
    } else {
      const newMethod: PaymentMethodItem = {
        id: `pm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: pmType,
        title: pmTitle.trim(),
        provider: pmTitle.trim(),
        account_number: pmAccountNumber.trim(),
        account_name: pmAccountName.trim(),
        instructions: pmInstructions.trim(),
      };

      setFormData((prev) => ({
        ...prev,
        payment_details: {
          ...prev.payment_details,
          methods: [...currentMethods, newMethod],
        },
      }));
    }

    setIsPaymentModalOpen(false);
  };

  const handleExecuteDeleteMethod = (idToDelete: string) => {
    const currentMethods = formData.payment_details.methods || [];
    const updated = currentMethods.filter((m) => m.id !== idToDelete);

    setFormData((prev) => ({
      ...prev,
      payment_details: {
        ...prev.payment_details,
        methods: updated,
      },
    }));
    setConfirmDeleteMethodId(null);
  };

  const getMethodIcon = (type: PaymentMethodType) => {
    switch (type) {
      case 'mobile_money':
        return <Smartphone size={16} className="text-amber-400 shrink-0" />;
      case 'bank':
        return <Landmark size={16} className="text-sky-400 shrink-0" />;
      case 'cash':
        return <Coins size={16} className="text-emerald-400 shrink-0" />;
      default:
        return <CreditCard size={16} className="text-violet-400 shrink-0" />;
    }
  };

  // Sync legacy fields before saving profile for backwards compatibility
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const methods = formData.payment_details.methods || [];
    const firstMoMo = methods.find((m) => m.type === 'mobile_money');
    const firstBank = methods.find((m) => m.type === 'bank');
    const firstCash = methods.find((m) => m.type === 'cash');

    const updatedProfile: Profile = {
      ...formData,
      payment_details: {
        ...formData.payment_details,
        mobile_money: firstMoMo
          ? {
              provider: (firstMoMo.title.includes('Airtel') ? 'Airtel Money' : 'MTN Mobile Money') as any,
              number: firstMoMo.account_number || '',
              name: firstMoMo.account_name || '',
            }
          : formData.payment_details.mobile_money,
        bank: firstBank
          ? {
              bank_name: firstBank.title || '',
              account_number: firstBank.account_number || '',
              account_name: firstBank.account_name || '',
              branch: firstBank.instructions || '',
            }
          : formData.payment_details.bank,
        cash_terms: firstCash?.instructions || formData.payment_details.cash_terms || '',
        methods,
      },
    };

    onSaveProfile(updatedProfile);
    setSaveMessage('Profile, logo settings & payment details saved!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const methodsList = formData.payment_details.methods || [];
  const logoSettings = formData.logo_settings || DEFAULT_LOGO_SETTINGS;
  const quotationLayout = formData.quotation_layout || DEFAULT_QUOTATION_LAYOUT;

  return (
    <div className="max-w-2xl mx-auto pb-28 space-y-5">
      {/* Page Title */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Building2 size={22} className="text-amber-400" />
            <span>Business Profile</span>
          </h1>
          <p className="text-xs text-slate-400">
            Manage your brand identity, logo sizing, trade categories, and client payment methods.
          </p>
        </div>

        <button
          type="button"
          onClick={toggleAllSections}
          className="text-xs font-semibold px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 rounded-xl flex items-center gap-1.5 shrink-0 transition-all cursor-pointer active:scale-95 shadow-sm"
          title={areAllCollapsed ? 'Show all sections' : 'Hide all sections'}
        >
          {areAllCollapsed ? <Eye size={13} /> : <EyeOff size={13} />}
          <span>{areAllCollapsed ? 'Show All' : 'Hide All'}</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* =========================================================================
            1. BRAND IDENTITY & BUSINESS LOGO SETTINGS
            ========================================================================= */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-sm">
          <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-3">
            <div>
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Building2 size={15} />
                <span>Brand Identity & Business Profile</span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Logo, contacts, address, prepared by, and quotation branding details.
              </p>
            </div>

            <button
              type="button"
              onClick={() => toggleSection('brand_identity')}
              className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 shrink-0 transition-all cursor-pointer active:scale-95 ${
                hiddenSections['brand_identity']
                  ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/60'
              }`}
            >
              {hiddenSections['brand_identity'] ? (
                <>
                  <Eye size={13} />
                  <span>Show</span>
                </>
              ) : (
                <>
                  <EyeOff size={13} />
                  <span>Hide</span>
                </>
              )}
            </button>
          </div>

          {!hiddenSections['brand_identity'] ? (
            <>

          {/* Logo upload & interactive settings */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                Business Logo
              </label>
              {formData.logo_url && (
                <button
                  type="button"
                  onClick={() => setShowLogoControls(!showLogoControls)}
                  className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 active:scale-95"
                >
                  <Sliders size={13} />
                  <span>{showLogoControls ? 'Hide Logo Settings' : 'Logo Settings'}</span>
                </button>
              )}
            </div>

            {/* Logo Preview & Upload Button Row */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-3 bg-slate-950 rounded-xl border border-slate-800">
              {/* Dynamic Logo Bounding Container */}
              <div 
                style={{ 
                  width: `${logoSettings.width}px`, 
                  height: `${logoSettings.height}px` 
                }}
                className="relative rounded-2xl bg-slate-900 border border-slate-700 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-sm transition-all mx-auto sm:mx-0"
              >
                {formData.logo_url ? (
                  <>
                    <img
                      src={formData.logo_url}
                      alt="Logo"
                      style={{ 
                        transform: `scale(${logoSettings.zoom})`,
                        transformOrigin: 'center center'
                      }}
                      className="max-w-full max-h-full object-contain transition-transform"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="absolute top-1 right-1 bg-rose-600 hover:bg-rose-500 text-white p-1 rounded-full shadow-md active:scale-95"
                      title="Remove logo"
                    >
                      <Trash2 size={11} />
                    </button>
                  </>
                ) : (
                  <div className="text-slate-500 flex flex-col items-center justify-center text-center p-1">
                    <Building2 size={24} />
                    <span className="text-[9px] mt-0.5 text-slate-400 font-medium">No Logo</span>
                  </div>
                )}
              </div>

              {/* Upload actions & dimension tags */}
              <div className="space-y-1.5 flex-1 text-center sm:text-left">
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    id="logo-upload"
                  />
                  <label
                    htmlFor="logo-upload"
                    className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 active:scale-95 shadow-sm"
                  >
                    <Upload size={14} className="text-amber-400" />
                    <span>{formData.logo_url ? 'Change Logo Image' : 'Upload Business Logo'}</span>
                  </label>
                  <p className="text-[11px] text-slate-500 mt-1">PNG, JPG or SVG up to 2MB</p>
                  {logoError && (
                    <p className="text-xs text-rose-400 font-semibold mt-1.5 animate-in fade-in">
                      {logoError}
                    </p>
                  )}
                </div>

                {formData.logo_url && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 justify-center sm:justify-start">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-amber-300">
                      W: {logoSettings.width}px × H: {logoSettings.height}px
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-emerald-400">
                      Zoom: {Math.round(logoSettings.zoom * 100)}%
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* LOGO SETTINGS PANEL (Image Height, Image Width, Zoom In and Out) */}
            {formData.logo_url && showLogoControls && (
              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Sliders size={14} />
                    <span>Logo Appearance Controls</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleResetLogoSettings}
                    className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 active:scale-95"
                    title="Reset to default logo dimensions"
                  >
                    <RotateCcw size={12} />
                    <span>Reset Default</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  {/* Image Width Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-300">
                      <span className="font-semibold">Image Width</span>
                      <span className="font-mono font-bold text-amber-400">
                        {logoSettings.width}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="36"
                      max="180"
                      step="2"
                      value={logoSettings.width}
                      onChange={(e) => handleLogoSettingChange('width', parseInt(e.target.value, 10))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>36px</span>
                      <span>Compact</span>
                      <span>180px (Wide)</span>
                    </div>
                  </div>

                  {/* Image Height Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-300">
                      <span className="font-semibold">Image Height</span>
                      <span className="font-mono font-bold text-amber-400">
                        {logoSettings.height}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="36"
                      max="130"
                      step="2"
                      value={logoSettings.height}
                      onChange={(e) => handleLogoSettingChange('height', parseInt(e.target.value, 10))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>36px</span>
                      <span>Standard</span>
                      <span>130px (Tall)</span>
                    </div>
                  </div>
                </div>

                {/* Zoom In & Out Controls */}
                <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span className="font-semibold flex items-center gap-1">
                      <Maximize2 size={13} className="text-amber-400" />
                      <span>Zoom In and Out</span>
                    </span>
                    <span className="font-mono font-bold text-emerald-400">
                      {Math.round(logoSettings.zoom * 100)}%
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        handleLogoSettingChange('zoom', Math.max(0.5, Math.round((logoSettings.zoom - 0.1) * 10) / 10))
                      }
                      className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-slate-200 active:scale-95"
                      title="Zoom Out"
                    >
                      <ZoomOut size={16} />
                    </button>

                    <input
                      type="range"
                      min="0.5"
                      max="2.5"
                      step="0.05"
                      value={logoSettings.zoom}
                      onChange={(e) => handleLogoSettingChange('zoom', parseFloat(e.target.value))}
                      className="flex-1 accent-emerald-500 cursor-pointer"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        handleLogoSettingChange('zoom', Math.min(2.5, Math.round((logoSettings.zoom + 0.1) * 10) / 10))
                      }
                      className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-slate-200 active:scale-95"
                      title="Zoom In"
                    >
                      <ZoomIn size={16} />
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Scale your logo symbol inside the bounding frame for a balanced look on quotation cards.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Business Name */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Business / Trade Name *
            </label>
            <input
              type="text"
              required
              value={formData.business_name}
              onChange={(e) => setFormData((prev) => ({ ...prev, business_name: e.target.value }))}
              placeholder="e.g. Apex Construction & Interiors"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-hidden focus:border-amber-400"
            />
          </div>

          {/* Phone / WhatsApp */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Business WhatsApp / Phone Number *
            </label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="e.g. +256 772 345 678"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-hidden focus:border-amber-400"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Clients will use this number to send acceptance replies and payments.
            </p>
          </div>

          {/* Business Slogan / Tagline */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Business Slogan / Tagline
            </label>
            <input
              type="text"
              value={formData.tagline || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, tagline: e.target.value }))}
              placeholder="e.g. Your Success, Our Priority"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-hidden focus:border-amber-400"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Appears elegantly under your business name on quotation cards.
            </p>
          </div>

          {/* Official Email & Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Official Business Email
              </label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="e.g. info@yourbusiness.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-hidden focus:border-amber-400"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Business Address / Location
              </label>
              <input
                type="text"
                value={formData.address || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="e.g. Plot 14 Jinja Road, Kampala"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-hidden focus:border-amber-400"
              />
            </div>
          </div>

          {/* Prepared by */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Prepared by
            </label>
            <input
              type="text"
              value={formData.authorized_signatory || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, authorized_signatory: e.target.value }))}
              placeholder="e.g. Mukasa Ronald / Estimator"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-hidden focus:border-amber-400"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Name of a person who made this Quatation there
            </p>
          </div>

          {/* Currency & Tax */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Currency (Default UGX)
              </label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData((prev) => ({ ...prev, currency: e.target.value as CurrencyCode }))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white"
              >
                <option value="UGX">UGX - Uganda Shilling</option>
                <option value="USD">USD - US Dollar</option>
                <option value="KES">KES - Kenya Shilling</option>
                <option value="TZS">TZS - Tanzania Shilling</option>
                <option value="RWF">RWF - Rwanda Franc</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="EUR">EUR - Euro</option>
                <option value="ZAR">ZAR - South African Rand</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Default Tax Rate (%)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={formatWithCommas(formData.tax_rate ?? 0)}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^\d.]/g, '');
                  setFormData((prev) => ({ ...prev, tax_rate: parseFormattedNumber(raw) }));
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white font-mono"
              />
            </div>
          </div>
            </>
          ) : (
            <div className="py-2.5 px-3.5 rounded-xl bg-slate-950/60 border border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
              <span className="truncate">
                {formData.business_name ? `${formData.business_name} • Details hidden` : 'Business profile details hidden'}
              </span>
              <button
                type="button"
                onClick={() => toggleSection('brand_identity')}
                className="text-amber-400 font-semibold hover:underline shrink-0 ml-2 cursor-pointer"
              >
                Tap Show to view
              </button>
            </div>
          )}
        </div>

        {/* =========================================================================
            2. QUOTATION SIZING & DIMENSIONS (FIX QUOTATION LENGTH & FIT)
            Allows businesses to customize quotation length, vertical height, scale, and layout.
            ========================================================================= */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-md">
          <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg">
                  <Minimize2 size={16} />
                </span>
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-400">
                  Quotation Sizing, Length & Page Fit
                </h2>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Fix the quotation card length, shrink vertical height, and customize layout proportions so it fits comfortably on phone screens and exports as a crisp commercial flyer.
              </p>
            </div>

            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowCardPreviewModal(true)}
                  className="text-xs text-slate-950 bg-amber-400 hover:bg-amber-300 font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
                  title="Preview quotation card with current settings"
                >
                  <Eye size={13} />
                  <span>Preview</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetQuotationLayout}
                  className="text-xs text-slate-400 hover:text-white px-2.5 py-1.5 bg-slate-850 hover:bg-slate-800 rounded-lg border border-slate-700/60 flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                  title="Reset quotation size to standard defaults"
                >
                  <RotateCcw size={12} />
                  <span>Reset</span>
                </button>
              </div>

              {/* Hide / Show button positioned below Reset button */}
              <button
                type="button"
                onClick={() => toggleSection('quotation_sizing')}
                className={`text-xs font-semibold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                  hiddenSections['quotation_sizing']
                    ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30'
                    : 'bg-slate-850 hover:bg-slate-800 text-slate-300 border-slate-700/60'
                }`}
                title={hiddenSections['quotation_sizing'] ? 'Show Quotation Sizing section' : 'Hide Quotation Sizing section'}
              >
                {hiddenSections['quotation_sizing'] ? (
                  <>
                    <Eye size={12} />
                    <span>Show</span>
                  </>
                ) : (
                  <>
                    <EyeOff size={12} />
                    <span>Hide</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {!hiddenSections['quotation_sizing'] ? (
            <>

          {/* Quick Stats Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono px-2.5 py-1 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold">
              Width: {quotationLayout.card_width || 720}px
            </span>
            <span className="text-[10px] font-mono px-2.5 py-1 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold">
              Height: {quotationLayout.card_height ? `${quotationLayout.card_height}px` : 'Auto (Fit)'}
            </span>
            <span className="text-[10px] font-mono px-2.5 py-1 rounded-md bg-sky-500/20 border border-sky-500/40 text-sky-300 font-bold">
              Font: {quotationLayout.font_size_percent || 100}%
            </span>
            <span className="text-[10px] font-mono px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-amber-300 font-bold">
              Zoom: {Math.round((quotationLayout.card_scale || 1.0) * 100)}%
            </span>
            <span className="text-[10px] font-mono px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-slate-400 capitalize">
              Spacing: {quotationLayout.vertical_spacing || 'tight'}
            </span>
          </div>

          {/* CONTROL 1: QUOTATION CARD HEIGHT & LENGTH SLIDER */}
          <div className="space-y-2 p-3 bg-slate-950/80 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <ArrowUpDown size={14} className="text-amber-400" />
                <span>Quotation Card Height</span>
              </span>
              <span className="font-mono font-black text-amber-400 text-sm">
                {quotationLayout.card_height ? `${quotationLayout.card_height}px` : 'Auto (Fit Content)'}
              </span>
            </div>

            <p className="text-[11px] text-slate-400">
              Adjust the vertical height and length of the quotation flyer. A compact height keeps the card on a single mobile screen and prevents endless scrolling on WhatsApp.
            </p>

            {/* Height Slider */}
            <input
              type="range"
              min="650"
              max="1600"
              step="25"
              value={quotationLayout.card_height || 920}
              onChange={(e) => handleQuotationLayoutChange('card_height', parseInt(e.target.value, 10))}
              className="w-full accent-amber-500 cursor-pointer"
            />

            <div className="flex justify-between text-[10px] text-slate-500">
              <span>650px (Compact Flyer)</span>
              <span>920px (Standard Flyer)</span>
              <span>1600px (Tall Document)</span>
            </div>

            {/* Quick Height Presets */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
              {[
                { label: 'Short Flyer', height: 750, desc: '1-Page Fit' },
                { label: 'Standard', height: 920, desc: 'Recommended' },
                { label: 'Medium', height: 1150, desc: 'Detailed' },
                { label: 'Tall Document', height: 1400, desc: 'Multi-Milestone' },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleQuotationLayoutChange('card_height', preset.height)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex flex-col items-center transition-all cursor-pointer ${
                    quotationLayout.card_height === preset.height
                      ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                      : 'bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800'
                  }`}
                >
                  <span>{preset.label}</span>
                  <span className="text-[9px] font-mono opacity-80">{preset.height}px</span>
                </button>
              ))}
            </div>
          </div>

          {/* CONTROL 2: QUOTATION CARD WIDTH SLIDER */}
          <div className="space-y-2 p-3 bg-slate-950/80 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <Sliders size={14} className="text-emerald-400" />
                <span>Quotation Card Width</span>
              </span>
              <span className="font-mono font-black text-emerald-400 text-sm">
                {quotationLayout.card_width ? `${quotationLayout.card_width}px` : '720px (Default)'}
              </span>
            </div>

            <p className="text-[11px] text-slate-400">
              Set the flyer width. 720px is optimal for crisp WhatsApp sharing and prevents narrow columns from wrapping unexpectedly.
            </p>

            {/* Width Slider */}
            <input
              type="range"
              min="520"
              max="960"
              step="20"
              value={quotationLayout.card_width || 720}
              onChange={(e) => handleQuotationLayoutChange('card_width', parseInt(e.target.value, 10))}
              className="w-full accent-emerald-500 cursor-pointer"
            />

            <div className="flex justify-between text-[10px] text-slate-500">
              <span>520px (Slim Phone)</span>
              <span>720px (Standard Flyer)</span>
              <span>960px (Wide HD)</span>
            </div>

            {/* Quick Width Presets */}
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {[
                { label: 'Slim Mobile', width: 580 },
                { label: 'Standard Flyer', width: 720 },
                { label: 'Wide Document', width: 860 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleQuotationLayoutChange('card_width', preset.width)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    (quotationLayout.card_width || 720) === preset.width
                      ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                      : 'bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800'
                  }`}
                >
                  <span>{preset.label}</span>
                  <span className="block text-[9px] font-mono opacity-80">{preset.width}px</span>
                </button>
              ))}
            </div>
          </div>

          {/* CONTROL 3: Overall Quotation Scale / Zoom */}
          <div className="space-y-2 p-3 bg-slate-950/80 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <ZoomIn size={14} className="text-amber-400" />
                <span>Quotation Scale & Zoom</span>
              </span>
              <span className="font-mono font-black text-amber-400 text-sm">
                {Math.round((quotationLayout.card_scale || 1.0) * 100)}%
              </span>
            </div>

            {/* Scale Slider */}
            <input
              type="range"
              min="0.75"
              max="1.40"
              step="0.05"
              value={quotationLayout.card_scale || 1.0}
              onChange={(e) => handleQuotationLayoutChange('card_scale', parseFloat(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />

            <div className="flex justify-between text-[10px] text-slate-500">
              <span>75% (Compact)</span>
              <span>100% (Standard)</span>
              <span>140% (Extra Large)</span>
            </div>

            {/* Preset Scale Buttons */}
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {[
                { label: '80%', scale: 0.8, desc: 'Compact' },
                { label: '100%', scale: 1.0, desc: 'Standard' },
                { label: '115%', scale: 1.15, desc: 'Medium' },
                { label: '130%', scale: 1.3, desc: 'Large' },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleQuotationLayoutChange('card_scale', preset.scale)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex flex-col items-center transition-all cursor-pointer ${
                    Math.abs((quotationLayout.card_scale || 1.0) - preset.scale) < 0.02
                      ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                      : 'bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800'
                  }`}
                >
                  <span>{preset.label}</span>
                  <span className="text-[9px] opacity-80">{preset.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* CONTROL 4: QUOTATION TEXT FONT SIZE SLIDER & PRESETS */}
          <div className="space-y-2 p-3 bg-slate-950/80 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <Type size={14} className="text-sky-400" />
                <span>Quotation Text Font Size</span>
              </span>
              <span className="font-mono font-black text-sky-400 text-sm">
                {quotationLayout.font_size_percent || 100}%
              </span>
            </div>

            <p className="text-[11px] text-slate-400">
              Adjust the font size of all text and numbers on the quotation flyer. A smaller font fits more line items onto a single page, while a larger font makes descriptions and prices bold and easy to read on WhatsApp.
            </p>

            {/* Font Size Slider */}
            <input
              type="range"
              min="75"
              max="140"
              step="5"
              value={quotationLayout.font_size_percent || 100}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                const fontScale =
                  val <= 85 ? 'compact' :
                  val <= 105 ? 'standard' :
                  val <= 118 ? 'medium' :
                  val <= 128 ? 'large' : 'extra_large';
                handleQuotationLayoutPatch({
                  font_size_percent: val,
                  font_size_scale: fontScale,
                });
              }}
              className="w-full accent-sky-500 cursor-pointer"
            />

            <div className="flex justify-between text-[10px] text-slate-500">
              <span>75% (Compact Font)</span>
              <span>100% (Standard Font)</span>
              <span>140% (Extra Large Font)</span>
            </div>

            {/* Quick Font Presets */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 pt-1">
              {[
                { label: 'Small', percent: 85, scale: 'compact' as const, desc: 'Compact Fit' },
                { label: 'Standard', percent: 100, scale: 'standard' as const, desc: 'Normal 100%' },
                { label: 'Medium', percent: 110, scale: 'medium' as const, desc: 'Clear' },
                { label: 'Large', percent: 125, scale: 'large' as const, desc: 'Readable' },
                { label: 'X-Large', percent: 135, scale: 'extra_large' as const, desc: 'High Visibility' },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    handleQuotationLayoutPatch({
                      font_size_percent: preset.percent,
                      font_size_scale: preset.scale,
                    });
                  }}
                  className={`py-1.5 px-1.5 rounded-lg text-xs font-semibold flex flex-col items-center transition-all cursor-pointer ${
                    (quotationLayout.font_size_percent || 100) === preset.percent
                      ? 'bg-sky-500 text-slate-950 font-black shadow-xs'
                      : 'bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800'
                  }`}
                >
                  <span>{preset.label}</span>
                  <span className="text-[9px] font-mono opacity-80">{preset.percent}%</span>
                </button>
              ))}
            </div>

            {/* Live Text Sample Display */}
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 overflow-hidden">
              <span className="text-[10px] text-slate-400 font-semibold shrink-0">Live Font Sample:</span>
              <span 
                style={{ fontSize: `${Math.round(12 * ((quotationLayout.font_size_percent || 100) / 100) * 10) / 10}px` }} 
                className="font-medium text-white truncate max-w-full"
              >
                Quotation Item: 3 Bags of Cement @ UGX 38,000 • Total: UGX 114,000
              </span>
            </div>
          </div>

          {/* CONTROL 4: VERTICAL SECTION SPACING & TABLE ROW DENSITY */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Vertical Height Spacing */}
            <div className="space-y-1.5 p-3 bg-slate-950/80 rounded-xl border border-slate-800/80">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>Vertical Section Spacing</span>
                <span className="text-[10px] text-amber-400 font-mono capitalize">
                  {quotationLayout.vertical_spacing || 'tight'}
                </span>
              </label>
              <div className="grid grid-cols-3 gap-1">
                {(['tight', 'standard', 'spacious'] as const).map((space) => (
                  <button
                    key={space}
                    type="button"
                    onClick={() => handleQuotationLayoutChange('vertical_spacing', space)}
                    className={`py-1.5 px-1.5 rounded-lg text-[11px] font-semibold capitalize transition-all cursor-pointer ${
                      (quotationLayout.vertical_spacing || 'tight') === space
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800'
                    }`}
                  >
                    {space === 'tight' ? 'Tight (Short)' : space === 'standard' ? 'Normal' : 'Spacious'}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-500">
                Tight reduces vertical gaps between tables and payment cards.
              </p>
            </div>

            {/* Table Row Height & Density */}
            <div className="space-y-1.5 p-3 bg-slate-950/80 rounded-xl border border-slate-800/80">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>Table Row Density</span>
                <span className="text-[10px] text-emerald-400 font-mono capitalize">
                  {quotationLayout.table_density || 'compact'}
                </span>
              </label>
              <div className="grid grid-cols-3 gap-1">
                {(['compact', 'standard', 'spacious'] as const).map((density) => (
                  <button
                    key={density}
                    type="button"
                    onClick={() => handleQuotationLayoutChange('table_density', density)}
                    className={`py-1.5 px-1.5 rounded-lg text-[11px] font-semibold capitalize transition-all cursor-pointer ${
                      (quotationLayout.table_density || 'compact') === density
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800'
                    }`}
                  >
                    {density === 'compact' ? 'Compact' : density === 'standard' ? 'Standard' : 'Spacious'}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-500">
                Compact rows reduce item table height by up to 40%.
              </p>
            </div>
          </div>

          {/* LIVE MINI QUOTATION CARD PREVIEW */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300">Live Size & Height Preview</span>
              <span className="text-[10px] font-mono text-amber-400 font-bold">
                📐 {quotationLayout.card_width || 720}px W × {quotationLayout.card_height ? `${quotationLayout.card_height}px` : 'Auto'} H
              </span>
            </div>

            {/* Live scaled preview container */}
            {(() => {
              const targetW = quotationLayout.card_width || 720;
              const targetH = quotationLayout.card_height || 920;
              const targetZoom = quotationLayout.card_scale || 1.0;
              const maxBoxW = 240;
              const maxBoxH = 210;
              const boxScale = Math.min(maxBoxW / targetW, maxBoxH / targetH);
              const boxW = Math.max(95, Math.round(targetW * boxScale));
              const boxH = Math.max(85, Math.round(targetH * boxScale));

              return (
                <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/60 flex items-center justify-center overflow-hidden min-h-[140px]">
                  <div
                    style={{
                      width: `${boxW}px`,
                      height: `${boxH}px`,
                      fontSize: `${Math.round(8 * ((quotationLayout.font_size_percent || 100) / 100) * targetZoom * 10) / 10}px`,
                    }}
                    className="bg-white text-slate-900 rounded-xl shadow-md p-2.5 border border-slate-200 transition-all flex flex-col justify-between overflow-hidden"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-4 h-4 rounded bg-[#0B2545] text-white flex items-center justify-center text-[7px] font-bold shrink-0">
                          BQ
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-[#0B2545] leading-none uppercase text-[8px] truncate">
                            {formData.business_name || 'YOUR BUSINESS'}
                          </p>
                          <p className="text-[6.5px] italic text-slate-500 truncate">Your Success, Our Priority</p>
                        </div>
                      </div>
                      <span className="px-1 py-0.5 rounded bg-[#0B2545] text-white font-mono font-bold text-[6.5px] shrink-0">
                        QT-0001
                      </span>
                    </div>

                    <div className="space-y-1 flex-1 flex flex-col justify-center py-1">
                      <div className="grid grid-cols-2 gap-1 text-[7px] text-slate-700 bg-[#EBF3FB] p-1 rounded">
                        <div className="truncate">Client: <strong>Client</strong></div>
                        <div className="text-right truncate">Total: <strong className="text-[#0B2545]">500,000</strong></div>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded w-full" />
                      <div className="h-1.5 bg-slate-100 rounded w-3/4" />
                    </div>

                    <div className="h-1.5 bg-[#0B2545] rounded-full w-full relative overflow-hidden">
                      <div className="h-full w-1/3 bg-[#F59E0B] ml-auto" />
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Full Preview Action Button */}
            <button
              type="button"
              onClick={() => setShowCardPreviewModal(true)}
              className="w-full py-2.5 px-3 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Eye size={15} />
              <span>Preview Quotation Card with Current Settings</span>
            </button>
          </div>
            </>
          ) : (
            <div className="py-2.5 px-3.5 rounded-xl bg-slate-950/60 border border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
              <span className="truncate">
                Quotation sizing ({quotationLayout.card_width || 720}px W × {quotationLayout.card_height ? `${quotationLayout.card_height}px` : 'Auto'} H • {Math.round((quotationLayout.card_scale || 1.0) * 100)}% zoom)
              </span>
              <button
                type="button"
                onClick={() => toggleSection('quotation_sizing')}
                className="text-amber-400 font-semibold hover:underline shrink-0 ml-2 cursor-pointer"
              >
                Tap Show to view
              </button>
            </div>
          )}
        </div>

        {/* =========================================================================
            3. PRICE LIST CATEGORIES (With Reliable Inline Delete & Edit)
            ========================================================================= */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
          <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-3">
            <div>
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Tag size={15} />
                <span>Price List Categories</span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Customize categories to match your occupation (e.g. builders use Materials & Labour; MCs use Hosting & Sound).
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowPresets(!showPresets)}
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg shrink-0 flex items-center gap-1 active:scale-95 cursor-pointer"
              >
                <Briefcase size={13} />
                <span>{showPresets ? 'Hide Presets' : 'Trade Presets'}</span>
              </button>

              <button
                type="button"
                onClick={() => toggleSection('categories')}
                className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 shrink-0 transition-all cursor-pointer active:scale-95 ${
                  hiddenSections['categories']
                    ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/60'
                }`}
              >
                {hiddenSections['categories'] ? (
                  <>
                    <Eye size={13} />
                    <span>Show</span>
                  </>
                ) : (
                  <>
                    <EyeOff size={13} />
                    <span>Hide</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {!hiddenSections['categories'] ? (
            <>

          {/* Action Feedback Toast */}
          {catActionFeedback && (
            <div className="p-2 bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
              <Check size={14} className="shrink-0" />
              <span>{catActionFeedback}</span>
            </div>
          )}

          {/* Trade Presets Drawer */}
          {showPresets && (
            <div className="p-3 bg-slate-950 rounded-xl border border-amber-500/30 space-y-2.5 animate-in fade-in duration-150">
              <span className="text-[11px] font-bold text-amber-300 block uppercase tracking-wider">
                Tap Your Trade to Load Standard Categories:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {OCCUPATION_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => handleApplyPreset(p.categories, p.label)}
                    className="p-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-amber-400/60 rounded-xl text-left text-xs transition-colors group active:scale-98"
                  >
                    <span className="font-bold text-white group-hover:text-amber-400 block truncate">
                      {p.label}
                    </span>
                    <span className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                      {p.categories.join(' • ')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Add Category Form */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newCatInput}
              onChange={(e) => setNewCatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCategory();
                }
              }}
              placeholder="Add new category (e.g. Scaffolding, Wall Prep, Catering)..."
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400"
            />
            <button
              type="button"
              onClick={() => handleAddCategory()}
              disabled={!newCatInput.trim()}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1 active:scale-95 transition-all shadow-sm"
            >
              <Plus size={15} />
              <span>Add</span>
            </button>
          </div>

          {/* Active Categories List */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Active Categories ({(formData.categories || []).length})
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(formData.categories || []).map((cat, idx) => {
                const isEditing = editingCatIndex === idx;
                const isConfirmingDelete = confirmDeleteCatIndex === idx;

                return (
                  <div
                    key={`${cat}-${idx}`}
                    className={`p-2.5 bg-slate-950 rounded-xl border transition-all ${
                      isConfirmingDelete
                        ? 'border-rose-500/60 bg-rose-950/20'
                        : isEditing
                        ? 'border-amber-400'
                        : 'border-slate-800'
                    } flex items-center justify-between gap-2 shadow-xs group`}
                  >
                    {isEditing ? (
                      /* Inline Edit Mode */
                      <div className="flex items-center gap-1.5 flex-1">
                        <input
                          type="text"
                          value={editingCatValue}
                          onChange={(e) => setEditingCatValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveEditCat(idx);
                            } else if (e.key === 'Escape') {
                              setEditingCatIndex(null);
                            }
                          }}
                          autoFocus
                          className="flex-1 bg-slate-900 border border-amber-400 text-xs text-white px-2 py-1 rounded-lg focus:outline-hidden"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEditCat(idx)}
                          className="p-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg active:scale-95"
                          title="Save category"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCatIndex(null)}
                          className="p-1.5 text-slate-400 hover:text-white rounded-lg active:scale-95"
                          title="Cancel"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : isConfirmingDelete ? (
                      /* Inline Delete Confirmation (Reliable, no window.confirm) */
                      <div className="flex items-center justify-between gap-2 w-full text-xs">
                        <span className="text-rose-300 font-semibold truncate">
                          Delete "{cat}"?
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleExecuteDeleteCategory(idx)}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-[11px] active:scale-95"
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteCatIndex(null)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] active:scale-95"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Normal Display Mode */
                      <>
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                          <span className="text-xs font-semibold text-slate-200 truncate">
                            {cat}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEditCat(idx)}
                            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 active:scale-95"
                            title="Edit category name"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmDeleteCatIndex(idx);
                              setEditingCatIndex(null);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-900 active:scale-95"
                            title="Delete category"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
            </>
          ) : (
            <div className="py-2.5 px-3.5 rounded-xl bg-slate-950/60 border border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
              <span className="truncate">
                Price list categories hidden ({(formData.categories || []).length} categories configured)
              </span>
              <button
                type="button"
                onClick={() => toggleSection('categories')}
                className="text-amber-400 font-semibold hover:underline shrink-0 ml-2 cursor-pointer"
              >
                Tap Show to view
              </button>
            </div>
          )}
        </div>

        {/* =========================================================================
            3. PAYMENT DETAILS (Dynamic Methods: Edit, Delete, Add Another Method)
            ========================================================================= */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
            <div>
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <CreditCard size={15} />
                <span>Payment Details (Printed on Client Card)</span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Add, edit, or delete the payment options shown to clients on the quotation card.
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={openAddPaymentMethodModal}
                className="py-1.5 px-3 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1 shadow-sm shrink-0 transition-all cursor-pointer"
              >
                <Plus size={14} />
                <span>Add Method</span>
              </button>

              <button
                type="button"
                onClick={() => toggleSection('payment_details')}
                className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 shrink-0 transition-all cursor-pointer active:scale-95 ${
                  hiddenSections['payment_details']
                    ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/60'
                }`}
              >
                {hiddenSections['payment_details'] ? (
                  <>
                    <Eye size={13} />
                    <span>Show</span>
                  </>
                ) : (
                  <>
                    <EyeOff size={13} />
                    <span>Hide</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {!hiddenSections['payment_details'] ? (
            <>

          {/* Payment Methods List */}
          {methodsList.length === 0 ? (
            <div className="p-4 bg-slate-950 rounded-xl border border-dashed border-slate-800 text-center space-y-2">
              <CreditCard size={24} className="mx-auto text-slate-600" />
              <p className="text-xs text-slate-400">No payment methods configured yet.</p>
              <button
                type="button"
                onClick={openAddPaymentMethodModal}
                className="text-xs text-amber-400 hover:underline font-bold"
              >
                + Add your first payment method
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {methodsList.map((method) => {
                const isConfirmingDelete = confirmDeleteMethodId === method.id;

                return (
                  <div
                    key={method.id}
                    className={`p-3 bg-slate-950 rounded-xl border transition-all ${
                      isConfirmingDelete
                        ? 'border-rose-500/60 bg-rose-950/20'
                        : 'border-slate-800 hover:border-slate-700/80'
                    }`}
                  >
                    {isConfirmingDelete ? (
                      /* Inline Delete Confirmation */
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-rose-300 font-semibold truncate">
                          Remove "{method.title}"?
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleExecuteDeleteMethod(method.id)}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs active:scale-95"
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteMethodId(null)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs active:scale-95"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Normal Method Card */
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 mt-0.5">
                            {getMethodIcon(method.type)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm text-white truncate">
                                {method.title}
                              </h4>
                              <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded-md bg-slate-900 text-slate-400 border border-slate-800 shrink-0">
                                {method.type.replace('_', ' ')}
                              </span>
                            </div>

                            {method.account_number && (
                              <p className="text-xs font-mono font-bold text-amber-400 mt-0.5">
                                {method.account_number}
                              </p>
                            )}

                            {method.account_name && (
                              <p className="text-[11px] text-slate-400">
                                Name: <span className="text-slate-200">{method.account_name}</span>
                              </p>
                            )}

                            {method.instructions && (
                              <p className="text-[11px] text-slate-500 italic mt-0.5 line-clamp-1">
                                {method.instructions}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Action buttons: Edit & Delete */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => openEditPaymentMethodModal(method)}
                            className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-900 hover:bg-slate-800 active:scale-95"
                            title="Edit payment method"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteMethodId(method.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg bg-slate-900 hover:bg-slate-800 active:scale-95"
                            title="Delete payment method"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick Add Button underneath */}
          {methodsList.length > 0 && (
            <button
              type="button"
              onClick={openAddPaymentMethodModal}
              className="w-full py-2 bg-slate-950 hover:bg-slate-850 border border-dashed border-slate-800 hover:border-amber-400/50 rounded-xl text-xs text-amber-400 font-semibold flex items-center justify-center gap-1.5 active:scale-98 transition-all"
            >
              <Plus size={14} />
              <span>Add Another Payment Method</span>
            </button>
          )}
            </>
          ) : (
            <div className="py-2.5 px-3.5 rounded-xl bg-slate-950/60 border border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
              <span className="truncate">
                Payment methods hidden ({methodsList.length} payment options configured)
              </span>
              <button
                type="button"
                onClick={() => toggleSection('payment_details')}
                className="text-amber-400 font-semibold hover:underline shrink-0 ml-2 cursor-pointer"
              >
                Tap Show to view
              </button>
            </div>
          )}
        </div>

        {/* =========================================================================
            4. CURRENT PLAN OVERVIEW
            ========================================================================= */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-400" />
                <span>Subscription Plan</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase font-mono">
                {formData.plan.toUpperCase()} PLAN
              </span>
            </div>

            <button
              type="button"
              onClick={() => toggleSection('subscription_plan')}
              className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 shrink-0 transition-all cursor-pointer active:scale-95 ${
                hiddenSections['subscription_plan']
                  ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/60'
              }`}
            >
              {hiddenSections['subscription_plan'] ? (
                <>
                  <Eye size={13} />
                  <span>Show</span>
                </>
              ) : (
                <>
                  <EyeOff size={13} />
                  <span>Hide</span>
                </>
              )}
            </button>
          </div>

          {!hiddenSections['subscription_plan'] ? (
            <>
              {(() => {
                const paidActive = deviceLicense ? isPaidPlanActive(deviceLicense) : formData.plan === 'paid';
                const daysLeft = deviceLicense?.plan_expires_at
                  ? getRemainingDays(deviceLicense.plan_expires_at)
                  : getRemainingDays(formData.plan_expires_at);
                const freeUsed = deviceLicense?.free_quotes_used ?? (quotes?.length || 0);
                const deviceCode = deviceLicense?.device_code || formData.device_code || '----';

                const handleCopyDevice = async () => {
                  if (!deviceCode || deviceCode === '----') return;
                  try {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                      await navigator.clipboard.writeText(deviceCode);
                    } else {
                      const ta = document.createElement('textarea');
                      ta.value = deviceCode;
                      ta.style.position = 'fixed';
                      ta.style.opacity = '0';
                      document.body.appendChild(ta);
                      ta.select();
                      document.execCommand('copy');
                      document.body.removeChild(ta);
                    }
                    setDeviceCodeCopied(true);
                    setTimeout(() => setDeviceCodeCopied(false), 2000);
                  } catch {
                    // ignore clipboard fallback failure
                  }
                };

                const handleInlineActivate = () => {
                  setActivationError('');
                  setActivationSuccess('');
                  if (!deviceLicense || !onActivatePlan) return;
                  const res = verifyActivationCode(
                    deviceLicense.device_code,
                    activationInput,
                    deviceLicense.redeemed_codes
                  );
                  if (!res.valid || !res.months || !res.normalizedCode) {
                    setActivationError(res.error || 'Invalid activation code.');
                    return;
                  }
                  onActivatePlan(res.months, res.normalizedCode);
                  setActivationInput('');
                  setActivationSuccess(
                    `Activated for ${res.months} ${res.months === 1 ? 'month' : 'months'} (${res.days} days)!`
                  );
                  setTimeout(() => setActivationSuccess(''), 4000);
                };

                return (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-400">
                      {paidActive
                        ? `Paid plan active · ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} remaining (${DAYS_PER_MONTH} days per month).`
                        : `Free plan includes ${FREE_PLAN_QUOTE_LIMIT} quotations (${Math.min(freeUsed, FREE_PLAN_QUOTE_LIMIT)} of ${FREE_PLAN_QUOTE_LIMIT} used on this device).`}
                    </p>

                    {/* Device Code Box */}
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[11px] text-slate-400 block">Device Code (Send to developer)</span>
                        <span className="font-mono font-black text-base tracking-[0.22em] text-amber-400 select-all">
                          {deviceCode}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyDevice}
                        className="min-h-[40px] px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs flex items-center gap-1.5 border border-slate-700 cursor-pointer active:scale-95 transition-all"
                      >
                        {deviceCodeCopied ? <Check size={14} /> : <Copy size={14} />}
                        <span>{deviceCodeCopied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    {/* Configurable Paid Pricing */}
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-2">
                      <span className="font-bold text-amber-400 block">Configurable Paid Pricing:</span>
                      <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between">
                        <span className="text-slate-300 font-medium text-xs">Monthly</span>
                        <span className="font-mono font-bold text-white text-sm">10,000 UGX</span>
                      </div>
                    </div>

                    {/* Activate / Renew Paid Plan */}
                    {deviceLicense && onActivatePlan && (
                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                        <span className="text-xs font-semibold text-slate-300 block">
                          {paidActive ? 'Extend Paid Plan (Enter Activation Code)' : 'Activate Paid Plan'}
                        </span>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            maxLength={8}
                            value={activationInput}
                            onChange={(e) => {
                              setActivationInput(e.target.value.toUpperCase());
                              setActivationError('');
                            }}
                            placeholder="Paste 6-character code"
                            className="flex-1 min-h-[42px] bg-slate-900 border border-slate-700 focus:border-emerald-400 rounded-xl px-3 py-2 font-mono font-bold text-sm tracking-[0.2em] text-white uppercase placeholder:text-slate-500 placeholder:tracking-normal placeholder:font-sans placeholder:text-xs focus:outline-hidden"
                          />
                          <button
                            type="button"
                            onClick={handleInlineActivate}
                            className="min-h-[42px] px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shrink-0 transition-all"
                          >
                            <KeyRound size={14} />
                            <span>Activate</span>
                          </button>
                        </div>

                        {activationError && (
                          <div className="text-xs text-rose-400 flex items-center gap-1.5 pt-1">
                            <AlertCircle size={13} className="shrink-0" />
                            <span>{activationError}</span>
                          </div>
                        )}
                        {activationSuccess && (
                          <div className="text-xs text-emerald-400 flex items-center gap-1.5 pt-1">
                            <Check size={13} className="shrink-0" />
                            <span>{activationSuccess}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </>
          ) : (
            <div className="py-2.5 px-3.5 rounded-xl bg-slate-950/60 border border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
              <span className="truncate">Subscription plan details hidden ({formData.plan.toUpperCase()} Plan)</span>
              <button
                type="button"
                onClick={() => toggleSection('subscription_plan')}
                className="text-amber-400 font-semibold hover:underline shrink-0 ml-2 cursor-pointer"
              >
                Tap Show to view
              </button>
            </div>
          )}
        </div>

        {/* =========================================================================
            SAVE BUTTON & STATUS
            ========================================================================= */}
        <div className="pt-2">
          {saveMessage && (
            <div className="mb-3 p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
              <Check size={16} />
              <span>{saveMessage}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 active:scale-98 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 text-sm flex items-center justify-center gap-2 transition-all"
          >
            <Check size={18} />
            <span>Save Business Profile & Settings</span>
          </button>
        </div>
      </form>

      {/* =========================================================================
          ADD / EDIT PAYMENT METHOD MODAL (With Vertical Scroll & Bold Warnings)
          ========================================================================= */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
          <div 
            className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl max-h-[88vh] flex flex-col shadow-2xl text-white overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header (Fixed at top) */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900 shrink-0">
              <h3 className="font-bold text-base text-amber-400 flex items-center gap-2">
                <CreditCard size={18} />
                <span>{editingPaymentMethod ? 'Edit Payment Method' : 'Add Payment Method'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Scrollable Form Body (Allows Vertical Scrolling while typing) */}
            <form onSubmit={handleSavePaymentMethod} className="p-4 overflow-y-auto space-y-4 flex-1 overscroll-contain">
              {/* Method Type */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Payment Method Type
                </label>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setPmType('mobile_money');
                      if (!pmTitle || pmTitle === 'Bank Transfer' || pmTitle === 'Cash Payment') {
                        setPmTitle('MTN Mobile Money');
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-center font-semibold transition-all ${
                      pmType === 'mobile_money'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    Mobile Money
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPmType('bank');
                      if (!pmTitle || pmTitle.includes('Mobile Money') || pmTitle === 'Cash Payment') {
                        setPmTitle('Stanbic Bank');
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-center font-semibold transition-all ${
                      pmType === 'bank'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    Bank Transfer
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPmType('cash');
                      if (!pmTitle || pmTitle.includes('Mobile') || pmTitle.includes('Bank')) {
                        setPmTitle('Cash on Site');
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-center font-semibold transition-all ${
                      pmType === 'cash'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    Cash
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPmType('custom');
                      setPmTitle('');
                    }}
                    className={`p-2.5 rounded-xl border text-center font-semibold transition-all ${
                      pmType === 'custom'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    Other / Custom
                  </button>
                </div>
              </div>

              {/* Title / Provider */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Method Name / Provider *
                </label>
                <input
                  type="text"
                  required
                  value={pmTitle}
                  onChange={(e) => setPmTitle(e.target.value)}
                  placeholder={
                    pmType === 'mobile_money'
                      ? 'e.g. MTN Mobile Money / Airtel Money'
                      : pmType === 'bank'
                      ? 'e.g. Stanbic Bank / Centenary Bank'
                      : pmType === 'cash'
                      ? 'e.g. Cash upon Inspection'
                      : 'e.g. Wave, M-Pesa, Chipper Cash'
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-hidden focus:border-amber-400"
                />
              </div>

              {/* Account Number / Phone with prominent bold instruction */}
              {pmType !== 'cash' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-200 block leading-tight">
                    <span>
                      {pmType === 'mobile_money'
                        ? 'Mobile Money Number *'
                        : pmType === 'bank'
                        ? 'Bank Account Number *'
                        : 'Account / Wallet Number *'}
                    </span>
                    <strong className="text-amber-400 font-extrabold ml-1.5 inline-block bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/30 text-[11px]">
                      (Ensure this correct number)
                    </strong>
                  </label>
                  <input
                    type="text"
                    required
                    value={pmAccountNumber}
                    onChange={(e) => setPmAccountNumber(e.target.value)}
                    placeholder={
                      pmType === 'mobile_money'
                        ? '0772 123 456'
                        : pmType === 'bank'
                        ? '9030018274621'
                        : 'Account or handle'
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white font-mono focus:outline-hidden focus:border-amber-400"
                  />
                  <p className="text-[10px] text-slate-400">
                    Double-check digits carefully to prevent clients sending payment to the wrong line.
                  </p>
                </div>
              )}

              {/* Account Name with prominent bold instruction */}
              {pmType !== 'cash' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-200 block leading-tight">
                    <span>Account Holder / Registered Name</span>
                    <strong className="text-amber-400 font-extrabold ml-1.5 inline-block bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/30 text-[11px]">
                      (Ensure this correct name)
                    </strong>
                  </label>
                  <input
                    type="text"
                    value={pmAccountName}
                    onChange={(e) => setPmAccountName(e.target.value)}
                    placeholder="e.g. Mukasa Ronald / Apex Builders Ltd"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-hidden focus:border-amber-400"
                  />
                  <p className="text-[10px] text-slate-400">
                    Must match the name that appears when the client dials the mobile money or bank code.
                  </p>
                </div>
              )}

              {/* Instructions / Notes */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Instructions / Notes (Shown on quotation card)
                </label>
                <input
                  type="text"
                  value={pmInstructions}
                  onChange={(e) => setPmInstructions(e.target.value)}
                  placeholder={
                    pmType === 'mobile_money'
                      ? 'e.g. Include withdrawal fee'
                      : pmType === 'bank'
                      ? 'e.g. Kampala Forest Mall Branch'
                      : 'e.g. Cash accepted on milestone inspection'
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-400"
                />
              </div>

              {/* Action Buttons inside scrollable form or sticky bottom */}
              <div className="flex gap-2 pt-3 pb-2 border-t border-slate-800 sticky bottom-0 bg-slate-900">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold rounded-xl text-xs active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 shadow-md shadow-amber-500/20"
                >
                  <Check size={16} />
                  <span>{editingPaymentMethod ? 'Save Changes' : 'Add Method'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          LIVE QUOTATION CARD PREVIEW MODAL
          Shows the real quotation preview card with current profile settings applied.
          ========================================================================= */}
      {showCardPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-3.5 sm:p-4 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0 bg-slate-900/95 backdrop-blur-md">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <Eye size={18} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white truncate">Quotation Live Preview</h3>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 shrink-0">
                      {formData.quotation_layout?.card_width || 720}px W
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 shrink-0">
                      {formData.quotation_layout?.card_height ? `${formData.quotation_layout.card_height}px H` : 'Auto H'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">
                    Zoom: {Math.round((formData.quotation_layout?.card_scale || 1.0) * 100)}% • Spacing: {formData.quotation_layout?.vertical_spacing || 'tight'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCardPreviewModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors shrink-0"
                title="Close preview"
              >
                <X size={18} />
              </button>
            </div>

            {/* In-Modal Quick Width & Height Toolbar */}
            <div className="px-3.5 py-2 bg-slate-950 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
              <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                <span className="text-[11px] text-slate-400">Height:</span>
                <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                  {[
                    { label: '750px', height: 750, desc: 'Short' },
                    { label: '920px', height: 920, desc: 'Standard' },
                    { label: '1150px', height: 1150, desc: 'Medium' },
                    { label: '1400px', height: 1400, desc: 'Tall' },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => handleQuotationLayoutChange('card_height', item.height)}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                        formData.quotation_layout?.card_height === item.height
                          ? 'bg-amber-500 text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title={item.desc}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="text-slate-400">Width:</span>
                <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                  {[
                    { label: '580px', width: 580 },
                    { label: '720px', width: 720 },
                    { label: '860px', width: 860 },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => handleQuotationLayoutChange('card_width', item.width)}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                        (formData.quotation_layout?.card_width || 720) === item.width
                          ? 'bg-emerald-500 text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="text-slate-400">Font:</span>
                <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                  {[
                    { label: '85%', percent: 85, scale: 'compact' as const },
                    { label: '100%', percent: 100, scale: 'standard' as const },
                    { label: '110%', percent: 110, scale: 'medium' as const },
                    { label: '125%', percent: 125, scale: 'large' as const },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        handleQuotationLayoutPatch({
                          font_size_percent: item.percent,
                          font_size_scale: item.scale,
                        });
                      }}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                        (formData.quotation_layout?.font_size_percent || 100) === item.percent
                          ? 'bg-sky-500 text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Body: The Real Quotation Card */}
            <div className="p-3 sm:p-5 overflow-y-auto flex-1 bg-slate-950/70">
              <div 
                className="mx-auto transition-all"
                style={{ maxWidth: `${formData.quotation_layout?.card_width || 720}px` }}
              >
                <ClientCardPreview
                  quote={previewQuoteToUse}
                  profile={formData}
                  interactive={false}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:p-4 border-t border-slate-800 flex items-center justify-between gap-2 shrink-0 bg-slate-900">
              <button
                type="button"
                onClick={() => setShowCardPreviewModal(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
              >
                Close Preview
              </button>

              <button
                type="button"
                onClick={() => {
                  onSaveProfile(formData);
                  setSaveMessage('✓ Quotation layout settings saved successfully!');
                  setShowCardPreviewModal(false);
                  setTimeout(() => setSaveMessage(''), 3500);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer"
              >
                <Check size={14} />
                <span>Save These Settings</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
