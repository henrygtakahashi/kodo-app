import { decodeBase64 } from './base64';
import type { DeviceRecord } from '@/store/devices';

/**
 * Distance from RSSI, as a coarse range and never a single figure.
 *
 * Log-distance path loss: rssi = rssiAt1m - 10 * n * log10(d). Both inputs are
 * guesses for most devices, and residual noise after smoothing is still about
 * +/-4 dB, so the honest output is a doubling bucket (1-2 m, 2-4 m...), not
 * "3.2 m". A body between phone and target costs another 5-10 dB on its own.
 */

/**
 * Indoor path-loss exponent. Free space is 2; rooms with people run 2-4, and a
 * body-worn device (a watch on a wrist) sits at the high end. 3 makes each
 * doubling of distance 9 dB, wider than the swing from turning a wrist.
 */
export const PATH_LOSS_EXPONENT = 3;

/** Typical phone-measured RSSI at 1 m for a 0 dBm BLE advertiser. */
const DEFAULT_RSSI_AT_1M = -59;

export type CalibrationSource = 'user' | 'ibeacon' | 'tx-power' | 'default';
export type Calibration = { rssiAt1m: number; source: CalibrationSource };

const APPLE_COMPANY_ID = 0x004c;
const IBEACON_TYPE = 0x02;
const IBEACON_LENGTH = 0x15;

/**
 * The user's own measurement at 1 m wins: it covers this phone, this case and
 * this room. Then an iBeacon frame's measured RSSI at 1 m, then the advertised
 * Tx power (AD type 0x0A), then a generic default, which the screen labels as
 * uncalibrated.
 */
export function calibrationOf(record: DeviceRecord, measuredAt1m: number | null): Calibration {
  if (measuredAt1m !== null) return { rssiAt1m: measuredAt1m, source: 'user' };
  const data = record.advertisement.manufacturerData;
  if (data) {
    const bytes = decodeBase64(data);
    const company = bytes[0] | (bytes[1] << 8);
    if (
      bytes.length >= 25 &&
      company === APPLE_COMPANY_ID &&
      bytes[2] === IBEACON_TYPE &&
      bytes[3] === IBEACON_LENGTH
    ) {
      return { rssiAt1m: (bytes[24] << 24) >> 24, source: 'ibeacon' };
    }
  }
  if (record.txPowerLevel !== null) {
    // An offset from the 0 dBm default, not txPower minus free-space loss: the
    // free-space figure ignores the phone's antenna and hand losses, and read
    // -70 dBm from a 7 dBm advertiser across a room as 27 m on device.
    return { rssiAt1m: DEFAULT_RSSI_AT_1M + record.txPowerLevel, source: 'tx-power' };
  }
  return { rssiAt1m: DEFAULT_RSSI_AT_1M, source: 'default' };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * How much history the distance reads. The store's smoothing settles in about
 * 0.35 s, which is right for the dBm figure but lets a turned wrist or a hand
 * in the way move the distance by a whole bucket. A median ignores those
 * moments instead of averaging them in.
 */
export const DISTANCE_SECONDS = 2;

/** The signal the distance is computed from: the median of the last few seconds. */
export function steadyRssi(history: number[], samplesPerSecond: number, fallback: number): number {
  const recent = history.slice(-DISTANCE_SECONDS * samplesPerSecond);
  return recent.length ? median(recent) : fallback;
}

/** How long the phone must be held still at 1 m. */
export const CALIBRATION_SECONDS = 5;

/**
 * RSSI at 1 m: the median of the last few seconds, so a moment with the
 * antenna facing the phone cannot set the scale. Null until there is enough
 * history, since a single sample carries the full noise.
 */
export function measureAt1m(history: number[], samplesPerSecond: number): number | null {
  const count = CALIBRATION_SECONDS * samplesPerSecond;
  if (history.length < count) return null;
  return Math.round(median(history.slice(-count)));
}

/**
 * Typical devices read about -50 to -65 dBm at 1 m. A calibration far outside
 * that usually means the phone was not at 1 m, and it skews every range after
 * it, so the confirm dialog says so.
 */
export function implausibleAt1m(measured: number): 'too-strong' | 'too-weak' | null {
  if (measured > -48) return 'too-strong';
  if (measured < -75) return 'too-weak';
  return null;
}

export function estimateMetres(rssi: number, calibration: Calibration): number {
  return 10 ** ((calibration.rssiAt1m - rssi) / (10 * PATH_LOSS_EXPONENT));
}

/** Bucket edges in metres. Each bucket doubles, matching how the error grows. */
export const DISTANCE_EDGES = [1, 2, 4, 8] as const;
export const DISTANCE_LABELS = ['< 1 m', '1–2 m', '2–4 m', '4–8 m', '8+ m'] as const;

/** A bucket change must clear its edge by this much, so noise at an edge cannot flap it. */
export const BUCKET_HYSTERESIS_DB = 3;

function rssiAtMetres(metres: number, calibration: Calibration): number {
  return calibration.rssiAt1m - 10 * PATH_LOSS_EXPONENT * Math.log10(metres);
}

function rawBucket(rssi: number, calibration: Calibration): number {
  const metres = estimateMetres(rssi, calibration);
  let index = 0;
  while (index < DISTANCE_EDGES.length && metres >= DISTANCE_EDGES[index]) index += 1;
  return index;
}

/**
 * Index into DISTANCE_LABELS, 0 nearest. Hysteresis works in dB, the unit the
 * noise is in: moving off `previous` needs the signal to pass the shared edge
 * by BUCKET_HYSTERESIS_DB.
 */
export function distanceBucket(
  rssi: number,
  calibration: Calibration,
  previous: number | null
): number {
  const next = rawBucket(rssi, calibration);
  if (previous === null || next === previous) return next;

  // The edge between `previous` and its neighbour in the direction of travel.
  const edge = DISTANCE_EDGES[next > previous ? previous : previous - 1];
  const margin = Math.abs(rssi - rssiAtMetres(edge, calibration));
  return margin >= BUCKET_HYSTERESIS_DB ? next : previous;
}
