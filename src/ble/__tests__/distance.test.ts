import type { DeviceRecord } from '@/store/devices';

import {
  BUCKET_HYSTERESIS_DB,
  CALIBRATION_SECONDS,
  calibrationOf,
  distanceBucket,
  distanceRange,
  estimateMetres,
  estimateSignal,
  formatApprox,
  formatRange,
  implausibleAt1m,
  measureAt1m,
  type Calibration,
} from '../distance';

const b64 = (bytes: number[]) => Buffer.from(bytes).toString('base64');

function record(manufacturer: number[] | null, txPowerLevel: number | null): DeviceRecord {
  return {
    txPowerLevel,
    advertisement: {
      manufacturerData: manufacturer ? b64(manufacturer) : null,
    },
  } as unknown as DeviceRecord;
}

// Apple iBeacon: company 0x004c, type 0x02, length 0x15, 16-byte UUID, major,
// minor, then measured power (-65 dBm) as the 25th byte.
const IBEACON = [0x4c, 0x00, 0x02, 0x15, ...Array<number>(20).fill(0), 0xbf];

describe('calibrationOf', () => {
  it("prefers the user's own 1 m measurement", () => {
    expect(calibrationOf(record(IBEACON, 4), -52)).toEqual({
      rssiAt1m: -52,
      source: 'user',
    });
  });

  it("then an iBeacon frame's measured power, offset to the upper quartile", () => {
    expect(calibrationOf(record(IBEACON, 4), null)).toEqual({
      rssiAt1m: -62,
      source: 'ibeacon',
    });
  });

  it('then the advertised Tx power as an offset from the default', () => {
    expect(calibrationOf(record(null, 4), null)).toEqual({
      rssiAt1m: -52,
      source: 'tx-power',
    });
  });

  it('else the uncalibrated default', () => {
    expect(calibrationOf(record([0x4c, 0x00, 0x12], null), null)).toEqual({
      rssiAt1m: -56,
      source: 'default',
    });
  });
});

describe('estimateMetres', () => {
  const calibration: Calibration = { rssiAt1m: -59, source: 'default' };

  it('is 1 m at the calibration point', () => {
    expect(estimateMetres(-59, calibration)).toBeCloseTo(1);
  });

  it('doubles for every 9 dB lost (path-loss exponent 3)', () => {
    expect(estimateMetres(-59 - 30 * Math.log10(2), calibration)).toBeCloseTo(2);
  });
});

describe('distanceBucket', () => {
  const calibration: Calibration = { rssiAt1m: -59, source: 'default' };
  const atMetres = (m: number) => -59 - 30 * Math.log10(m);

  it('maps metres to the doubling buckets', () => {
    expect(distanceBucket(atMetres(0.5), calibration, null)).toBe(0);
    expect(distanceBucket(atMetres(1.5), calibration, null)).toBe(1);
    expect(distanceBucket(atMetres(3), calibration, null)).toBe(2);
    expect(distanceBucket(atMetres(6), calibration, null)).toBe(3);
    expect(distanceBucket(atMetres(20), calibration, null)).toBe(4);
  });

  it('holds the previous bucket until the signal clears the edge by the hysteresis', () => {
    const edge = atMetres(2);
    expect(distanceBucket(edge - 1, calibration, 1)).toBe(1);
    expect(distanceBucket(edge - BUCKET_HYSTERESIS_DB, calibration, 1)).toBe(2);
    expect(distanceBucket(edge + 1, calibration, 2)).toBe(2);
    expect(distanceBucket(edge + BUCKET_HYSTERESIS_DB, calibration, 2)).toBe(1);
  });
});

const NOW = 100_000;
/** One packet every `gapMs`, newest at NOW. */
const packets = (values: number[], gapMs = 50) =>
  values.map((rssi, i) => ({ t: NOW - (values.length - 1 - i) * gapMs, rssi }));

describe('estimateSignal', () => {
  it('ignores fades: a few deep drops do not pull the estimate down', () => {
    const values = Array.from({ length: 40 }, (_, i) => (i % 8 === 0 ? -80 : -60));
    expect(estimateSignal(packets(values), NOW)!.rssi).toBe(-60);
  });

  it('only reads the window, unless the device is too slow to fill it', () => {
    const old = packets([-90, -90, -90, -90, -90, -90], 1000).map((p) => ({
      ...p,
      t: p.t - 10_000,
    }));
    expect(estimateSignal([...old, ...packets(Array(30).fill(-60))], NOW)!.rssi).toBe(-60);
    expect(estimateSignal(packets([-70, -70], 2000), NOW)!.count).toBe(2);
  });

  it('is less certain with fewer, noisier packets', () => {
    const steady = estimateSignal(packets(Array(60).fill(-60)), NOW)!;
    const sparse = estimateSignal(packets([-55, -65, -60], 1000), NOW)!;
    expect(sparse.noiseDb).toBeGreaterThan(steady.noiseDb);
  });
});

describe('distanceRange', () => {
  const estimate = { rssi: -59 - 30 * Math.log10(3), noiseDb: 0.5, count: 60 };

  it('brackets the point estimate', () => {
    const range = distanceRange(estimate, { rssiAt1m: -59, source: 'user' });
    expect(range.metres).toBeCloseTo(3);
    expect(range.low).toBeLessThan(3);
    expect(range.high).toBeGreaterThan(3);
  });

  it('is wider when uncalibrated', () => {
    const user = distanceRange(estimate, { rssiAt1m: -59, source: 'user' });
    const guess = distanceRange(estimate, { rssiAt1m: -59, source: 'default' });
    expect(guess.high / guess.low).toBeGreaterThan(user.high / user.low);
  });
});

describe('formatApprox', () => {
  it('gives one rounded figure, with floors at both ends', () => {
    expect(formatApprox(0.3)).toBe('< 0.5');
    expect(formatApprox(1.24)).toBe('1.2');
    expect(formatApprox(6.3)).toBe('6.5');
    expect(formatApprox(20)).toBe('16+');
  });
});

describe('formatRange', () => {
  it('rounds to what the error supports', () => {
    expect(formatRange({ low: 0.43, high: 0.71 })).toBe('0.4–0.7');
    expect(formatRange({ low: 2.44, high: 4.2 })).toBe('2.4–4');
    expect(formatRange({ low: 12.4, high: 30 })).toBe('12+');
    expect(formatRange({ low: 20, high: 40 })).toBe('16+');
  });
});

describe('measureAt1m', () => {
  it('needs the device heard for the full calibration window', () => {
    const samples = packets(Array(100).fill(-60));
    expect(measureAt1m(samples, NOW - CALIBRATION_SECONDS * 1000 + 1, NOW)).toBeNull();
    expect(measureAt1m(samples, NOW - CALIBRATION_SECONDS * 1000, NOW)).toBe(-60);
  });

  it('takes a robust quantile, so a brief spike cannot set the scale', () => {
    const samples = packets([...Array<number>(39).fill(-60), -30], 100);
    expect(measureAt1m(samples, 0, NOW)).toBe(-60);
  });
});

describe('implausibleAt1m', () => {
  it('flags readings outside the typical 1 m range', () => {
    expect(implausibleAt1m(-40)).toBe('too-strong');
    expect(implausibleAt1m(-80)).toBe('too-weak');
    expect(implausibleAt1m(-58)).toBeNull();
  });
});
