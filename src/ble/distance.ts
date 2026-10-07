import { decodeBase64 } from './base64';
import type { DeviceRecord } from '@/store/devices';

/**
 * Distance from RSSI, as a range and never a single figure.
 *
 * Log-distance path loss: rssi = rssiAt1m - 10 * n * log10(d). The range is
 * sized from the actual error: the packets' spread, how good the 1 m reference
 * is, and what the room adds. A calibrated, chatty device gets a tight range;
 * an uncalibrated one a wide one. A body between phone and target costs
 * another 5-10 dB on its own.
 */

/**
 * Indoor path-loss exponent. Free space is 2; rooms with people run 2-4, and a
 * body-worn device (a watch on a wrist) sits at the high end. 3 makes each
 * doubling of distance 9 dB, wider than the swing from turning a wrist.
 */
export const PATH_LOSS_EXPONENT = 3;

/** Typical phone-measured RSSI at 1 m for a 0 dBm BLE advertiser. */
const DEFAULT_RSSI_AT_1M = -59;

/**
 * Published 1 m figures (the default above, an iBeacon's measured power) are
 * averages, but the estimate reads the upper quartile of the packets, which
 * sits above the average. Without this offset every uncalibrated distance
 * reads too close.
 *
 * Measured 2026-10-06, Galaxy Watch8 flat on a table, phone flat beside it,
 * 25 s per point (median / upper quartile, dBm):
 *   0.25 m  -42 / -41      2 m  -63 / -56
 *   0.5 m   -53 / -48      3 m  -77 / -76
 *   1 m     -60 / -54
 * Least squares: median -60 dBm at 1 m, exponent 2.8; upper quartile -56 dBm
 * at 1 m, exponent 2.7. So PATH_LOSS_EXPONENT holds, and the upper quartile
 * runs 3-4 dB above the median. A user calibration needs no offset: it is
 * measured with the same quantile.
 */
const QUANTILE_OFFSET_DB = 3;

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
      return { rssiAt1m: ((bytes[24] << 24) >> 24) + QUANTILE_OFFSET_DB, source: 'ibeacon' };
    }
  }
  if (record.txPowerLevel !== null) {
    // An offset from the 0 dBm default, not txPower minus free-space loss: the
    // free-space figure ignores the phone's antenna and hand losses, and read
    // -70 dBm from a 7 dBm advertiser across a room as 27 m on device.
    return {
      rssiAt1m: DEFAULT_RSSI_AT_1M + QUANTILE_OFFSET_DB + record.txPowerLevel,
      source: 'tx-power',
    };
  }
  return { rssiAt1m: DEFAULT_RSSI_AT_1M + QUANTILE_OFFSET_DB, source: 'default' };
}

/** One advertisement's RSSI and when it arrived. */
export type RssiSample = { t: number; rssi: number };

function quantile(sorted: number[], q: number): number {
  const position = (sorted.length - 1) * q;
  const low = Math.floor(position);
  const high = Math.ceil(position);
  return sorted[low] + (sorted[high] - sorted[low]) * (position - low);
}

/**
 * How much time the distance reads, in raw advertisements rather than the
 * smoothed 4 Hz history. A 20 Hz advertiser gives about 60 packets here, which
 * is enough for a quantile to settle; reading packets instead of the EMA also
 * removes the EMA's lag from the estimate.
 */
export const ESTIMATE_MS = 3_000;
/** A slow advertiser has few packets in the window, so it reaches further back for this many. */
export const MIN_ESTIMATE_SAMPLES = 6;

/**
 * Fading and bodies only ever subtract: a null between reflections, a turned
 * wrist or a hand over the device drops packets 10-20 dB, while nothing adds
 * that much. On device a Galaxy Watch8 worn beside the phone read anywhere
 * from -56 to -76 dBm within a minute. The upper quartile leans on the packets
 * that came through clean. Calibration uses the same quantile, so the two stay
 * comparable.
 */
const ESTIMATE_QUANTILE = 0.75;

export type SignalEstimate = {
  /** The RSSI the distance is computed from. */
  rssi: number;
  /** Uncertainty of `rssi` itself, from the packets' spread and count, in dB. */
  noiseDb: number;
  count: number;
};

/** Spread below this is luck with a handful of packets, not a steady signal. */
const MIN_SPREAD_DB = 1.5;

function windowOf(samples: RssiSample[], since: number, minimum: number): number[] {
  let start = samples.length;
  while (start > 0 && samples[start - 1].t >= since) start -= 1;
  start = Math.min(start, Math.max(0, samples.length - minimum));
  const values: number[] = [];
  for (let i = start; i < samples.length; i += 1) values.push(samples[i].rssi);
  return values;
}

