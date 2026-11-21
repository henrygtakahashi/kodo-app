import { parseRecord } from '@/ble/ad-structures';
import { en } from '../en';
import { ptBR } from '../pt-BR';

// The type checks every key; these cover the tables typed as plain records,
// where a missing entry would silently fall back.
describe('pt-BR strings', () => {
  it('names every AD type that English names', () => {
    expect(Object.keys(ptBR.ble.adTypes).sort()).toEqual(Object.keys(en.ble.adTypes).sort());
  });

  it('decodes a broadcast in Portuguese', () => {
    const record = Buffer.from([0x02, 0x01, 0x06]).toString('base64');
    expect(parseRecord(record, ptBR).structures[0]).toMatchObject({
      name: 'Flags',
      summary: 'detectável, apenas BLE',
    });
  });

  it('uses a decimal comma in rates', () => {
    expect(ptBR.detail.rate(1600)).toBe('1 a cada 1,6 s');
  });
});
