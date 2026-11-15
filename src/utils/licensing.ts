import { DeviceLicenseState } from '../types';

export const LICENSE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // 32 unambiguous chars
const LICENSE_SECRET = 'BQ_UG_TRADE_QUOTE_2026_KAMPALA_9X7M';

export const FREE_PLAN_QUOTE_LIMIT = 5;
export const MONTHLY_PRICE_UGX = 10000;
export const DAYS_PER_MONTH = 31;

const STORAGE_KEY_LICENSE = 'bq_device_license_v1';
const COOKIE_KEY_LICENSE = 'bq_dl_v1';
const IDB_NAME = 'bq_device_license_db';
const IDB_STORE = 'license_state';
const IDB_RECORD_KEY = 'current';

function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return hash >>> 0;
}

export function normalizeCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
}

export function isMixedAlphanumeric(code: string): boolean {
  return /[2-9]/.test(code) && /[A-HJ-NP-Z]/.test(code);
}

export function isValidDeviceCodeFormat(code: string): boolean {
  const norm = normalizeCode(code);
  if (norm.length !== 4) return false;
  for (let i = 0; i < norm.length; i++) {
    if (!LICENSE_ALPHABET.includes(norm[i])) return false;
  }
  return isMixedAlphanumeric(norm);
}

export function generateDeviceCode(): string {
  const digits = '23456789';
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  for (let attempt = 0; attempt < 50; attempt++) {
    const chars: string[] = [];
    for (let i = 0; i < 4; i++) {
      const rnd =
        typeof crypto !== 'undefined' && crypto.getRandomValues
          ? crypto.getRandomValues(new Uint32Array(1))[0]
          : Math.floor(Math.random() * 0xffffffff);
      chars.push(LICENSE_ALPHABET[rnd % LICENSE_ALPHABET.length]);
    }
    const candidate = chars.join('');
    if (isMixedAlphanumeric(candidate)) {
      return candidate;
    }
  }
  const d1 = digits[Math.floor(Math.random() * digits.length)];
  const l1 = letters[Math.floor(Math.random() * letters.length)];
  const l2 = letters[Math.floor(Math.random() * letters.length)];
  const d2 = digits[Math.floor(Math.random() * digits.length)];
  return `${l1}${d1}${l2}${d2}`;
}

function permute30(raw30: number): number {
  let out = 0;
  for (let i = 0; i < 30; i++) {
    if ((raw30 >>> i) & 1) {
      const target = (i * 7 + 5) % 30;
      out |= 1 << target;
    }
  }
  return out >>> 0;
}

function unpermute30(shuffled30: number): number {
  let raw = 0;
  for (let i = 0; i < 30; i++) {
    const target = (i * 7 + 5) % 30;
    if ((shuffled30 >>> target) & 1) {
      raw |= 1 << i;
    }
  }
  return raw >>> 0;
}

function encode6Chars(shuffled30: number): string {
  let code = '';
  for (let k = 0; k < 6; k++) {
    const idx = (shuffled30 >>> (k * 5)) & 0x1f;
    code += LICENSE_ALPHABET[idx];
  }
  return code;
}

function decode6Chars(code: string): number | null {
  if (code.length !== 6) return null;
  let val = 0;
  for (let k = 0; k < 6; k++) {
    const idx = LICENSE_ALPHABET.indexOf(code[k]);
    if (idx === -1) return null;
    val |= idx << (k * 5);
  }
  return val >>> 0;
}

export function generateActivationCode(
  deviceCode: string,
  months: number,
  forcedNonce?: number
): { code: string; months: number; days: number } {
  const normalizedDevice = normalizeCode(deviceCode);
  if (!isValidDeviceCodeFormat(normalizedDevice)) {
    throw new Error('Device code must be 4 valid characters (letters & numbers).');
  }
  const cleanMonths = Math.floor(Number(months));
  if (!Number.isFinite(cleanMonths) || cleanMonths < 1 || cleanMonths > 63) {
    throw new Error('Duration must be between 1 and 63 months.');
  }

  const startNonce =
    forcedNonce !== undefined
      ? forcedNonce & 0x3f
      : Math.floor(Math.random() * 64);

  for (let offset = 0; offset < 64; offset++) {
    const nonce = (startNonce + offset) & 0x3f;
    const payload12 = ((nonce & 0x3f) << 6) | (cleanMonths & 0x3f);
    const mac18 = fnv1a32(`${LICENSE_SECRET}:MAC:${normalizedDevice}:${payload12}`) & 0x3ffff;
    const mask12 = fnv1a32(`${LICENSE_SECRET}:MASK:${normalizedDevice}:${mac18}`) & 0xfff;
    const encPayload12 = payload12 ^ mask12;
    const raw30 = ((mac18 & 0x3ffff) << 12) | (encPayload12 & 0xfff);
    const shuffled30 = permute30(raw30);
    const candidate = encode6Chars(shuffled30);
    if (isMixedAlphanumeric(candidate)) {
      return {
        code: candidate,
        months: cleanMonths,
        days: cleanMonths * DAYS_PER_MONTH,
      };
    }
  }

  throw new Error('Unable to generate activation code.');
}