/** The steady signal of the last few seconds, or null with no packets. */
export function estimateSignal(
  samples: RssiSample[],
  now: number,
  windowMs: number = ESTIMATE_MS
): SignalEstimate | null {
  const values = windowOf(samples, now - windowMs, MIN_ESTIMATE_SAMPLES);
  if (values.length === 0) return null;
  values.sort((a, b) => a - b);
  // Interquartile range over 1.35 is a standard deviation that ignores outliers.
  const spread = Math.max(MIN_SPREAD_DB, (quantile(values, 0.75) - quantile(values, 0.25)) / 1.35);
  return {
    rssi: quantile(values, ESTIMATE_QUANTILE),
    // A quantile's standard error is about 1.25 sigma / sqrt(n).
    noiseDb: (1.25 * spread) / Math.sqrt(values.length),
    count: values.length,
  };
}

/** How long the phone must be held still at 1 m. */
export const CALIBRATION_SECONDS = 5;
/** Fewer packets than this in the calibration window is not a measurement. */
const MIN_CALIBRATION_SAMPLES = 3;

/**
 * RSSI at 1 m, from the same estimator the distance uses, over the calibration
 * window. Null until the device has been heard for the whole window, since a
 * single moment carries the full noise.
 */
export function measureAt1m(samples: RssiSample[], firstSeen: number, now: number): number | null {
  const windowMs = CALIBRATION_SECONDS * 1000;
  if (now - firstSeen < windowMs) return null;
  const inWindow = samples.filter((sample) => sample.t >= now - windowMs);
  if (inWindow.length < MIN_CALIBRATION_SAMPLES) return null;
  return Math.round(estimateSignal(inWindow, now, windowMs)!.rssi);
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

/**
 * Bucket edges in metres. Each bucket doubles, matching how the error grows.
 * Buckets no longer label the reading; they drive the colour and the haptics,
 * which need hysteresis that a continuous range cannot give.
 */
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

/**
 * How far the 1 m reference itself is likely off, in dB, per source. A user
 * measurement covers this phone, case and room; a default covers none of them.
 */
const CALIBRATION_ERROR_DB: Record<CalibrationSource, number> = {
  user: 1.5,
  ibeacon: 3.5,
  'tx-power': 4.5,
  default: 6,
};

/** What the room adds whatever the calibration: bodies, walls, antenna angle. */
const ENVIRONMENT_ERROR_DB = 2.5;

export type DistanceRange = {
  /** The point estimate, used for the colour and the ring, never shown alone. */
  metres: number;
  low: number;
  high: number;
};

/**
 * The likely range, one standard deviation either side. It is as wide as the
 * error actually is: narrow for a calibrated, chatty device held steady, wide
 * for an uncalibrated one heard twice a second.
 */
export function distanceRange(estimate: SignalEstimate, calibration: Calibration): DistanceRange {
  const sigma = Math.hypot(
    estimate.noiseDb,
    CALIBRATION_ERROR_DB[calibration.source],
    ENVIRONMENT_ERROR_DB
  );
  return {
    metres: estimateMetres(estimate.rssi, calibration),
    low: estimateMetres(estimate.rssi + sigma, calibration),
    high: estimateMetres(estimate.rssi - sigma, calibration),
  };
}

/** Past this the path-loss model is guesswork; the range stops at "16+ m". */
export const FAR_LIMIT_METRES = 16;

/**
 * Rounded to what the error supports: 0.1 m under 3 m, 0.5 m to 10 m, then
 * whole metres. Finer steps would only make the digits flicker.
 */
export function roundMetres(metres: number): number {
  if (metres < 3) return Math.max(0.1, Math.round(metres * 10) / 10);
  if (metres < 10) return Math.round(metres * 2) / 2;
  return Math.round(metres);
}

/** Under this the model cannot tell distances apart; the phone is next to it. */
export const NEAR_LIMIT_METRES = 0.5;

/** The single approximate figure, without the unit: "1.2", "< 0.5", "16+". */
export function formatApprox(metres: number): string {
  if (metres < NEAR_LIMIT_METRES) return `< ${NEAR_LIMIT_METRES}`;
  if (metres >= FAR_LIMIT_METRES) return `${FAR_LIMIT_METRES}+`;
  return `${roundMetres(metres)}`;
}

/** "2.4–4", "16+", or a single figure when both ends round together. Unit not included. */
export function formatRange(range: Pick<DistanceRange, 'low' | 'high'>): string {
  if (range.low >= FAR_LIMIT_METRES) return `${FAR_LIMIT_METRES}+`;
  const low = roundMetres(range.low);
  const high = roundMetres(Math.min(range.high, FAR_LIMIT_METRES));
  if (range.high > FAR_LIMIT_METRES) return `${low}+`;
  return low === high ? `~${low}` : `${low}–${high}`;
}
