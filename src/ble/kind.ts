import { decodeBase64 } from './base64';

/**
 * What kind of thing a transmitter is, when the advertisement actually says.
 *
 * No signal means no kind — the row shows no icon rather than a guess. Every
 * kind carries the source it came from, so the detail screen can show what the
 * icon is based on.
 */
export type DeviceKind =
  | 'phone'
  | 'tablet'
  | 'computer'
  | 'tv'
  | 'watch'
  | 'earbuds'
  | 'speaker'
  | 'console'
  | 'input'
  | 'tag'
  | 'beacon'
  | 'health';

/** Most reliable first; `deriveKind` tries them in this order. */
export type KindSource = 'appearance' | 'microsoft' | 'apple' | 'service' | 'name';

export type Kind = { kind: DeviceKind; source: KindSource };

export type KindInput = {
  name: string | null;
  localName: string | null;
  manufacturerData: string | null;
  serviceUUIDs: string[] | null;
  /** Raw scan records (base64), Android only. Carries AD types ble-plx drops. */
  rawRecords: string[];
};

export const KIND_LABELS: Record<DeviceKind, string> = {
  phone: 'Phone',
  tablet: 'Tablet',
  computer: 'Computer',
  tv: 'TV / display',
  watch: 'Watch',
  earbuds: 'Earbuds / headphones',
  speaker: 'Speaker',
  console: 'Game console',
  input: 'Input device',
  tag: 'Tracker tag',
  beacon: 'Beacon',
  health: 'Health / fitness sensor',
};

export const SOURCE_LABELS: Record<KindSource, string> = {
  appearance: 'Appearance',
  microsoft: 'Microsoft beacon',
  apple: 'Apple message type',
  service: 'service UUID',
  name: 'name',
};

// --- 1. GAP Appearance -------------------------------------------------------

const AD_TYPE_APPEARANCE = 0x19;

/**
 * Bluetooth SIG Assigned Numbers, Appearance categories (value >> 6). Only the
 * categories that map cleanly onto a kind; the rest stay unknown.
 */
const APPEARANCE_CATEGORIES: Record<number, DeviceKind> = {
  0x001: 'phone',
  0x002: 'computer',
  0x003: 'watch',
  0x005: 'tv', // Display
  0x006: 'input', // Remote control
  0x008: 'tag',
  0x009: 'tag', // Keyring
  0x00c: 'health', // Thermometer
  0x00d: 'health', // Heart rate sensor
  0x00e: 'health', // Blood pressure
  0x00f: 'input', // Human interface device
  0x010: 'health', // Glucose meter
  0x011: 'health', // Running/walking sensor
  0x012: 'health', // Cycling
  0x021: 'speaker', // Audio sink
  0x025: 'earbuds', // Wearable audio device
  0x031: 'health', // Pulse oximeter
  0x032: 'health', // Weight scale
};

/** The raw record is a run of [length][AD type][data] structures. */
function appearanceOf(rawRecords: string[]): number | null {
  for (const record of rawRecords) {
    const bytes = decodeBase64(record);
    let offset = 0;
    while (offset < bytes.length) {
      const length = bytes[offset];
      // Zero length marks the end of the significant part; the rest is padding.
      if (length === 0 || offset + length >= bytes.length) break;
      if (bytes[offset + 1] === AD_TYPE_APPEARANCE && length >= 3) {
        return bytes[offset + 2] | (bytes[offset + 3] << 8);
      }
      offset += 1 + length;
    }
  }
  return null;
}

// --- 2. Microsoft CDP beacon ---------------------------------------------------

const MICROSOFT_COMPANY_ID = 0x0006;
const CDP_SCENARIO_BLUETOOTH = 0x01;

/**
 * [MS-CDP] 2.2.2.2.2: the low 5 bits of the byte after the scenario type.
 * Only the Connected Devices Platform scenario carries it — Swift Pair uses the
 * same company ID for a different payload.
 */
const CDP_DEVICE_TYPES: Record<number, DeviceKind> = {
  1: 'console', // Xbox One
  6: 'phone', // Apple iPhone
  7: 'tablet', // Apple iPad
  8: 'phone', // Android device
  9: 'computer', // Windows 10 desktop
  11: 'phone', // Windows 10 phone
  12: 'computer', // Linux device
  14: 'tv', // Surface Hub
  15: 'computer', // Windows laptop
  16: 'tablet', // Windows tablet
};

