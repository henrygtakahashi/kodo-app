const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const LOOKUP = new Uint8Array(128);
for (let i = 0; i < CHARS.length; i += 1) LOOKUP[CHARS.charCodeAt(i)] = i;

/**
 * ble-plx hands back manufacturerData and serviceData as base64. `atob` is not
 * a guaranteed global in this runtime, so decode by hand rather than bet on it.
 */
export function decodeBase64(input: string): Uint8Array {
  const clean = input.replace(/=+$/, '');
  const bytes = new Uint8Array((clean.length * 3) >> 2);
  let acc = 0;
  let bits = 0;
  let out = 0;

  for (let i = 0; i < clean.length; i += 1) {
    acc = (acc << 6) | LOOKUP[clean.charCodeAt(i)];
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[out] = (acc >> bits) & 0xff;
      out += 1;
    }
  }
  return bytes;
}
