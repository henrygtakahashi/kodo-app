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

function companyFrom(manufacturerData: string | null): string | null {
  if (!manufacturerData) return null;
  const bytes = decodeBase64(manufacturerData);
  if (bytes.length < 2) return null;
  return COMPANIES[bytes[0] | (bytes[1] << 8)] ?? null; // little-endian
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
  const vendor = companyFrom(device.manufacturerData);
  const inferred = typeFrom(device.serviceUUIDs);
  const suffix = device.id.replace(/:/g, '').slice(-4).toUpperCase();

  const label =
    device.name?.trim() ||
    device.localName?.trim() ||
    inferred ||
    vendor ||
    'Unknown device';

  return { label, vendor, suffix };
}