export function verifyActivationCode(
  deviceCode: string,
  activationCode: string,
  redeemedCodes: string[] = []
): { valid: boolean; months?: number; days?: number; normalizedCode?: string; error?: string } {
  const normalizedDevice = normalizeCode(deviceCode);
  const normalizedActivation = normalizeCode(activationCode);

  if (normalizedActivation.length !== 6) {
    return { valid: false, error: 'Activation code must be 6 characters.' };
  }
  if (!isMixedAlphanumeric(normalizedActivation)) {
    return { valid: false, error: 'Invalid activation code format.' };
  }

  const shuffled30 = decode6Chars(normalizedActivation);
  if (shuffled30 === null) {
    return { valid: false, error: 'Activation code contains invalid characters.' };
  }

  const raw30 = unpermute30(shuffled30);
  const mac18 = (raw30 >>> 12) & 0x3ffff;
  const encPayload12 = raw30 & 0xfff;
  const mask12 = fnv1a32(`${LICENSE_SECRET}:MASK:${normalizedDevice}:${mac18}`) & 0xfff;
  const payload12 = encPayload12 ^ mask12;
  const months = payload12 & 0x3f;

  if (months < 1 || months > 63) {
    return { valid: false, error: 'Invalid activation code for this device.' };
  }

  const expectedMac18 = fnv1a32(`${LICENSE_SECRET}:MAC:${normalizedDevice}:${payload12}`) & 0x3ffff;
  if (mac18 !== expectedMac18) {
    return { valid: false, error: 'Activation code does not match this device code.' };
  }

  if (redeemedCodes.includes(normalizedActivation)) {
    return { valid: false, error: 'This activation code has already been used on this device.' };
  }

  return {
    valid: true,
    months,
    days: months * DAYS_PER_MONTH,
    normalizedCode: normalizedActivation,
  };
}

export function isPaidPlanActive(license: DeviceLicenseState, nowMs: number = Date.now()): boolean {
  if (license.plan !== 'paid' || !license.plan_expires_at) return false;
  const exp = new Date(license.plan_expires_at).getTime();
  return Number.isFinite(exp) && nowMs < exp;
}

export function isPaidPlanExpired(license: DeviceLicenseState, nowMs: number = Date.now()): boolean {
  if (license.plan !== 'paid') return false;
  if (!license.plan_expires_at) return true;
  const exp = new Date(license.plan_expires_at).getTime();
  return !Number.isFinite(exp) || nowMs >= exp;
}

export function getRemainingDays(expiresAt?: string, nowMs: number = Date.now()): number {
  if (!expiresAt) return 0;
  const exp = new Date(expiresAt).getTime();
  if (!Number.isFinite(exp) || nowMs >= exp) return 0;
  return Math.ceil((exp - nowMs) / (1000 * 60 * 60 * 24));
}

