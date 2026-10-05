import { distinctRecords, parseRecord } from '../ad-structures';

const b64 = (bytes: number[]) => Buffer.from(bytes).toString('base64');
const ascii = (text: string) => Array.from(text, (c) => c.charCodeAt(0));

// Flags (LE General Discoverable, BR/EDR not supported), complete name "Blip",
// Tx power -12 dBm, Apple manufacturer data.
const RECORD = [
  0x02, 0x01, 0x06,
  0x05, 0x09, ...ascii('Blip'),
  0x02, 0x0a, 0xf4,
  0x04, 0xff, 0x4c, 0x00, 0x12,
];

describe('parseRecord', () => {
  it('splits a record into AD structures with plain summaries', () => {
    const { structures, padding, leftover } = parseRecord(b64(RECORD));
    expect(structures.map((s) => [s.type, s.name, s.summary])).toEqual([
      [0x01, 'Flags', 'discoverable, BLE only'],
      [0x09, 'Complete name', 'Blip'],
      [0x0a, 'Tx power level', '-12 dBm'],
      [0xff, 'Manufacturer data', expect.stringContaining('(0x004c)')],
    ]);
    expect(padding).toBe(0);
    expect(leftover).toBeNull();
  });

  it('counts the zero padding Android appends', () => {
    const { structures, padding } = parseRecord(b64([...RECORD, 0, 0, 0, 0, 0]));
    expect(structures).toHaveLength(4);
    expect(padding).toBe(5);
  });

  it('keeps a truncated structure as leftover bytes', () => {
    // The name claims 9 bytes but only 4 follow.
    const { structures, leftover } = parseRecord(b64([0x02, 0x01, 0x06, 0x09, 0x09, ...ascii('Ko')]));
    expect(structures).toHaveLength(1);
    expect(Array.from(leftover ?? [])).toEqual([0x09, 0x09, ...ascii('Ko')]);
  });

  it('names unknown AD types by number', () => {
    const { structures } = parseRecord(b64([0x02, 0x99, 0x00]));
    expect(structures[0].name).toBe('Unknown type 0x99');
  });

  it('replaces unprintable name bytes', () => {
    const { structures } = parseRecord(b64([0x03, 0x09, 0x41, 0x07]));
    expect(structures[0].summary).toBe('A·');
  });
});

describe('distinctRecords', () => {
  it('treats padded and unpadded copies of a payload as one record', () => {
    const records = distinctRecords([b64(RECORD), b64([...RECORD, 0, 0, 0]), b64(RECORD.slice(0, 3))]);
    expect(records).toHaveLength(2);
  });
});
