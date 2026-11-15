export type CurrencyCode = 'UGX' | 'USD' | 'KES' | 'TZS' | 'RWF' | 'GBP' | 'EUR' | 'ZAR';

export type QuoteType = 'materials_labour' | 'service_package' | 'mixed';

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'lost';

export type LineType = 'item' | 'hours' | 'fixed';

export type ClientViewMode = 'full' | 'section_totals' | 'one_total';

export type ValueType = 'percentage' | 'fixed';

export type DurationFrequency = 'hours' | 'days' | 'weeks' | 'months' | 'years' | 'years_months';

export interface DurationSegment {
  id: string;
  frequency: 'hours' | 'days' | 'weeks' | 'months' | 'years';
  value: number | '';
}

export interface ExpectedDuration {
  frequency?: DurationFrequency;
  value?: number | '';
  secondary_value?: number | '';
  custom_text?: string;
  segments?: DurationSegment[];
}

export interface MobileMoneyDetails {
  provider: 'MTN Mobile Money' | 'Airtel Money' | 'M-Pesa' | 'Other';
  number: string;
  name: string;
}

export interface BankDetails {
  bank_name: string;
  account_number: string;
  account_name: string;
  branch?: string;
}

export type PaymentMethodType = 'mobile_money' | 'bank' | 'cash' | 'custom';

export interface PaymentMethodItem {
  id: string;
  type: PaymentMethodType;
  title: string;
  provider?: string;
  account_number?: string;
  account_name?: string;
  instructions?: string;
}

export interface PaymentDetails {
  mobile_money: MobileMoneyDetails;
  bank: BankDetails;
  cash_terms: string;
  methods?: PaymentMethodItem[];
}

export interface LogoSettings {
  width: number; // e.g. 48 to 200 px
  height: number; // e.g. 36 to 140 px
  zoom: number; // e.g. 0.5 to 2.5 (1 = 100%)
}

export type QuotationLengthMode = 'compact' | 'standard' | 'expanded';
export type VerticalSpacingDensity = 'tight' | 'standard' | 'spacious';
export type TableRowDensity = 'compact' | 'standard' | 'spacious';

export type FontSizeScale = 'compact' | 'standard' | 'medium' | 'large' | 'extra_large';

export interface QuotationLayoutSettings {
  card_width?: number; // e.g. 500 to 950 px (default 720)
  card_height?: number; // e.g. 600 to 1600 px (default 920 or auto/content fit)
  card_scale?: number; // e.g. 0.75 to 1.4 (default 1.0)
  length_mode?: QuotationLengthMode; // 'compact' (short/one-page fit) | 'standard' | 'expanded'
  vertical_spacing?: VerticalSpacingDensity; // 'tight' | 'standard' | 'spacious'
  table_density?: TableRowDensity; // 'compact' | 'standard' | 'spacious'
  font_size_scale?: FontSizeScale;
  font_size_percent?: number; // e.g. 75 to 140 % (default 100)
  padding_density?: 'compact' | 'standard' | 'spacious';
  compact_terms?: boolean; // short concise terms to reduce vertical length
  compact_payment?: boolean; // concise payment section to reduce vertical length
  show_decorations?: boolean; // whether to show top & bottom decorative wave banners
  export_scale?: number; // 2, 2.5, 3
}

export interface Profile {
  id: string;
  business_name: string;
  tagline?: string;
  logo_url?: string;
  logo_settings?: LogoSettings;
  quotation_layout?: QuotationLayoutSettings;
  phone: string;
  email?: string;
  address?: string;
  website?: string;
  signature_url?: string;
  authorized_signatory?: string;
  currency: CurrencyCode;
  tax_rate: number; // default 0%
  payment_details: PaymentDetails;
  plan: 'free' | 'paid';
  plan_expires_at?: string;
  device_code?: string;
  free_quotes_used?: number;
  categories?: string[]; // Custom occupation categories
}

export interface DeviceLicenseState {
  device_code: string;
  device_registered: boolean;
  free_quotes_used: number;
  plan: 'free' | 'paid';
  plan_expires_at?: string;
  last_activated_months?: number;
  last_activated_at?: string;
  redeemed_codes: string[];
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  user_id?: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  created_at: string;
}

export interface SavedItem {
  id: string;
  user_id?: string;
  name: string;
  unit: string;
  quantity?: number;
  default_quantity?: number;
  default_price: number;
  default_cost?: number;
  category: string;
  lock_unit_qty?: boolean;
}

export interface QuoteLine {
  id: string;
  section_id: string;
  line_type: LineType;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  unit_cost?: number; // builder-only
  total_cost?: number; // builder-only
  position: number;
}

export interface QuoteSection {
  id: string;
  quote_id: string;
  name: string;
  category?: string;
  position: number;
  lines: QuoteLine[];
}

export interface PaymentStage {
  id: string;
  name: string;
  percent: number;
  amount: number;
}

export interface Quote {
  id: string;
  user_id?: string;
  client_id?: string;
  client?: Client;
  quote_number: string;
  quote_type: QuoteType;
  status: QuoteStatus;
  date: string;
  valid_until?: string;
  expected_duration?: ExpectedDuration;
  job_title: string;
  job_location?: string;
  
  // Specific to Service / Package
  event_date?: string;
  event_time?: string;
  event_venue?: string;

  sections: QuoteSection[];
  
  // Financial calculations
  subtotal: number;
  discount_type: ValueType;
  discount_value: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  deposit_type: ValueType;
  deposit_value: number;
  deposit_amount: number;
  
  // Profit calculations (optional)
  total_cost?: number;
  total_profit?: number;
  profit_margin_percent?: number;

  // View modes
  client_view_mode: ClientViewMode;
  notes_terms?: string;
  show_options_and_terms?: boolean;
  payment_stages: PaymentStage[];

  // Image card metadata (for Phase 2 & 3)
  card_image_url?: string;
  card_image_created_at?: string;
  is_paid_plan_rendering?: boolean;
  sent_at?: string;
  remind_at?: string;
  reminder_count?: number;

  created_at: string;
  updated_at: string;
}
