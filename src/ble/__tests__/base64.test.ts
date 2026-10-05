import { base64ToHex, decodeBase64 } from '../base64';

const b64 = (bytes: number[]) => Buffer.from(bytes).toString('base64');

describe('decodeBase64', () => {
  it('matches Node for every padding length', () => {
    for (const bytes of [[], [0x01], [0x01, 0x02], [0x01, 0x02, 0x03], [0xff, 0x00, 0x80, 0x7f]]) {
      expect(Array.from(decodeBase64(b64(bytes)))).toEqual(bytes);
    }
  });

  it('decodes all 256 byte values', () => {
    const all = Array.from({ length: 256 }, (_, i) => i);
    expect(Array.from(decodeBase64(b64(all)))).toEqual(all);
  });
});

describe('base64ToHex', () => {
  it('writes space-separated lowercase pairs', () => {
    expect(base64ToHex(b64([0x4c, 0x00, 0x0a]))).toBe('4c 00 0a');
  });
});
