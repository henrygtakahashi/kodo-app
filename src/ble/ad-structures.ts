import { decodeBase64 } from './base64';
import { appleMessage, companyName } from './identity';
import { KIND_LABELS, appearanceKind } from './kind';

/**
 * A raw scan record is a run of AD structures: [length][type][data…], where
 * length counts the type byte and the data. Android hands back the record
 * padded with zeros to its full size; a zero length marks where it ends.
 */
export type AdStructure = {
  type: number;
  /** Bluetooth SIG name for the AD type, e.g. "Complete local name". */
  name: string;
  /** Plain reading of the data, e.g. "Galaxy Watch8 (9SYF)". */
  summary: string;
  /** The whole structure, length and type bytes included. */
  bytes: Uint8Array;
};

export type ParsedRecord = {
  structures: AdStructure[];
  /** Trailing zero bytes after the last structure. */
  padding: number;
  /** Bytes that did not parse as a structure (truncated record). */
  leftover: Uint8Array | null;
};

/** Core Specification Supplement, Part A. The common ones only. */
const AD_TYPES: Record<number, string> = {
  0x01: 'Flags',
  0x02: '16-bit service UUIDs (partial)',
  0x03: '16-bit service UUIDs',
  0x04: '32-bit service UUIDs (partial)',
  0x05: '32-bit service UUIDs',
  0x06: '128-bit service UUIDs (partial)',
  0x07: '128-bit service UUIDs',
  0x08: 'Short name',
  0x09: 'Complete name',
  0x0a: 'Tx power level',
  0x14: '16-bit solicited services',
  0x15: '128-bit solicited services',
  0x16: 'Service data (16-bit UUID)',
  0x19: 'Appearance',
  0x1b: 'LE device address',
  0x20: 'Service data (32-bit UUID)',
  0x21: 'Service data (128-bit UUID)',
  0x24: 'URI',
  0xff: 'Manufacturer data',
};

export function adTypeName(type: number): string {
  return AD_TYPES[type] ?? `Unknown type 0x${hex2(type)}`;
}

export function hex2(n: number): string {
  return n.toString(16).padStart(2, '0');
}

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, hex2).join(' ');
}

function text(data: Uint8Array): string {
  let out = '';
  for (const b of data) out += b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : '·';
  return out;
}

function uuids(data: Uint8Array, size: number): string {
  const out: string[] = [];
  for (let i = 0; i + size <= data.length; i += size) {
    // Little-endian on the wire; written most-significant first.
    out.push(Array.from(data.slice(i, i + size)).reverse().map(hex2).join(''));
  }
  return out.join(', ');
}

function flags(value: number): string {
  const parts: string[] = [];
  if (value & 0x01) parts.push('limited discoverable');
  if (value & 0x02) parts.push('discoverable');
  if (value & 0x04) parts.push('BLE only');
  else parts.push('also Classic Bluetooth');
  return parts.join(', ');
}

function summarise(type: number, data: Uint8Array): string {
  switch (type) {
    case 0x01:
      return data.length ? flags(data[0]) : '';
    case 0x02:
    case 0x03:
    case 0x14:
      return uuids(data, 2);
    case 0x04:
    case 0x05:
      return uuids(data, 4);
    case 0x06:
    case 0x07:
    case 0x15:
      return uuids(data, 16);
    case 0x08:
    case 0x09:
      return text(data);
    case 0x0a:
      return data.length ? `${(data[0] << 24) >> 24} dBm` : '';
    case 0x16:
      return data.length >= 2 ? `UUID ${uuids(data.slice(0, 2), 2)}` : '';
    case 0x19: {
      if (data.length < 2) return '';
      const value = data[0] | (data[1] << 8);
      const kind = appearanceKind(value);
      return `${kind ? KIND_LABELS[kind] : 'Category'} (0x${value.toString(16).padStart(4, '0')})`;
    }
    case 0xff: {
      if (data.length < 2) return '';
      const id = data[0] | (data[1] << 8);
      const company = companyName(id) ?? 'Unlisted company';
      const message = appleMessage(data);
      const code = `0x${id.toString(16).padStart(4, '0')}`;
      return message ? `${company} (${code}) · ${message}` : `${company} (${code})`;
    }
    default:
      return '';
  }
}

export function parseRecord(base64: string): ParsedRecord {
  const bytes = decodeBase64(base64);
  const structures: AdStructure[] = [];
  let offset = 0;

  while (offset < bytes.length) {
    const length = bytes[offset];
    if (length === 0) break;
    if (offset + length >= bytes.length) {
      return { structures, padding: 0, leftover: bytes.slice(offset) };
    }
    const type = bytes[offset + 1];
    const data = bytes.slice(offset + 2, offset + 1 + length);
    structures.push({
      type,
      name: adTypeName(type),
      summary: summarise(type, data),
      bytes: bytes.slice(offset, offset + 1 + length),
    });
    offset += 1 + length;
  }

  return { structures, padding: bytes.length - offset, leftover: null };
}

/**
 * Devices send the same payload padded and unpadded, so records are compared
 * by their structures, not their raw bytes.
 */
export function distinctRecords(rawRecords: string[]): ParsedRecord[] {
  const seen = new Set<string>();
  const out: ParsedRecord[] = [];
  for (const raw of rawRecords) {
    const parsed = parseRecord(raw);
    const key = parsed.structures.map((s) => toHex(s.bytes)).join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(parsed);
  }
  return out;
}
