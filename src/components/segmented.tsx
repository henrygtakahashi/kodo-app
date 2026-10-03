import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme/use-theme';
import type { Palette } from '@/theme/themes';

type Option<T> = { value: T; label: string };

type Props<T> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
};

const SLIDE_MS = 150;
const PAD = 3;

/**
 * A segmented control whose thumb slides between options. Tens of uses a day,
 * so the slide is under 150 ms with an ease-out; reduced motion snaps.
 */
export function Segmented<T>({ options, value, onChange, accessibilityLabel }: Props<T>) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value)
  );
  const segment = width > 0 ? (width - PAD * 2) / options.length : 0;

  // Shared values are never written during render.
  const position = useSharedValue(index);
  useEffect(() => {
    position.set(
      withTiming(index, {
        duration: reduceMotion ? 0 : SLIDE_MS,
        easing: Easing.out(Easing.cubic),
      })
    );
  }, [index, position, reduceMotion]);

  const thumb = useAnimatedStyle(() => ({
    transform: [{ translateX: position.get() * segment }],
  }));

  return (
    <View
      style={styles.track}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}>
      {segment > 0 && <Animated.View style={[styles.thumb, { width: segment }, thumb]} />}
      {options.map((option, i) => {
        const active = i === index;
        return (
          <Pressable
            key={String(option.value)}
            style={styles.segment}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (active) return;
              void Haptics.selectionAsync();
              onChange(option.value);
            }}>
            <Text style={[styles.label, active && styles.labelActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (t: Palette) =>
  StyleSheet.create({
    track: {
      flexDirection: 'row',
      padding: PAD,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.surface,
    },
    thumb: {
      position: 'absolute',
      top: PAD,
      bottom: PAD,
      left: PAD,
      borderRadius: 7,
      backgroundColor: t.surfaceRaised,
      borderWidth: 1,
      borderColor: t.signal,
    },
    segment: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
    label: { color: t.textSecondary, fontSize: 13, fontFamily: 'monospace' },
    labelActive: { color: t.signal, fontWeight: '700' },
  });
