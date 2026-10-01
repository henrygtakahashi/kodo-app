import type { Device } from 'react-native-ble-plx';

import { decodeBase64 } from './base64';

/**
 * Bluetooth SIG company identifiers, little-endian in the first two bytes of
 * manufacturer data. A deliberately short list of what actually turns up in a
 * room — not a full registry.
 */
const COMPANIES: Record<number, string> = {
  0x0006: 'Microsoft',
  0x004c: 'Apple',
  0x0075: 'Samsung',
  0x00e0: 'Google',
  0x0087: 'Garmin',
  0x00d2: 'Dialog',
  0x0171: 'Amazon',
  0x0157: 'Xiaomi',
  0x038f: 'Xiaomi',
  0x05a7: 'Sonos',
  0x0499: 'Ruuvi',
  0x060a: 'Tile',
};

/** 16-bit assigned service UUIDs that imply what a device is. */
const SERVICE_TYPES: Record<string, string> = {
  '1802': 'Proximity tag',
  '1803': 'Proximity tag',
  '180d': 'Heart rate monitor',
  '180f': 'Battery service',
  '1812': 'Input device',
  '1826': 'Fitness machine',
  feaa: 'Eddystone beacon',
  fd6f: 'Exposure notification',
  fe9f: 'Google Fast Pair',
};

export type Identity = {
  label: string;
  /** Null when nothing identified it; the UI shows the id suffix alone. */
  vendor: string | null;
  /** Last two octets of the id — disambiguates a screen of "Unknown device". */
  suffix: string;
};

const APPLE_COMPANY_ID = 0x004c;

/**
 * Apple's manufacturer payload is a run of type-length-value segments after the
 * company ID. Apple never advertises a device name — there is no "John's
 * iPhone" to read, by design — but the type byte does say what the
 * advertisement is for, which beats labelling every nearby Apple product
 * "Apple".
 *
 * Types are stable and well documented from the wire; the payload contents
 * inside each segment are not, so nothing here decodes past the type.
 */
const APPLE_TYPES: Record<number, string> = {
  0x02: 'iBeacon',
  0x05: 'AirDrop',
  0x06: 'HomeKit accessory',
  0x07: 'AirPods / Beats',
  0x08: 'Hey Siri',
  0x09: 'AirPlay target',
  0x0a: 'AirPlay source',
  0x0b: 'Magic Switch',
  0x0c: 'Handoff',
  0x0d: 'Tethering target',
  0x0e: 'Tethering source',
  0x0f: 'Nearby action',
  0x10: 'Apple device nearby',
  0x12: 'Find My',
};

/** 0x10 means only "an Apple device is near"; anything else says more. */
const APPLE_GENERIC = 0x10;

function appleDetail(bytes: Uint8Array): string | null {
  let offset = 2; // skip the company ID
  let generic: string | null = null;

  while (offset + 1 < bytes.length) {
    const type = bytes[offset];
    const length = bytes[offset + 1];

    const name = APPLE_TYPES[type];
    if (name) {
      if (type !== APPLE_GENERIC) return name; // specific wins outright
      generic = name;
    }

    // A zero length cannot be advanced past without looping forever. Seen in
    // the field: 4c 00 01 00 00 ... — an undocumented type 0x01.
    if (length === 0) break;
    offset += 2 + length;
  }

  // An unrecognised type falls through to the vendor name. The raw type stays
  // readable from manufacturerData on the detail screen, where a hex dump
  // belongs; a card title is not the place for it.
  return generic;
}

function parseManufacturer(
  manufacturerData: string | null
): { vendor: string | null; detail: string | null } {
  if (!manufacturerData) return { vendor: null, detail: null };

  const bytes = decodeBase64(manufacturerData);
  if (bytes.length < 2) return { vendor: null, detail: null };

  const company = bytes[0] | (bytes[1] << 8); // little-endian
  const vendor = COMPANIES[company] ?? null;
  const detail = company === APPLE_COMPANY_ID ? appleDetail(bytes) : null;

  return { vendor, detail };
}

function typeFrom(serviceUUIDs: string[] | null): string | null {
  if (!serviceUUIDs) return null;
  for (const uuid of serviceUUIDs) {
    // Full 128-bit form is 0000XXXX-0000-1000-8000-00805f9b34fb.
    const short = uuid.length >= 8 ? uuid.slice(4, 8).toLowerCase() : uuid.toLowerCase();
    if (SERVICE_TYPES[short]) return SERVICE_TYPES[short];
  }
  return null;
}

/**
 * Most devices advertise no name, so identity is constructed (BRIEF.md §1):
 * name -> localName -> inferred type -> vendor -> "Unknown device".
 * Derived once when a device is first seen; none of these change afterwards.
 */
export function deriveIdentity(device: Device): Identity {
  const { vendor, detail } = parseManufacturer(device.manufacturerData);
  const inferred = typeFrom(device.serviceUUIDs);
  const suffix = device.id.replace(/:/g, '').slice(-4).toUpperCase();

  const label =
    device.name?.trim() ||
    device.localName?.trim() ||
    inferred ||
    detail ||
    vendor ||
    'Unknown device';

  return { label, vendor, suffix };
}
