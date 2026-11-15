import { Profile, Client, SavedItem, Quote, QuoteType, QuoteSection, QuoteLine, PaymentMethodItem, QuotationLayoutSettings } from '../types';

const STORAGE_KEYS = {
  PROFILE: 'bq_profile_v1',
  CLIENTS: 'bq_clients_v1',
  SAVED_ITEMS: 'bq_saved_items_v1',
  QUOTES: 'bq_quotes_v1',
  ACTIVE_USER: 'bq_active_user_v1',
};

export const DEFAULT_CATEGORIES = [
  'Materials',
  'Labour',
  'Transport',
  'Equipment',
  'Services',
  'Other',
];

export const DEFAULT_PAYMENT_METHODS: PaymentMethodItem[] = [
  {
    id: 'pm_1',
    type: 'mobile_money',
    title: 'MTN Mobile Money',
    provider: 'MTN Mobile Money',
    account_number: '0772 345 678',
    account_name: 'Mukasa Ronald',
    instructions: 'Include withdrawal fee where applicable',
  },
  {
    id: 'pm_2',
    type: 'bank',
    title: 'Stanbic Bank Uganda',
    provider: 'Stanbic Bank Uganda',
    account_number: '9030018274621',
    account_name: 'Apex Builders Ltd',
    instructions: 'Kampala Forest Mall Branch',
  },
  {
    id: 'pm_3',
    type: 'cash',
    title: 'Cash Payment',
    instructions: 'Cash accepted on milestone inspection and delivery.',
  },
];

export const DEFAULT_QUOTATION_LAYOUT: QuotationLayoutSettings = {
  card_width: 720,
  card_height: 920,
  card_scale: 1.0,
  length_mode: 'compact',
  vertical_spacing: 'tight',
  table_density: 'compact',
  font_size_scale: 'standard',
  font_size_percent: 100,
  padding_density: 'compact',
  compact_terms: true,
  compact_payment: true,
  show_decorations: true,
  export_scale: 2.5,
};

export const DEFAULT_PROFILE: Profile = {
  id: 'usr_001',
  business_name: 'Apex Builders & Decorators',
  tagline: 'Your Success, Our Priority',
  phone: '+256 700 123 456',
  email: 'info@apexbuilders.com',
  address: 'Plot 14 Jinja Road, Kampala, Uganda',
  authorized_signatory: 'Mukasa Ronald',
  currency: 'UGX',
  tax_rate: 0,
  payment_details: {
    mobile_money: {
      provider: 'MTN Mobile Money',
      number: '0772 345 678',
      name: 'Mukasa Ronald',
    },
    bank: {
      bank_name: 'Stanbic Bank Uganda',
      account_number: '9030018274621',
      account_name: 'Apex Builders Ltd',
      branch: 'Kampala Forest Mall Branch',
    },
    cash_terms: 'Cash accepted on milestone inspection and delivery.',
    methods: DEFAULT_PAYMENT_METHODS,
  },
  plan: 'free',
  categories: DEFAULT_CATEGORIES,
  logo_settings: {
    width: 64,
    height: 64,
    zoom: 1,
  },
  quotation_layout: DEFAULT_QUOTATION_LAYOUT,
};

export const DEFAULT_CLIENTS: Client[] = [
  {
    id: 'cli_001',
    name: 'Hon. Peter Ssekandi',
    phone: '+256 701 884 920',
    email: 'p.ssekandi@gmail.com',
    address: 'Plot 14, Ntinda Ministers Village, Kampala',
    notes: 'Residential perimeter wall & gate paving project.',
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    id: 'cli_002',
    name: 'Sarah Nakamya',
    phone: '+256 782 559 311',
    email: 'snakamya@outlook.com',
    address: 'Kyanja Central, Near Mogas',
    notes: '3-bedroom house interior painting and gypsum ceiling.',
    created_at: new Date(Date.now() - 86400000 * 8).toISOString(),
  },
  {
    id: 'cli_003',
    name: 'David Tumusiime',
    phone: '+256 752 901 223',
    email: 'tumusiime.events@gmail.com',
    address: 'Speke Resort Munyonyo',
    notes: 'Wedding reception MC and sound package coordination.',
    created_at: new Date(Date.now() - 86400000 * 12).toISOString(),
  },
];

