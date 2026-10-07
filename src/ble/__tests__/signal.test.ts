import { EMA_ALPHA, MIN_RADIUS, bandFor, ema, normalisedRadius, trendOf } from '../signal';

describe('ema', () => {
  it('moves a fraction EMA_ALPHA toward the new value', () => {
    expect(ema(-80, -60)).toBeCloseTo(-80 + EMA_ALPHA * 20);
  });

  it('settles on a constant input', () => {
    let value = -90;
    for (let i = 0; i < 50; i += 1) value = ema(value, -60);
    expect(value).toBeCloseTo(-60, 3);
  });
});

describe('bandFor', () => {
  it.each([
    [-40, 'immediate'],
    [-55, 'near'],
    [-69, 'near'],
    [-70, 'far'],
    [-85, 'distant'],
    [-120, 'distant'],
  ])('%d dBm is %s', (rssi, band) => {
    expect(bandFor(rssi)).toBe(band);
  });
});

describe('normalisedRadius', () => {
  it('clamps to [MIN_RADIUS, 1]', () => {
    expect(normalisedRadius(-20)).toBe(MIN_RADIUS);
    expect(normalisedRadius(-130)).toBe(1);
  });

  it('grows as the signal weakens', () => {
    expect(normalisedRadius(-60)).toBeLessThan(normalisedRadius(-80));
  });
});

describe('trendOf', () => {
  const flat = (value: number, n: number) => Array<number>(n).fill(value);

  it('stays steady with too little history', () => {
    expect(trendOf([-90, -50])).toBe('steady');
  });

  it('reads a rising signal as approaching and a falling one as receding', () => {
    expect(trendOf([...flat(-80, 6), ...flat(-70, 6)])).toBe('approaching');
    expect(trendOf([...flat(-70, 6), ...flat(-80, 6)])).toBe('receding');
  });

  it('ignores changes inside the noise threshold', () => {
    expect(trendOf([...flat(-72, 6), ...flat(-70, 6)])).toBe('steady');
  });
});
