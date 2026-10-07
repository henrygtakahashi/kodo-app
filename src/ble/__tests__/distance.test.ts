import type { DeviceRecord } from '@/store/devices';

import {
  BUCKET_HYSTERESIS_DB,
  CALIBRATION_SECONDS,
  calibrationOf,
  distanceBucket,
  estimateMetres,
  implausibleAt1m,
  measureAt1m,
  type Calibration,
} from '../distance';

const b64 = (bytes: number[]) => Buffer.from(bytes).toString('base64');

function record(manufacturer: number[] | null, txPowerLevel: number | null): DeviceRecord {
  return {
    txPowerLevel,
    advertisement: { manufacturerData: manufacturer ? b64(manufacturer) : null },
  } as unknown as DeviceRecord;
}

// Apple iBeacon: company 0x004c, type 0x02, length 0x15, 16-byte UUID, major,
// minor, then measured power (-65 dBm) as the 25th byte.
const IBEACON = [0x4c, 0x00, 0x02, 0x15, ...Array<number>(20).fill(0), 0xbf];

describe('calibrationOf', () => {
  it("prefers the user's own 1 m measurement", () => {
    expect(calibrationOf(record(IBEACON, 4), -52)).toEqual({ rssiAt1m: -52, source: 'user' });
  });

  it("then an iBeacon frame's measured power", () => {
    expect(calibrationOf(record(IBEACON, 4), null)).toEqual({ rssiAt1m: -65, source: 'ibeacon' });
  });

  it('then the advertised Tx power as an offset from the default', () => {
    expect(calibrationOf(record(null, 4), null)).toEqual({ rssiAt1m: -55, source: 'tx-power' });
  });

  it('else the uncalibrated default', () => {
    expect(calibrationOf(record([0x4c, 0x00, 0x12], null), null)).toEqual({
      rssiAt1m: -59,
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

describe('measureAt1m', () => {
  it('needs the full calibration window', () => {
    expect(measureAt1m(Array<number>(CALIBRATION_SECONDS * 4 - 1).fill(-60), 4)).toBeNull();
  });

  it('takes the median, so a brief spike cannot set the scale', () => {
    const history = [...Array<number>(19).fill(-60), -30];
    expect(measureAt1m(history, 4)).toBe(-60);
  });
});

describe('implausibleAt1m', () => {
  it('flags readings outside the typical 1 m range', () => {
    expect(implausibleAt1m(-40)).toBe('too-strong');
    expect(implausibleAt1m(-80)).toBe('too-weak');
    expect(implausibleAt1m(-58)).toBeNull();
  });
});