export const DEFAULT_SAVED_ITEMS: SavedItem[] = [
  // Materials
  { id: 'itm_001', name: 'Portland Cement (Tororo 32.5R)', unit: 'bags', default_price: 36000, category: 'Materials' },
  { id: 'itm_002', name: 'Lake Sand (Fine plastering sand)', unit: 'trips (Forward)', default_price: 240000, category: 'Materials' },
  { id: 'itm_003', name: 'Aggregates 1/2 inch (Concrete stone)', unit: 'trips (Elf)', default_price: 320000, category: 'Materials' },
  { id: 'itm_004', name: 'High-Tensile Rebar (Y12 steel bars)', unit: 'bars', default_price: 48000, category: 'Materials' },
  { id: 'itm_005', name: 'Sadolin Silk Vinyl Paint (20L White)', unit: 'jerrycans', default_price: 285000, category: 'Materials' },
  { id: 'itm_006', name: 'Ceramic Floor Tiles (60x60cm Spanish)', unit: 'boxes', default_price: 65000, category: 'Materials' },

  // Labour & Flat Services
  { id: 'itm_007', name: 'Senior Mason / Plasterer Daily Rate', unit: 'days', default_price: 50000, category: 'Labour' },
  { id: 'itm_008', name: 'Painter Daily Rate', unit: 'days', default_price: 40000, category: 'Labour' },
  { id: 'itm_009', name: 'Certified Electrician Daily Rate', unit: 'days', default_price: 65000, category: 'Labour' },
  { id: 'itm_010', name: 'Site Porter / Helper Daily Rate', unit: 'days', default_price: 25000, category: 'Labour' },
  { id: 'itm_017', name: 'Full House Electrical Piping & Wiring Labour (Lump Sum)', unit: 'lump sum', quantity: 1, default_price: 850000, category: 'Labour', lock_unit_qty: true },

  // Transport & Equipment
  { id: 'itm_011', name: 'Site Delivery Truck / Mobilization', unit: 'trips', default_price: 150000, category: 'Transport' },
  { id: 'itm_012', name: 'Concrete Mixer Hire (with operator)', unit: 'days', default_price: 180000, category: 'Equipment' },
  { id: 'itm_013', name: 'Steel Scaffolding Rental (per set)', unit: 'weeks', default_price: 220000, category: 'Equipment' },

  // Services (MCs / Event trades / Packages)
  { id: 'itm_014', name: 'Professional MC Hosting (Full Event)', unit: 'lump sum', quantity: 1, default_price: 1200000, category: 'Services', lock_unit_qty: true },
  { id: 'itm_015', name: 'PA Sound System + Cordless Microphones', unit: 'sets', default_price: 850000, category: 'Services' },
  { id: 'itm_016', name: 'Event Hall Drape & Floral Stage Backdrop', unit: 'lump sum', quantity: 1, default_price: 2500000, category: 'Services', lock_unit_qty: true },
];

export const createDefaultSectionsForType = (_type: QuoteType, _quoteId: string): QuoteSection[] => {
  return [];
};

export const DEFAULT_QUOTES: Quote[] = [];

// Storage helper functions
export const getStoredProfile = (): Profile => {
  const data = localStorage.getItem(STORAGE_KEYS.PROFILE);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(DEFAULT_PROFILE));
    return DEFAULT_PROFILE;
  }
  try {
    const parsed = JSON.parse(data);
    if (!parsed.categories || !Array.isArray(parsed.categories) || parsed.categories.length === 0) {
      parsed.categories = [...DEFAULT_CATEGORIES];
    }
    if (!parsed.payment_details) {
      parsed.payment_details = { ...DEFAULT_PROFILE.payment_details };
    }
    if (!parsed.payment_details.methods || !Array.isArray(parsed.payment_details.methods) || parsed.payment_details.methods.length === 0) {
      parsed.payment_details.methods = [...DEFAULT_PAYMENT_METHODS];
    }
    if (!parsed.logo_settings || typeof parsed.logo_settings.width !== 'number') {
      parsed.logo_settings = { width: 64, height: 64, zoom: 1 };
    }
    parsed.quotation_layout = {
      ...DEFAULT_QUOTATION_LAYOUT,
      ...(parsed.quotation_layout || {}),
    };
    return parsed;
  } catch {
    return DEFAULT_PROFILE;
  }
};

