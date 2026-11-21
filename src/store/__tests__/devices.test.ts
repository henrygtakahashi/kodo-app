import type { Device } from 'react-native-ble-plx';

import { EXPIRE_AFTER_MS, STALE_AFTER_MS, useDeviceStore, type PendingDevice } from '../devices';

function device(id: string, rssi: number, name: string | null = null): Device {
  return {
    id,
    rssi,
    name,
    localName: null,
    manufacturerData: null,
    serviceUUIDs: null,
    serviceData: null,
    solicitedServiceUUIDs: null,
    overflowServiceUUIDs: null,
    rawScanRecord: '',
    txPowerLevel: null,
    isConnectable: false,
  } as unknown as Device;
}

function packets(...devices: Device[]): Map<string, PendingDevice> {
  const now = Date.now();
  return new Map(devices.map((d) => [d.id, { device: d, times: [now], samples: [{ t: now, rssi: d.rssi ?? -127 }] }]));
}

const store = () => useDeviceStore.getState();

beforeEach(() => {
  jest.useFakeTimers({ now: 1_000_000 });
  store().reset();
  store().setFilters({ query: '', minRssi: null, namedOnly: false, favoritesOnly: false });
  store().setFrozen(false);
});

afterEach(() => jest.useRealTimers());

describe('merge', () => {
  it('lists a new device at once, without waiting for the sweep', () => {
    store().merge(packets(device('AA', -60)));
    expect(store().order).toEqual(['AA']);
  });

  it('smooths RSSI instead of jumping to each raw reading', () => {
    store().merge(packets(device('AA', -80)));
    store().merge(packets(device('AA', -40)));
    const { rssi, smoothed } = store().devices.AA;
    expect(rssi).toBe(-40);
    expect(smoothed).toBeGreaterThan(-80);
    expect(smoothed).toBeLessThan(-40);
  });

  it('does not reorder under a finger on the list', () => {
    store().setFrozen(true);
    store().merge(packets(device('AA', -60)));
    expect(store().order).toEqual([]);
  });
});

describe('sweepStale', () => {
  it('marks a quiet device stale, then expires it', () => {
    store().merge(packets(device('AA', -60)));

    jest.setSystemTime(Date.now() + STALE_AFTER_MS + 1);
    store().sweepStale();
    expect(store().devices.AA.staleness).toBe('stale');

    jest.setSystemTime(Date.now() + EXPIRE_AFTER_MS);
    store().sweepStale();
    expect(store().devices.AA).toBeUndefined();
  });

  it('keeps a device that is still advertising live', () => {
    store().merge(packets(device('AA', -60)));
    jest.setSystemTime(Date.now() + STALE_AFTER_MS + 1);
    store().merge(packets(device('AA', -60)));
    store().sweepStale();
    expect(store().devices.AA.staleness).toBe('live');
  });
});

describe('recomputeOrder', () => {
  it('sorts strongest first', () => {
    store().merge(packets(device('WEAK', -90), device('STRONG', -45), device('MID', -70)));
    store().recomputeOrder(true);
    expect(store().order).toEqual(['STRONG', 'MID', 'WEAK']);
  });

  it('applies filters immediately', () => {
    store().merge(packets(device('AA', -60, 'Watch'), device('BB', -50)));
    store().setFilters({ namedOnly: true });
    expect(store().order).toEqual(['AA']);
    store().setFilters({ namedOnly: false, minRssi: -55 });
    expect(store().order).toEqual(['BB']);
  });
});
