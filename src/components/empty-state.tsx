import { BlurMask, Canvas, Circle, Group, Path, Skia } from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  cancelAnimation,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme/use-theme';
import type { Palette } from '@/theme/themes';

/**
 * Each art is one motif (a dot and two rings broken at the upper right) in a
 * different state, so every empty screen reads as part of the same app.
 *
 * - listening: scanning, nothing heard yet. Ripples leave the dot.
 * - paused: scanning stopped. Everything grey, the dot hollow, no motion.
 * - filtered: devices exist but the filters hide them. Lit dot, grey rings.
 * - searching: Hunt has no target. Hollow dot, breathing.
 * - lost: the Hunt target stopped advertising. Warning dot, breathing.
 */
export type EmptyArt = 'listening' | 'paused' | 'filtered' | 'searching' | 'lost';

const SIZE = 180;
const C = SIZE / 2;
const DOT = 12;
const INNER = 44;
const OUTER = 72;
/** Gap centre in Skia degrees: 0 is 3 o'clock and angles run clockwise. */
const GAP_AT = -45;
const RIPPLE_MS = 2800;
const BREATHE_MS = 1600;

function brokenRing(r: number, gapDegrees: number) {
  const oval = Skia.XYWHRect(C - r, C - r, r * 2, r * 2);
  return Skia.PathBuilder.Make()
    .addArc(oval, GAP_AT + gapDegrees / 2, 360 - gapDegrees)
    .build();
}

const INNER_RING = brokenRing(INNER, 64);
const OUTER_RING = brokenRing(OUTER, 44);

type Colours = { dot: string; inner: string; outer: string; hollow: boolean; ringOpacity: number };

function coloursFor(art: EmptyArt, t: Palette): Colours {
  switch (art) {
    case 'listening':
      return { dot: t.signal, inner: t.bands.near, outer: t.bands.distant, hollow: false, ringOpacity: 1 };
    case 'paused':
      return { dot: t.textTertiary, inner: t.textTertiary, outer: t.textTertiary, hollow: true, ringOpacity: 0.5 };
    case 'filtered':
      return { dot: t.signal, inner: t.textTertiary, outer: t.textTertiary, hollow: false, ringOpacity: 0.5 };
    case 'searching':
      return { dot: t.signal, inner: t.bands.distant, outer: t.border, hollow: true, ringOpacity: 1 };
    case 'lost':
      return { dot: t.warning, inner: t.bands.distant, outer: t.border, hollow: false, ringOpacity: 0.7 };
  }
}

