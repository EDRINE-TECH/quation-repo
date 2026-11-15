import { CurrencyCode, ExpectedDuration, Quote, Profile } from '../types';

export const formatCurrency = (amount: number, currency: CurrencyCode = 'UGX'): string => {
  if (isNaN(amount) || amount === null || amount === undefined) {
    amount = 0;
  }
  
  // Format with thousands separator
  const formattedNumber = Math.round(amount).toLocaleString('en-US');
  
  switch (currency) {
    case 'UGX':
      return `UGX ${formattedNumber}`;
    case 'USD':
      return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'KES':
      return `KES ${formattedNumber}`;
    case 'TZS':
      return `TZS ${formattedNumber}`;
    case 'RWF':
      return `RWF ${formattedNumber}`;
    case 'GBP':
      return `£${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'EUR':
      return `€${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'ZAR':
      return `R ${formattedNumber}`;
    default:
      return `${currency} ${formattedNumber}`;
  }
};

export const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

export const getCleanPhoneNumber = (phone: string): string => {
  return phone.replace(/[^\d+]/g, '');
};

export const getWhatsAppUrl = (phone: string, text?: string): string => {
  let clean = phone.replace(/[^\d]/g, '');
  // If Ugandan local number starting with 07..., transform to 2567...
  if (clean.startsWith('0') && clean.length === 10) {
    clean = '256' + clean.slice(1);
  }
  const encodedText = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${clean}${encodedText}`;
};

/**
 * Formats full quote into clear message text for WhatsApp and Email sharing.
 */
export const formatQuoteMessage = (quote: Quote, profile: Profile): string => {
  const currency = profile.currency || 'UGX';
  const clientName = quote.client?.name || 'Valued Client';
  const lines: string[] = [
    `*QUOTATION: ${quote.quote_number}*`,
    `From: *${profile.business_name || 'Apex Builders'}*`,
    `To: *${clientName}*`,
    quote.client?.phone ? `Phone: ${quote.client.phone}` : '',
    `Project: *${quote.job_title || 'General Works'}*`,
    quote.job_location ? `Location: ${quote.job_location}` : '',
    quote.expected_duration && formatExpectedDuration(quote.expected_duration)
      ? `Duration: ${formatExpectedDuration(quote.expected_duration)}`
      : '',
    `Date: ${formatDate(quote.date)}`,
    `--------------------------------`,
  ];

  if (quote.sections && quote.sections.length > 0) {
    quote.sections.forEach((sec, idx) => {
      const secTotal = sec.lines.reduce((acc, l) => acc + (Number(l.total_price) || 0), 0);
      lines.push(`\n*${idx + 1}. ${sec.name}* (${formatCurrency(secTotal, currency)})`);
      sec.lines.forEach((l) => {
        lines.push(` • ${l.description} - ${l.quantity} ${l.unit} @ ${formatCurrency(l.unit_price, currency)} = ${formatCurrency(l.total_price, currency)}`);
      });
    });
    lines.push(`--------------------------------`);
  }

  lines.push(`*Total Amount:* *${formatCurrency(quote.total, currency)}*`);
  if (quote.deposit_amount && quote.deposit_amount > 0) {
    lines.push(`*Required Deposit:* ${formatCurrency(quote.deposit_amount, currency)} (${quote.deposit_value}${quote.deposit_type === 'percentage' ? '%' : ''})`);
  }

  if (quote.payment_stages && quote.payment_stages.length > 0) {
    lines.push(`\n*Payment Stages:*`);
    quote.payment_stages.forEach((st) => {
      lines.push(` - ${st.name}: ${st.percent}% (${formatCurrency(st.amount, currency)})`);
    });
  }

  if (quote.notes_terms) {
    lines.push(`\n*Notes & Terms:*`);
    lines.push(quote.notes_terms);
  }

  lines.push(`\nReply *YES* to accept this quotation.`);
  return lines.filter(Boolean).join('\n');
};

/**
 * Formats any number or numeric string to include commas after every 3 digits (e.g. 1000 -> 1,000).
 */
export const formatWithCommas = (val: number | string | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '';
  const str = String(val).replace(/,/g, '').trim();
  if (str === '') return '';
  
  // If it ends with a dot while user is typing, preserve it
  const hasTrailingDot = str.endsWith('.');
  const parts = str.split('.');
  const integerPart = parts[0];
  const decimalPart = parts.length > 1 ? parts[1] : null;

  // Insert commas into integer part
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  if (hasTrailingDot) {
    return `${formattedInteger}.`;
  }
  if (decimalPart !== null) {
    return `${formattedInteger}.${decimalPart}`;
  }
  return formattedInteger;
};

/**
 * Strips commas and parses as float. Returns 0 if invalid or empty.
 */
export const parseFormattedNumber = (val: string | number | undefined | null): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const clean = val.replace(/,/g, '').trim();
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
};

/**
 * Formats ExpectedDuration object into human-readable string (e.g. "1 year and 7 months", "5 days", "2 weeks").
 */
export const formatExpectedDuration = (d?: ExpectedDuration): string => {
  if (!d) return '';

  // If segments array is provided and has items
  if (d.segments && Array.isArray(d.segments) && d.segments.length > 0) {
    const validParts: string[] = [];
    for (const seg of d.segments) {
      const v = Number(seg.value) || 0;
      if (v <= 0) continue;
      const freq = seg.frequency;
      let unit = '';
      if (freq === 'hours') unit = v === 1 ? 'hour' : 'hours';
      else if (freq === 'days') unit = v === 1 ? 'day' : 'days';
      else if (freq === 'weeks') unit = v === 1 ? 'week' : 'weeks';
      else if (freq === 'months') unit = v === 1 ? 'month' : 'months';
      else if (freq === 'years') unit = v === 1 ? 'year' : 'years';
      else unit = freq;

      validParts.push(`${v} ${unit}`);
    }

    if (validParts.length === 0) return '';
    if (validParts.length === 1) return validParts[0];
    if (validParts.length === 2) return `${validParts[0]} and ${validParts[1]}`;
    const allExceptLast = validParts.slice(0, -1).join(', ');
    const last = validParts[validParts.length - 1];
    return `${allExceptLast} and ${last}`;
  }

  // Fallback to legacy structure
  if (!d.frequency) return '';
  const v = Number(d.value) || 0;
  if (d.frequency === 'years_months') {
    const y = v;
    const m = Number(d.secondary_value) || 0;
    const yStr = y === 1 ? '1 year' : `${y} years`;
    const mStr = m === 1 ? '1 month' : `${m} months`;
    if (y > 0 && m > 0) return `${yStr} and ${mStr}`;
    if (y > 0) return yStr;
    if (m > 0) return mStr;
    return '';
  }
  if (v <= 0) return '';
  switch (d.frequency) {
    case 'hours':
      return v === 1 ? '1 hour' : `${v} hours`;
    case 'days':
      return v === 1 ? '1 day' : `${v} days`;
    case 'weeks':
      return v === 1 ? '1 week' : `${v} weeks`;
    case 'months':
      return v === 1 ? '1 month' : `${v} months`;
    case 'years': {
      const yStr = v === 1 ? '1 year' : `${v} years`;
      if (d.secondary_value && Number(d.secondary_value) > 0) {
        const m = Number(d.secondary_value);
        const mStr = m === 1 ? '1 month' : `${m} months`;
        return `${yStr} and ${mStr}`;
      }
      return yStr;
    }
    default:
      return `${v} ${d.frequency}`;
  }
};
