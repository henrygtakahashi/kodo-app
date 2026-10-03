import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { memo, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';

import { useDeviceStore, type SortKey } from '@/store/devices';
import { useTheme } from '@/theme/use-theme';
import type { Palette } from '@/theme/themes';
import { Segmented } from './segmented';

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'signal', label: 'Signal' },
  { value: 'name', label: 'Name' },
];

/** Four coarse steps are all RSSI supports, so detents rather than a slider. */
const FLOORS: { value: number | null; label: string }[] = [
  { value: null, label: 'Any' },
  { value: -85, label: '−85' },
  { value: -70, label: '−70' },
  { value: -55, label: '−55' },
];

const PANEL_IN = FadeInDown.duration(150);
const PANEL_OUT = FadeOutUp.duration(100);

/** A removable pill for one active setting. */
function Pill({ label, onClear }: { label: string; onClear: () => void }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <Pressable
      onPress={onClear}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={`Remove ${label}`}
      style={styles.pill}>
      <Text style={styles.pillLabel}>{label}</Text>
      <MaterialCommunityIcons name="close" size={13} color={theme.signal} />
    </Pressable>
  );
}

function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleText}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={(next) => {
          void Haptics.selectionAsync();
          onChange(next);
        }}
        trackColor={{ false: theme.border, true: theme.signal }}
        thumbColor={value ? theme.bg : theme.textTertiary}
        accessibilityLabel={label}
      />
    </View>
  );
}

export const ScannerControls = memo(function ScannerControls() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [open, setOpen] = useState(false);

  const sortKey = useDeviceStore((state) => state.sortKey);
  const setSortKey = useDeviceStore((state) => state.setSortKey);
  const query = useDeviceStore((state) => state.filters.query);
  const minRssi = useDeviceStore((state) => state.filters.minRssi);
  const namedOnly = useDeviceStore((state) => state.filters.namedOnly);
  const favoritesOnly = useDeviceStore((state) => state.filters.favoritesOnly);
  const setFilters = useDeviceStore((state) => state.setFilters);
  const legacyOnly = useDeviceStore((state) => state.legacyOnly);
  const setLegacyOnly = useDeviceStore((state) => state.setLegacyOnly);

  const sortChanged = sortKey !== 'signal';
  const active = [minRssi !== null, namedOnly, favoritesOnly, legacyOnly, sortChanged].filter(Boolean).length;

  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        <View style={styles.search}>
          <MaterialCommunityIcons name="magnify" size={20} color={theme.textTertiary} />
          <TextInput
            value={query}
            onChangeText={(text) => setFilters({ query: text })}
            placeholder="Search name or address"
            placeholderTextColor={theme.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            cursorColor={theme.signal}
            selectionColor={theme.signal}
            accessibilityLabel="Search devices"
          />
          {query.length > 0 && (
            <Pressable
              onPress={() => setFilters({ query: '' })}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Clear search">
              <MaterialCommunityIcons name="close-circle" size={18} color={theme.textTertiary} />
            </Pressable>
          )}
        </View>

        <Pressable
          onPress={() => setOpen((v) => !v)}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={active > 0 ? `Filters, ${active} active` : 'Filters'}
          style={[styles.tune, (open || active > 0) && styles.tuneActive]}>
          <MaterialCommunityIcons
            name="tune-variant"
            size={20}
            color={open || active > 0 ? theme.signal : theme.textSecondary}
          />
          {active > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{active}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {!open && active > 0 && (
        <Animated.View entering={PANEL_IN} exiting={PANEL_OUT} style={styles.pills}>
          {minRssi !== null && (
            <Pill label={`≥ ${minRssi} dBm`} onClear={() => setFilters({ minRssi: null })} />
          )}
          {favoritesOnly && (
            <Pill label="Favorites" onClear={() => setFilters({ favoritesOnly: false })} />
          )}
          {namedOnly && <Pill label="Named only" onClear={() => setFilters({ namedOnly: false })} />}
          {legacyOnly && <Pill label="Legacy 4.x" onClear={() => setLegacyOnly(false)} />}
          {sortChanged && <Pill label="By name" onClear={() => setSortKey('signal')} />}
        </Animated.View>
      )}

      {open && (
        <Animated.View entering={PANEL_IN} exiting={PANEL_OUT} style={styles.panel}>
          <Text style={styles.section}>Sort by</Text>
          <Segmented
            options={SORTS}
            value={sortKey}
            onChange={setSortKey}
            accessibilityLabel="Sort by"
          />

          <Text style={styles.section}>Minimum signal, dBm</Text>
          <Segmented
            options={FLOORS}
            value={minRssi}
            onChange={(next) => setFilters({ minRssi: next })}
            accessibilityLabel="Minimum signal"
          />

          <ToggleRow
            label="Favorites only"
            value={favoritesOnly}
            onChange={(next) => setFilters({ favoritesOnly: next })}
          />

          <ToggleRow
            label="Named devices only"
            value={namedOnly}
            onChange={(next) => setFilters({ namedOnly: next })}
          />

          <View style={styles.rule} />

          {/* Not a filter: this changes what the radio captures, not what the
              list shows, so it restarts the scan and clears the list. */}
          <ToggleRow
            label="Legacy advertising only"
            hint="Bluetooth 4.x. Restarts the scan and clears the list."
            value={legacyOnly}
            onChange={setLegacyOnly}
          />
        </Animated.View>
      )}
    </View>
  );
});

const makeStyles = (t: Palette) =>
  StyleSheet.create({
    container: { gap: 8, paddingBottom: 4 },
    bar: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    search: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.surface,
    },
    input: { flex: 1, paddingVertical: 10, color: t.textPrimary, fontSize: 15 },
    tune: {
      width: 44,
      height: 44,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tuneActive: { borderColor: t.signal, backgroundColor: t.surfaceRaised },
    badge: {
      position: 'absolute',
      top: -5,
      right: -5,
      minWidth: 18,
      height: 18,
      paddingHorizontal: 4,
      borderRadius: 9,
      backgroundColor: t.signal,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: { color: t.bg, fontSize: 11, fontWeight: '700' },
    pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingLeft: 10,
      paddingRight: 8,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: t.signal,
      backgroundColor: t.surfaceRaised,
    },
    pillLabel: { color: t.signal, fontSize: 12, fontWeight: '600' },
    panel: {
      gap: 8,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.surface,
    },
    section: { color: t.textTertiary, fontSize: 12, marginTop: 4 },
    toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 4 },
    toggleText: { flex: 1, gap: 2 },
    toggleLabel: { color: t.textPrimary, fontSize: 14 },
    hint: { color: t.textTertiary, fontSize: 12, lineHeight: 16 },
    rule: { height: 1, backgroundColor: t.border, marginVertical: 4 },
  });