function SignalArt({ art }: { art: EmptyArt }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const colours = coloursFor(art, theme);
  const ripples = art === 'listening' && !reduceMotion;
  // Opacity only, so it survives reduced motion (DESIGN.md §6).
  const breathes = art === 'searching' || art === 'lost';

  const phase = useSharedValue(0);
  const breath = useSharedValue(1);

  useEffect(() => {
    if (!ripples) return;
    phase.set(0);
    phase.set(withRepeat(withTiming(1, { duration: RIPPLE_MS, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(phase);
  }, [ripples, phase]);

  useEffect(() => {
    if (!breathes) {
      breath.set(1);
      return;
    }
    breath.set(1);
    breath.set(
      withRepeat(
        withTiming(0.35, { duration: BREATHE_MS, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      )
    );
    return () => cancelAnimation(breath);
  }, [breathes, breath]);

  // Two ripples half a period apart, so one is always on its way out.
  const ease = (p: number) => {
    'worklet';
    return 1 - (1 - p) * (1 - p);
  };
  const rippleA = useDerivedValue(() => DOT + ease(phase.value) * (C - DOT - 2));
  const rippleB = useDerivedValue(() => DOT + ease((phase.value + 0.5) % 1) * (C - DOT - 2));
  const fadeA = useDerivedValue(() => 0.55 * (1 - phase.value));
  const fadeB = useDerivedValue(() => 0.55 * (1 - ((phase.value + 0.5) % 1)));
  const glow = useDerivedValue(() => 0.45 * breath.value);

  return (
    <Canvas style={styles.art}>
      {ripples ? (
        <Group>
          <Circle cx={C} cy={C} r={rippleA} color={colours.dot} opacity={fadeA} style="stroke" strokeWidth={1.5} />
          <Circle cx={C} cy={C} r={rippleB} color={colours.dot} opacity={fadeB} style="stroke" strokeWidth={1.5} />
        </Group>
      ) : null}

      <Group opacity={colours.ringOpacity}>
        <Path path={OUTER_RING} color={colours.outer} style="stroke" strokeWidth={4} strokeCap="round" />
        <Path path={INNER_RING} color={colours.inner} style="stroke" strokeWidth={6} strokeCap="round" />
      </Group>

      <Group opacity={breathes ? breath : 1}>
        {colours.hollow ? null : (
          <Circle cx={C} cy={C} r={DOT * 1.8} color={colours.dot} opacity={breathes ? glow : 0.35}>
            <BlurMask blur={10} style="normal" />
          </Circle>
        )}
        <Circle
          cx={C}
          cy={C}
          r={colours.hollow ? DOT - 1.5 : DOT}
          color={colours.dot}
          style={colours.hollow ? 'stroke' : 'fill'}
          strokeWidth={3}
        />
      </Group>
    </Canvas>
  );
}

/** Seconds since mount as mm:ss. Re-renders only itself, once a second. */
function Elapsed() {
  const [start] = useState(() => Date.now());
  const [now, setNow] = useState(start);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const seconds = Math.floor((now - start) / 1000);
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return <>{`${mm}:${ss}`}</>;
}

export function EmptyState({
  art,
  eyebrow,
  showElapsed = false,
  title,
  hint,
  action,
}: {
  art: EmptyArt;
  /** Short mono label above the title, e.g. "listening". */
  eyebrow?: string;
  /** Appends a running mm:ss to the eyebrow. */
  showElapsed?: boolean;
  title: string;
  hint: string;
  action?: { label: string; onPress: () => void };
}) {
  const theme = useTheme();
  const themed = useMemo(() => makeStyles(theme), [theme]);
  const eyebrowColour = art === 'lost' ? theme.warning : art === 'paused' ? theme.textTertiary : theme.signal;

  return (
    <Animated.View entering={FadeInDown.duration(360)} style={themed.container}>
      <SignalArt art={art} />
      <View style={themed.copy}>
        {eyebrow ? (
          <Text style={[themed.eyebrow, { color: eyebrowColour }]}>
            {eyebrow.toUpperCase()}
            {showElapsed ? (
              <>
                {'  ·  '}
                <Elapsed />
              </>
            ) : null}
          </Text>
        ) : null}
        <Text style={themed.title} accessibilityRole="header">
          {title}
        </Text>
        <Text style={themed.hint}>{hint}</Text>
      </View>
      {action ? (
        <Pressable
          onPress={action.onPress}
          hitSlop={8}
          accessibilityRole="button"
          style={({ pressed }) => [themed.action, pressed && themed.actionPressed]}>
          <Text style={themed.actionLabel}>{action.label}</Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  art: { width: SIZE, height: SIZE },
});

const makeStyles = (t: Palette) =>
  StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24 },
    copy: { alignItems: 'center', gap: 8, maxWidth: 300 },
    eyebrow: { fontFamily: 'monospace', fontSize: 11, letterSpacing: 1.5, fontWeight: '600' },
    title: { color: t.textPrimary, fontSize: 20, fontWeight: '700', textAlign: 'center' },
    hint: { color: t.textSecondary, fontSize: 15, lineHeight: 22, textAlign: 'center' },
    action: {
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: 20,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: t.signal,
      backgroundColor: t.surface,
    },
    actionPressed: { backgroundColor: t.surfaceRaised, transform: [{ scale: 0.97 }] },
    actionLabel: { color: t.signal, fontSize: 14, fontWeight: '700' },
  });
