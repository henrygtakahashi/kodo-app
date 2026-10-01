import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { bandFor } from '@/ble/signal';
import { bands, colors, mono } from '@/theme/colors';
import { useDeviceStore } from '@/store/devices';

function secondsAgo(lastSeen: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - lastSeen) / 1000));
  return seconds === 0 ? 'now' : `${seconds}s`;
}

/**
 * Subscribes to its own device only. The list passes an id, never a record, so
 * an 8 Hz RSSI tick repaints one card's readout instead of the whole list.
 */
export const DeviceCard = memo(function DeviceCard({ id }: { id: string }) {
  const record = useDeviceStore(
    useShallow((state) => {
      const device = state.devices[id];
      if (!device) return null;
      return {
        label: device.identity.label,
        vendor: device.identity.vendor,
        suffix: device.identity.suffix,
        hue: device.hue,
        smoothed: Math.round(device.smoothed),
        lastSeen: device.lastSeen,
        staleness: device.staleness,
        isConnectable: device.isConnectable,
      };
    })
  );

  if (!record) return null;

  const band = bandFor(record.smoothed);
  const stale = record.staleness === 'stale';

  return (
    <Pressable style={[styles.card, stale && styles.stale]} accessibilityRole="button">
      <View style={[styles.chip, { backgroundColor: `hsl(${record.hue}, 45%, 22%)` }]}>
        <Text style={[styles.chipText, { color: `hsl(${record.hue}, 70%, 70%)` }]}>
          {record.suffix}
        </Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.label} numberOfLines={1}>
          {record.label}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {[
            // The label already falls back to the vendor, so repeating it
            // would read "Microsoft · Microsoft".
            record.vendor === record.label ? null : record.vendor,
            // null means the advertisement did not say, which is not the same
            // as connectable.
            record.isConnectable === null
              ? null
              : record.isConnectable
                ? 'connectable'
                : 'broadcast-only',
            secondsAgo(record.lastSeen),
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </View>

      <View style={styles.signal}>
        {/* Tabular face: at 8 Hz a proportional one changes glyph widths as
            digits change, so the number visibly jitters (DESIGN.md §8). */}
        <Text style={[styles.rssi, { color: bands[band] }]}>{record.smoothed}</Text>
        <Text style={styles.unit}>dBm</Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  // Dimmed, not removed: "not heard from recently" is not "gone".
  stale: { opacity: 0.45 },
  chip: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: 13, fontFamily: mono, fontWeight: '700' },
  body: { flex: 1, gap: 2 },
  label: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
  meta: { color: colors.textTertiary, fontSize: 12 },
  signal: { alignItems: 'flex-end' },
  rssi: { fontSize: 18, fontFamily: mono, fontWeight: '700' },
  unit: { color: colors.textTertiary, fontSize: 11, fontFamily: mono },
});
