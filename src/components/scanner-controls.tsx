import { memo, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useDeviceStore, type SortKey } from '@/store/devices';
import { useTheme } from '@/theme/use-theme';
import type { Palette } from '@/theme/themes';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'signal', label: 'Signal' },
  { key: 'name', label: 'Name' },
  { key: 'last-seen', label: 'Recent' },
  { key: 'first-seen', label: 'Oldest' },
];

/** Cycled rather than given a slider: four coarse steps are all RSSI supports. */
const RSSI_STEPS: (number | null)[] = [null, -85, -70, -55];

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
    </Pressable>
  );
}

export const ScannerControls = memo(function ScannerControls() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const sortKey = useDeviceStore((state) => state.sortKey);
  const setSortKey = useDeviceStore((state) => state.setSortKey);
  const query = useDeviceStore((state) => state.filters.query);
  const minRssi = useDeviceStore((state) => state.filters.minRssi);
  const namedOnly = useDeviceStore((state) => state.filters.namedOnly);
  const setFilters = useDeviceStore((state) => state.setFilters);
  const legacyOnly = useDeviceStore((state) => state.legacyOnly);
  const setLegacyOnly = useDeviceStore((state) => state.setLegacyOnly);

  const cycleRssi = () => {
    const next = RSSI_STEPS[(RSSI_STEPS.indexOf(minRssi) + 1) % RSSI_STEPS.length];
    setFilters({ minRssi: next });
  };

  return (
    <View style={styles.container}>
      <TextInput
        value={query}
        onChangeText={(text) => setFilters({ query: text })}
        placeholder="Filter by name or address"
        placeholderTextColor={theme.textTertiary}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.search}
        cursorColor={theme.signal}
        selectionColor={theme.signal}
        clearButtonMode="while-editing"
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.row}>
        {SORTS.map((sort) => (
          <Chip
            key={sort.key}
            label={sort.label}
            active={sortKey === sort.key}
            onPress={() => setSortKey(sort.key)}
          />
        ))}

        <View style={styles.divider} />

        <Chip
          label={minRssi === null ? 'Any signal' : `≥ ${minRssi} dBm`}
          active={minRssi !== null}
          onPress={cycleRssi}
        />
        <Chip
          label="Named only"
          active={namedOnly}
          onPress={() => setFilters({ namedOnly: !namedOnly })}
        />

        <View style={styles.divider} />

        {/* Not a filter: this changes what the radio captures, not what the
            list shows, so it restarts the scan and clears the list. */}
        <Chip
          label="Legacy only (4.x)"
          active={legacyOnly}
          onPress={() => setLegacyOnly(!legacyOnly)}
        />
      </ScrollView>
    </View>
  );
});

const makeStyles = (t: Palette) =>
  StyleSheet.create({
  container: { gap: 8, paddingBottom: 4 },
  search: {
    backgroundColor: t.surface,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: t.textPrimary,
    fontSize: 15,
  },
  row: { gap: 8, alignItems: 'center', paddingRight: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
  },
  chipActive: { borderColor: t.signal, backgroundColor: t.surfaceRaised },
  chipLabel: { color: t.textSecondary, fontSize: 13 },
  chipLabelActive: { color: t.signal, fontWeight: '600' },
  divider: { width: 1, height: 20, backgroundColor: t.border, marginHorizontal: 2 },
});