export function applyActivationToLicense(
  license: DeviceLicenseState,
  months: number,
  normalizedCode: string,
  nowMs: number = Date.now()
): DeviceLicenseState {
  const days = months * DAYS_PER_MONTH;
  const durationMs = days * 24 * 60 * 60 * 1000;
  const currentExp = license.plan_expires_at ? new Date(license.plan_expires_at).getTime() : 0;
  const baseStart = isPaidPlanActive(license, nowMs) && currentExp > nowMs ? currentExp : nowMs;
  const nextExpiry = new Date(baseStart + durationMs).toISOString();

  return {
    ...license,
    device_registered: true,
    plan: 'paid',
    plan_expires_at: nextExpiry,
    last_activated_months: months,
    last_activated_at: new Date(nowMs).toISOString(),
    redeemed_codes: Array.from(new Set([...(license.redeemed_codes || []), normalizedCode])),
    updated_at: new Date(nowMs).toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Multi-Layer Persistence (localStorage + Cookie + IndexedDB)
// ---------------------------------------------------------------------------

function readLicenseCookie(): DeviceLicenseState | null {
  try {
    const parts = document.cookie.split('; ');
    const found = parts.find((p) => p.startsWith(`${COOKIE_KEY_LICENSE}=`));
    if (!found) return null;
    const raw = decodeURIComponent(found.slice(COOKIE_KEY_LICENSE.length + 1));
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.device_code === 'string') return parsed;
  } catch {
    // ignore cookie errors
  }
  return null;
}

function writeLicenseCookie(license: DeviceLicenseState): void {
  try {
    const encoded = encodeURIComponent(JSON.stringify(license));
    // 10-year max-age cookie so clearing localStorage alone doesn't reset free-plan usage
    document.cookie = `${COOKIE_KEY_LICENSE}=${encoded}; max-age=315360000; path=/; SameSite=Lax`;
  } catch {
    // ignore cookie errors
  }
}

function openLicenseDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function readLicenseIDB(): Promise<DeviceLicenseState | null> {
  const db = await openLicenseDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const getReq = store.get(IDB_RECORD_KEY);
      getReq.onsuccess = () => {
        db.close();
        const res = getReq.result;
        if (res && typeof res.device_code === 'string') {
          resolve(res as DeviceLicenseState);
        } else {
          resolve(null);
        }
      };
      getReq.onerror = () => {
        db.close();
        resolve(null);
      };
    } catch {
      db.close();
      resolve(null);
    }
  });
}

async function writeLicenseIDB(license: DeviceLicenseState): Promise<void> {
  const db = await openLicenseDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put(license, IDB_RECORD_KEY);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      resolve();
    }
  });
}

function mergeMostRestrictiveLicense(
  a: DeviceLicenseState | null,
  b: DeviceLicenseState | null
): DeviceLicenseState | null {
  if (!a) return b;
  if (!b) return a;
  const aUpdated = new Date(a.updated_at || 0).getTime();
  const bUpdated = new Date(b.updated_at || 0).getTime();
  const newer = bUpdated > aUpdated ? b : a;
  const older = bUpdated > aUpdated ? a : b;

  return {
    ...newer,
    device_code: older.device_code || newer.device_code,
    device_registered: Boolean(a.device_registered || b.device_registered),
    free_quotes_used: Math.max(a.free_quotes_used || 0, b.free_quotes_used || 0),
    redeemed_codes: Array.from(new Set([...(a.redeemed_codes || []), ...(b.redeemed_codes || [])])),
  };
}

export function getStoredDeviceLicense(existingQuotesCount: number = 0): DeviceLicenseState {
  let lsState: DeviceLicenseState | null = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LICENSE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.device_code === 'string') {
        lsState = parsed;
      }
    }
  } catch {
    lsState = null;
  }

  const cookieState = readLicenseCookie();
  const merged = mergeMostRestrictiveLicense(lsState, cookieState);

  if (merged && isValidDeviceCodeFormat(merged.device_code)) {
    const normalized: DeviceLicenseState = {
      ...merged,
      device_code: normalizeCode(merged.device_code),
      free_quotes_used: Math.max(merged.free_quotes_used || 0, existingQuotesCount),
      redeemed_codes: Array.isArray(merged.redeemed_codes) ? merged.redeemed_codes : [],
    };
    saveStoredDeviceLicense(normalized);
    return normalized;
  }

  const now = new Date().toISOString();
  const fresh: DeviceLicenseState = {
    device_code: generateDeviceCode(),
    device_registered: false,
    free_quotes_used: existingQuotesCount,
    plan: 'free',
    redeemed_codes: [],
    created_at: now,
    updated_at: now,
  };
  saveStoredDeviceLicense(fresh);
  return fresh;
}

export function saveStoredDeviceLicense(license: DeviceLicenseState): void {
  try {
    localStorage.setItem(STORAGE_KEY_LICENSE, JSON.stringify(license));
  } catch {
    // ignore
  }
  writeLicenseCookie(license);
  void writeLicenseIDB(license);
}

export async function hydrateDeviceLicenseFromIDB(
  current: DeviceLicenseState
): Promise<DeviceLicenseState> {
  const idbState = await readLicenseIDB();
  if (!idbState || !isValidDeviceCodeFormat(idbState.device_code)) {
    void writeLicenseIDB(current);
    return current;
  }
  const merged = mergeMostRestrictiveLicense(current, idbState);
  if (!merged) return current;
  saveStoredDeviceLicense(merged);
  return merged;
}
