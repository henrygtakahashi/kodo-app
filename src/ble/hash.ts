/** FNV-1a, 32-bit. Deterministic across sessions — that is the whole point. */
export function hashId(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Identity hue, constrained to 24–58 (ambers through warm yellows).
 *
 * A full 0–360 spread would give every device a random colour and wreck the
 * single-hue palette in DESIGN.md §8. A narrow band still separates devices at
 * a glance while staying inside the instrument's colour family.
 */
export function hueFor(id: string): number {
  return 24 + (hashId(id) % 35);
}

/**
 * Radar blip angle, 0–359.99. Stable per device and carries no spatial meaning
 * (DESIGN.md §4) — the Radar will import this, not re-derive it.
 */
export function angleFor(id: string): number {
  return (hashId(id) % 36000) / 100;
}