export const saveStoredProfile = (profile: Profile): void => {
  localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
};

export const getStoredClients = (): Client[] => {
  const data = localStorage.getItem(STORAGE_KEYS.CLIENTS);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(DEFAULT_CLIENTS));
    return DEFAULT_CLIENTS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return DEFAULT_CLIENTS;
  }
};

export const saveStoredClients = (clients: Client[]): void => {
  localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
};

export const getStoredSavedItems = (): SavedItem[] => {
  const data = localStorage.getItem(STORAGE_KEYS.SAVED_ITEMS);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.SAVED_ITEMS, JSON.stringify(DEFAULT_SAVED_ITEMS));
    return DEFAULT_SAVED_ITEMS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return DEFAULT_SAVED_ITEMS;
  }
};

export const saveStoredSavedItems = (items: SavedItem[]): void => {
  localStorage.setItem(STORAGE_KEYS.SAVED_ITEMS, JSON.stringify(items));
};

export const getStoredQuotes = (): Quote[] => {
  const data = localStorage.getItem(STORAGE_KEYS.QUOTES);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(DEFAULT_QUOTES));
    return DEFAULT_QUOTES;
  }
  try {
    return JSON.parse(data);
  } catch {
    return DEFAULT_QUOTES;
  }
};

export const saveStoredQuotes = (quotes: Quote[]): void => {
  localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(quotes));
};

export const getNextQuoteNumber = (quotes: Quote[]): string => {
  if (!quotes || quotes.length === 0) return 'Q-0001';
  let maxNum = 0;
  for (const q of quotes) {
    const match = q.quote_number.match(/^Q-(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  const next = maxNum + 1;
  return `Q-${next.toString().padStart(4, '0')}`;
};

export const recalculateQuote = (quote: Quote, taxRateOverride?: number): Quote => {
  let subtotal = 0;

  // Process all sections & lines
  const sections = quote.sections.map((section, sIdx) => {
    let sPosition = section.position !== undefined ? section.position : sIdx;
    const lines = section.lines.map((line, lIdx) => {
      const qty = Number(line.quantity) || 0;
      const price = Number(line.unit_price) || 0;
      const totalPrice = qty * price;

      subtotal += totalPrice;

      return {
        ...line,
        quantity: qty,
        unit_price: price,
        total_price: totalPrice,
        unit_cost: 0,
        total_cost: 0,
        position: line.position !== undefined ? line.position : lIdx,
      };
    });

    return {
      ...section,
      position: sPosition,
      lines,
    };
  });

  // Discount calculation
  let discountAmount = 0;
  if (quote.discount_type === 'percentage') {
    discountAmount = (subtotal * (Number(quote.discount_value) || 0)) / 100;
  } else {
    discountAmount = Number(quote.discount_value) || 0;
  }
  discountAmount = Math.min(discountAmount, subtotal);
  const afterDiscount = Math.max(0, subtotal - discountAmount);

  // Tax calculation
  const taxRate = taxRateOverride !== undefined ? taxRateOverride : (Number(quote.tax_rate) || 0);
  const taxAmount = (afterDiscount * taxRate) / 100;

  // Final Total
  const total = afterDiscount + taxAmount;

  // Deposit calculation
  let depositAmount = 0;
  if (quote.deposit_type === 'percentage') {
    depositAmount = (total * (Number(quote.deposit_value) || 0)) / 100;
  } else {
    depositAmount = Number(quote.deposit_value) || 0;
  }

  // Update payment stages amounts if percent-based
  const payment_stages = (quote.payment_stages || []).map((stage) => ({
    ...stage,
    amount: (total * (stage.percent || 0)) / 100,
  }));

  return {
    ...quote,
    sections,
    subtotal,
    discount_amount: discountAmount,
    tax_rate: taxRate,
    tax_amount: taxAmount,
    total,
    deposit_amount: depositAmount,
    total_cost: 0,
    total_profit: 0,
    profit_margin_percent: 0,
    payment_stages,
    updated_at: new Date().toISOString(),
  };
};
