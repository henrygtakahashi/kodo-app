import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { base64ToHex } from '@/ble/base64';
import { bandFor } from '@/ble/signal';
import { advertisingIntervalMs, useDeviceStore } from '@/store/devices';
import { useTheme } from '@/theme/use-theme';
import type { Palette } from '@/theme/themes';

function Row({ label, value }: { label: string; value: string | null }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} selectable>
        {value ?? '—'}
      </Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Hex({ label, value }: { label: string; value: string | null }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  // Decoding is pure and the input rarely changes; recomputing it on every
  // render would redo the work at the store's update rate.
  const hex = useMemo(() => (value ? base64ToHex(value) : '—'), [value]);
  return (
    <View style={styles.hexBlock}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.hex} selectable>
        {hex}
      </Text>
    </View>
  );
}

/**
 * Read-only by design. v1.0 never connects, so there is no pairing, no GATT
 * browser and no write affordance anywhere on this screen — every value here
 * came from the advertisement (BRIEF.md §1).
 */
export default function DeviceDetailScreen() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const record = useDeviceStore((state) => state.devices[id]);

  if (!record) {
    return (
      <View style={styles.empty}>
        <Stack.Screen options={{ title: 'Device' }} />
        <Text style={styles.emptyTitle}>Out of range</Text>
        <Text style={styles.emptyBody}>
          This device stopped advertising and was dropped from the scan.
        </Text>
      </View>
    );
  }

  const band = bandFor(record.smoothed);
  const interval = advertisingIntervalMs(record);
  const { advertisement: ad } = record;
  const seenFor = Math.max(0, Math.round((record.lastSeen - record.firstSeen) / 1000));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: record.identity.label }} />

      <View style={styles.hero}>
        <View style={[styles.chip, { backgroundColor: theme.chipFill(record.hue) }]}>
          <Text style={[styles.chipText, { color: theme.chipInk(record.hue) }]}>
            {record.identity.suffix}
          </Text>
        </View>
        <View style={styles.heroBody}>
          <Text style={styles.heroTitle}>{record.identity.label}</Text>
          <Text style={[styles.heroBand, { color: theme.bands[band] }]}>
            {band} · {record.staleness === 'stale' ? 'not heard recently' : 'live'}
          </Text>
        </View>
        <View style={styles.heroSignal}>
          <Text style={[styles.heroRssi, { color: theme.bands[band] }]}>
            {Math.round(record.smoothed)}
          </Text>
          <Text style={styles.heroUnit}>dBm</Text>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [styles.hunt, pressed && styles.huntPressed]}
        accessibilityRole="button"
        onPress={() => {
          useDeviceStore.getState().setTarget(record.id);
          router.replace('/hunt');
        }}>
        <Text style={styles.huntLabel}>Hunt this device</Text>
      </Pressable>

      <Section title="Signal">
        <Row label="Smoothed" value={`${Math.round(record.smoothed)} dBm`} />
        <Row label="Raw" value={`${record.rssi} dBm`} />
        <Row label="Band" value={band} />
        <Row
          label="Tx power"
          value={record.txPowerLevel === null ? null : `${record.txPowerLevel} dBm`}
        />
        <Row label="Packets" value={String(record.packets)} />
        <Row label="Mean interval" value={interval === null ? null : `${interval} ms`} />
        <Row label="Seen for" value={`${seenFor}s`} />
      </Section>

      <Section title="Identity">
        <Row label="Address" value={record.id} />
        <Row label="Name" value={ad.name} />
        <Row label="Local name" value={ad.localName} />
        <Row label="Vendor" value={record.identity.vendor} />
        <Row
          label="Advertising mode"
          value={
            record.isConnectable === null
              ? null
              : record.isConnectable
                ? 'connectable'
                : 'broadcast-only'
          }
        />
      </Section>

      <Section title="Services">
        <Row label="Service UUIDs" value={ad.serviceUUIDs?.join('\n') ?? null} />
        <Row
          label="Solicited"
          value={ad.solicitedServiceUUIDs?.length ? ad.solicitedServiceUUIDs.join('\n') : null}
        />
        <Row
          label="Service data"
          value={
            ad.serviceData
              ? Object.entries(ad.serviceData)
                  .map(([uuid, value]) => `${uuid}\n${base64ToHex(value)}`)
                  .join('\n\n')
              : null
          }
        />
      </Section>

      <Section title="Raw">
        <Hex label="Manufacturer data" value={ad.manufacturerData} />
        {ad.rawRecords.map((raw, index) => (
          <Hex
            key={raw}
            // Devices alternate payloads; showing each variant is the honest
            // view, and stops the section strobing between them.
            label={
              ad.rawRecords.length > 1
                ? `Scan record ${index + 1} of ${ad.rawRecords.length}`
                : 'Scan record'
            }
            value={raw}
          />
        ))}
      </Section>

      <Text style={styles.footnote}>
        Passive scan only. Nothing here required connecting to the device.
      </Text>
    </ScrollView>
  );
}

const makeStyles = (t: Palette) =>
  StyleSheet.create({
  screen: { flex: 1, backgroundColor: t.bg },
  content: { padding: 16, gap: 16, paddingBottom: 48 },
  empty: { flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  emptyTitle: { color: t.textPrimary, fontSize: 20, fontWeight: '600' },
  emptyBody: { color: t.textSecondary, fontSize: 15, textAlign: 'center' },

  hero: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chip: { width: 52, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: 14, fontFamily: 'monospace', fontWeight: '700' },
  heroBody: { flex: 1, gap: 2 },
  heroTitle: { color: t.textPrimary, fontSize: 20, fontWeight: '700' },
  heroBand: { fontSize: 13 },
  heroSignal: { alignItems: 'flex-end' },
  heroRssi: { fontSize: 26, fontFamily: 'monospace', fontWeight: '700' },
  heroUnit: { color: t.textTertiary, fontSize: 11, fontFamily: 'monospace' },

  section: { gap: 6 },
  sectionTitle: { color: t.textTertiary, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  sectionBody: {
    backgroundColor: t.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: t.border,
    paddingHorizontal: 12,
  },
  row: { flexDirection: 'row', gap: 12, paddingVertical: 10, alignItems: 'flex-start' },
  rowLabel: { color: t.textSecondary, fontSize: 13, width: 128 },
  rowValue: { color: t.textPrimary, fontSize: 13, fontFamily: 'monospace', flex: 1 },

  hexBlock: { paddingVertical: 10, gap: 6 },
  hex: { color: t.textPrimary, fontSize: 12, fontFamily: 'monospace', lineHeight: 18 },

  hunt: {
    borderWidth: 1,
    borderColor: t.signal,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  huntPressed: { backgroundColor: t.surfaceRaised },
  huntLabel: { color: t.signal, fontSize: 15, fontWeight: '700' },
  footnote: { color: t.textTertiary, fontSize: 12, textAlign: 'center', marginTop: 4 },
});
