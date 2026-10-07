import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';

import type { DeviceKind } from '@/ble/kind';

type Glyph = ComponentProps<typeof MaterialCommunityIcons>['name'];

const GLYPHS: Record<DeviceKind, Glyph> = {
  phone: 'cellphone',
  tablet: 'tablet',
  computer: 'laptop',
  tv: 'television',
  watch: 'watch',
  earbuds: 'earbuds',
  speaker: 'speaker',
  console: 'gamepad-variant',
  input: 'keyboard',
  tag: 'tag-outline',
  beacon: 'access-point',
  health: 'heart-pulse',
};

/** Decorative: the kind is spoken in the row's accessibility label instead. */
export function KindIcon({ kind, size, color }: { kind: DeviceKind; size: number; color: string }) {
  return (
    <MaterialCommunityIcons
      name={GLYPHS[kind]}
      size={size}
      color={color}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
