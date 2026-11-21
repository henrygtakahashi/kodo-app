import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useT } from '@/i18n';
import { useDeviceStore } from '@/store/devices';
import { useTheme } from '@/theme/use-theme';
import type { Palette } from '@/theme/themes';

/**
 * Start/stop is user intent only. The gate still has the final say — this
 * cannot force a scan while Bluetooth is off.
 */
export function ScanToggle() {
  const scanning = useDeviceStore((state) => state.scanning);
  const setScanning = useDeviceStore((state) => state.setScanning);
  const theme = useTheme();
  const t = useT();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <Pressable
      onPress={() => setScanning(!scanning)}
      hitSlop={10}
      accessibilityRole="switch"
      accessibilityState={{ checked: scanning }}
      accessibilityLabel={scanning ? t.scanToggle.pause : t.scanToggle.resume}
      style={[styles.pill, scanning && styles.pillActive]}>
      <View style={[styles.dot, scanning ? styles.dotLive : styles.dotPaused]} />
      <Text style={[styles.label, scanning && styles.labelActive]}>
        {scanning ? t.scanToggle.scanning : t.scanToggle.paused}
      </Text>
    </Pressable>
  );
}

const makeStyles = (t: Palette) =>
  StyleSheet.create({
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.surface,
    },
    pillActive: { borderColor: t.signal, backgroundColor: t.surfaceRaised },
    dot: { width: 8, height: 8, borderRadius: 4 },
    dotLive: { backgroundColor: t.signal },
    dotPaused: { backgroundColor: t.textTertiary },
    label: { color: t.textSecondary, fontSize: 13 },
    labelActive: { color: t.signal, fontWeight: '600' },
  });