function microsoftKind(bytes: Uint8Array): DeviceKind | null {
  if (bytes.length < 4 || bytes[2] !== CDP_SCENARIO_BLUETOOTH) return null;
  return CDP_DEVICE_TYPES[bytes[3] & 0x1f] ?? null;
}

// --- 3. Apple message type -----------------------------------------------------

const APPLE_COMPANY_ID = 0x004c;

/** Only the types that say what the device is; 0x10 and 0x12 do not. */
const APPLE_KINDS: Record<number, DeviceKind> = {
  0x02: 'beacon', // iBeacon
  0x07: 'earbuds', // AirPods / Beats proximity pairing
};

function appleKind(bytes: Uint8Array): DeviceKind | null {
  let offset = 2;
  while (offset + 1 < bytes.length) {
    const kind = APPLE_KINDS[bytes[offset]];
    if (kind) return kind;
    const length = bytes[offset + 1];
    if (length === 0) break;
    offset += 2 + length;
  }
  return null;
}

// --- 4. Service UUIDs -----------------------------------------------------------

const SERVICE_KINDS: Record<string, DeviceKind> = {
  '1802': 'tag', // Immediate alert
  '1803': 'tag', // Link loss
  '180d': 'health', // Heart rate
  '1812': 'input', // HID over GATT
  '1826': 'health', // Fitness machine
  feaa: 'beacon', // Eddystone
  fd6f: 'phone', // Exposure notification — only phones broadcast it
};

function serviceKind(serviceUUIDs: string[] | null): DeviceKind | null {
  if (!serviceUUIDs) return null;
  for (const uuid of serviceUUIDs) {
    const short = uuid.length >= 8 ? uuid.slice(4, 8).toLowerCase() : uuid.toLowerCase();
    if (SERVICE_KINDS[short]) return SERVICE_KINDS[short];
  }
  return null;
}

// --- 5. Name conventions ----------------------------------------------------------

/**
 * Vendor naming conventions that are consistent in practice. Weakest source,
 * so it runs last. Order matters: "Pixel Buds" is earbuds before it is a phone.
 */
const NAME_PATTERNS: [RegExp, DeviceKind][] = [
  [/\b(buds\d*|airpods|earbuds|beats)\b/i, 'earbuds'],
  [/^\[TV\]|\bTV\b|\bbravia\b/i, 'tv'],
  [/\bwatch\d*\b/i, 'watch'],
  [/\b(soundbar|speaker|homepod)\b/i, 'speaker'],
  [/\b(keyboard|mouse|controller|remote)\b/i, 'input'],
  [/\b(ipad|galaxy tab)\b/i, 'tablet'],
  [/\b(iphone|pixel \d+\w*|galaxy (s|a|z|note)\d+\w*)\b/i, 'phone'],
  [/\b(macbook|imac)\b|^(DESKTOP|LAPTOP)-/i, 'computer'],
];

function nameKind(name: string | null): DeviceKind | null {
  if (!name) return null;
  for (const [pattern, kind] of NAME_PATTERNS) {
    if (pattern.test(name)) return kind;
  }
  return null;
}

// ---------------------------------------------------------------------------------

export function deriveKind(input: KindInput): Kind | null {
  const appearance = appearanceOf(input.rawRecords);
  if (appearance !== null) {
    const kind = APPEARANCE_CATEGORIES[appearance >> 6];
    if (kind) return { kind, source: 'appearance' };
  }

  if (input.manufacturerData) {
    const bytes = decodeBase64(input.manufacturerData);
    if (bytes.length >= 2) {
      const company = bytes[0] | (bytes[1] << 8);
      const kind =
        company === MICROSOFT_COMPANY_ID
          ? microsoftKind(bytes)
          : company === APPLE_COMPANY_ID
            ? appleKind(bytes)
            : null;
      if (kind) return { kind, source: company === APPLE_COMPANY_ID ? 'apple' : 'microsoft' };
    }
  }

  const service = serviceKind(input.serviceUUIDs);
  if (service) return { kind: service, source: 'service' };

  const name = nameKind(input.name?.trim() || input.localName?.trim() || null);
  if (name) return { kind: name, source: 'name' };

  return null;
}
