import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useDeviceStore } from '@/store/devices';
import { colors } from '@/theme/colors';

/**
 * Start/stop is user intent only. The gate still has the final say — this
 * cannot force a scan while Bluetooth is off.
 */
export function ScanToggle() {
  const scanning = useDeviceStore((state) => state.scanning);
  const setScanning = useDeviceStore((state) => state.setScanning);

  return (
    <Pressable
      onPress={() => setScanning(!scanning)}
      hitSlop={10}
      accessibilityRole="switch"
      accessibilityState={{ checked: scanning }}
      accessibilityLabel={scanning ? 'Pause scanning' : 'Resume scanning'}
      style={[styles.pill, scanning && styles.pillActive]}>
      <View style={[styles.dot, scanning ? styles.dotLive : styles.dotPaused]} />
      <Text style={[styles.label, scanning && styles.labelActive]}>
        {scanning ? 'Scanning' : 'Paused'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pillActive: { borderColor: colors.signal, backgroundColor: colors.surfaceRaised },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotLive: { backgroundColor: colors.signal },
  dotPaused: { backgroundColor: colors.textTertiary },
  label: { color: colors.textSecondary, fontSize: 13 },
  labelActive: { color: colors.signal, fontWeight: '600' },
});
