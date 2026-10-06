import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Canvas } from '@shopify/react-native-skia';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { memo, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import { distinctRecords, hex2, toHex, type ParsedRecord } from '@/ble/ad-structures';
import { type Band, type Trend } from '@/ble/signal';
import { CadenceStrip } from '@/components/cadence-strip';
import { SignalTrace } from '@/components/signal-trace';
import {
  CADENCE_WINDOW_MS,
  HISTORY_HZ,
  type Advertisement,
  useDeviceStore,
} from '@/store/devices';
import { useLanguage, useT, type Strings } from '@/i18n';
import { useTheme } from '@/theme/use-theme';
import type { Palette } from '@/theme/themes';
import type { Term } from './glossary';
import { InfoButton } from './info-sheet';

type OnInfo = (term: Term) => void;

function useStyles() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return { theme, styles };
}

// --- Shared ---------------------------------------------------------------------

export function Section({
  title,
  term,
  onInfo,
  children,
}: {
  title: string;
  term?: Term;
  onInfo?: OnInfo;
  children: ReactNode;
}) {
  const { styles } = useStyles();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {term && onInfo ? <InfoButton term={term} onInfo={onInfo} /> : null}
      </View>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

export function Row({
  label,
  value,
  code,
  term,
  onInfo,
}: {
  label: string;
  value: string;
  /** Spec-level identifier shown small, for experts: an AD type, a company id. */
  code?: string;
  term?: Term;
  onInfo?: OnInfo;
}) {
  const { styles } = useStyles();
  return (
    <View style={styles.row}>
      <View style={styles.rowLabelCell}>
        <View style={styles.rowLabelLine}>
          <Text style={styles.rowLabel}>{label}</Text>
          {term && onInfo ? <InfoButton term={term} onInfo={onInfo} /> : null}
        </View>
        {code ? <Text style={styles.rowCode}>{code}</Text> : null}
      </View>
      <Text style={styles.rowValue} selectable>
        {value}
      </Text>
    </View>
  );
}

// --- Live -----------------------------------------------------------------------

const TRACE_HEIGHT = 44;
const STRIP_HEIGHT = 24;
const LIVE_GAP = 6;
/**
 * Both rows share one time axis, so the trace shows the same window as the
 * strip. Two windows under one "now" read as one axis and misaligned events.
 */
const LIVE_SECONDS = CADENCE_WINDOW_MS / 1000;
const CLOCK_MS = 100;

/**
 * The live signal: trace and cadence strip on one shared 10 s axis, one canvas.
 * Both read the store on their own and never re-render React (DESIGN.md §2).
 */
export const LiveCard = memo(function LiveCard({ id, onInfo }: { id: string; onInfo: OnInfo }) {
  const { theme, styles } = useStyles();
  const t = useT();
  const [width, setWidth] = useState(0);
  const clock = useSharedValue(Date.now());
  const scanning = useDeviceStore((state) => state.scanning);

  useEffect(() => {
    if (!scanning) return;
    clock.set(Date.now());
    const timer = setInterval(() => clock.set(Date.now()), CLOCK_MS);
    return () => clearInterval(timer);
  }, [scanning, clock]);

  return (
    <View style={styles.live}>
      <View style={styles.liveHead}>
        <Text style={styles.liveLabel}>{t.detail.liveLabel}</Text>
        <InfoButton term="cadence" onInfo={onInfo} />
      </View>
      <View
        style={{ height: TRACE_HEIGHT + LIVE_GAP + STRIP_HEIGHT }}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && (
          <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
            <SignalTrace
              id={id}
              x={0}
              y={2}
              width={width}
              height={TRACE_HEIGHT - 4}
              samples={LIVE_SECONDS * HISTORY_HZ}
            />
            <CadenceStrip
              id={id}
              x={0}
              y={TRACE_HEIGHT + LIVE_GAP}
              width={width}
              height={STRIP_HEIGHT}
              variant="bare"
              track={theme.border}
              clock={clock}
            />
          </Canvas>
        )}
      </View>
      <View style={styles.liveFoot}>
        <Text style={styles.liveLabel}>{t.detail.secondsAgo(LIVE_SECONDS)}</Text>
        <Text style={styles.liveLabel}>{t.detail.now}</Text>
      </View>
    </View>
  );
});

// --- At a glance ----------------------------------------------------------------

export type Glance = {
  dbm: number;
  band: Band;
  trend: Trend;
  interval: number | null;
  seenFor: number;
  firstSeen: number;
  packets: number;
};

function Tile({
  value,
  caption,
  term,
  onInfo,
  accent,
}: {
  value: string;
  caption: string;
  term: Term;
  onInfo: OnInfo;
  accent?: string;
}) {
  const { styles } = useStyles();
  return (
    <View style={styles.tile}>
      <View style={styles.tileHead}>
        <Text style={[styles.tileValue, accent ? { color: accent } : null]}>{value}</Text>
        <InfoButton term={term} onInfo={onInfo} />
      </View>
      <Text style={styles.tileCaption}>{caption}</Text>
    </View>
  );
}

/** Each number with its meaning underneath: the expert reads the top line, the newcomer the bottom. */
export function GlanceTiles({ glance, onInfo }: { glance: Glance; onInfo: OnInfo }) {
  const { theme, styles } = useStyles();
  const t = useT();
  const language = useLanguage();
  const since = new Date(glance.firstSeen).toLocaleTimeString(language, {
    hour: '2-digit',
    minute: '2-digit',
  });
  return (
    <View style={styles.tiles}>
      <Tile
        value={`${glance.dbm} dBm`}
        caption={`${t.bands[glance.band]} · ${t.detail.trend[glance.trend]}`}
        term="signal"
        onInfo={onInfo}
        accent={theme.bands[glance.band]}
      />
      <Tile
        value={glance.interval === null ? '—' : `${glance.interval} ms`}
        caption={t.detail.rate(glance.interval)}
        term="interval"
        onInfo={onInfo}
      />
      <Tile
        value={t.detail.duration(glance.seenFor)}
        caption={t.detail.since(since)}
        term="seen"
        onInfo={onInfo}
      />
      <Tile
        value={glance.packets.toLocaleString(language)}
        caption={t.detail.received}
        term="packets"
        onInfo={onInfo}
      />
    </View>
  );
}

// --- What it is broadcasting -----------------------------------------------------

/** Fields worth naming when absent, so "nothing" is said once instead of row by row. */
const NOTABLE: { types: number[]; label: keyof Strings['detail']['notable'] }[] = [
  { types: [0x08, 0x09], label: 'name' },
  { types: [0xff], label: 'manufacturer' },
  { types: [0x19], label: 'category' },
  { types: [0x02, 0x03, 0x04, 0x05, 0x06, 0x07], label: 'services' },
  { types: [0x0a], label: 'txPower' },
];

export const BroadcastSection = memo(function BroadcastSection({
  advertisement,
  connectable,
  onInfo,
}: {
  advertisement: Advertisement;
  connectable: boolean | null;
  onInfo: OnInfo;
}) {
  const { styles } = useStyles();
  const t = useT();
  const records = useMemo(
    () => distinctRecords(advertisement.rawRecords, t),
    [advertisement.rawRecords, t]
  );

  // One row per field type: alternating payloads repeat most fields.
  const fields = useMemo(() => {
    const byType = new Map<number, ParsedRecord['structures'][number]>();
    for (const record of records) {
      for (const s of record.structures) if (!byType.has(s.type)) byType.set(s.type, s);
    }
    return [...byType.values()];
  }, [records]);

  const present = new Set(fields.map((f) => f.type));
  const missing = NOTABLE.filter((n) => !n.types.some((t) => present.has(t))).map((n) => t.detail.notable[n.label]);

  return (
    <Section title={t.detail.broadcasting} term="advertisement" onInfo={onInfo}>
      {fields.map((field) => (
        <Row
          key={field.type}
          label={field.name}
          code={`0x${hex2(field.type).toUpperCase()}`}
          value={field.summary || toHex(field.bytes.slice(2))}
        />
      ))}
      {connectable !== null && (
        <Row
          label={t.detail.connections}
          value={connectable ? t.detail.acceptsConnectionsTitle : t.detail.broadcastOnlyTitle}
          term="connectable"
          onInfo={onInfo}
        />
      )}
      {missing.length > 0 && (
        <Text style={styles.missing}>{t.detail.notBroadcast(missing.join(', '))}</Text>
      )}
    </Section>
  );
});

// --- Packet ---------------------------------------------------------------------

function PacketRecord({ record, index, total }: { record: ParsedRecord; index: number; total: number }) {
  const { theme, styles } = useStyles();
  const t = useT();
  const [copied, setCopied] = useState(false);
  const full = record.structures.map((s) => toHex(s.bytes)).join(' ');

  const copy = async () => {
    await Clipboard.setStringAsync(full);
    void Haptics.selectionAsync();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <View style={styles.packet}>
      <View style={styles.packetHead}>
        <Text style={styles.rowLabel}>
          {t.detail.packetHead(
            index,
            total,
            record.structures.reduce((n, s) => n + s.bytes.length, 0)
          )}
        </Text>
        <Pressable onPress={copy} hitSlop={10} accessibilityRole="button" accessibilityLabel={t.detail.copyHex}>
          <View style={styles.copy}>
            <MaterialCommunityIcons
              name={copied ? 'check' : 'content-copy'}
              size={14}
              color={theme.signal}
            />
            <Text style={styles.copyLabel}>{copied ? t.common.copied : t.common.copy}</Text>
          </View>
        </Pressable>
      </View>

      {record.structures.map((s, i) => (
        <View key={i} style={styles.structure}>
          <Text style={styles.hex}>
            <Text style={styles.hexLength}>{hex2(s.bytes[0])} </Text>
            <Text style={styles.hexType}>{hex2(s.bytes[1])}</Text>
            {s.bytes.length > 2 ? ` ${toHex(s.bytes.slice(2))}` : ''}
          </Text>
          <Text style={styles.structureName}>{s.name}</Text>
        </View>
      ))}

      {record.padding > 0 && (
        <Text style={styles.padding}>{t.detail.padding(record.padding)}</Text>
      )}
    </View>
  );
}

/** Collapsed by default: the expert's view, one tap away for everyone else. */
export const PacketSection = memo(function PacketSection({
  rawRecords,
  onInfo,
}: {
  rawRecords: string[];
  onInfo: OnInfo;
}) {
  const { theme, styles } = useStyles();
  const t = useT();
  const [open, setOpen] = useState(false);
  const records = useMemo(() => distinctRecords(rawRecords, t), [rawRecords, t]);
  if (records.length === 0) return null;

  return (
    <View style={styles.section}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{t.detail.rawPacket}</Text>
        <InfoButton term="packet" onInfo={onInfo} />
        <View style={styles.flex} />
        <Text style={styles.toggle}>{open ? t.detail.hide : t.detail.showBytes}</Text>
        <MaterialCommunityIcons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={theme.signal}
        />
      </Pressable>
      {open && (
        <View style={styles.card}>
          <View style={styles.legend}>
            <Text style={[styles.legendItem, styles.hexLength]}>{t.detail.legendLength}</Text>
            <Text style={[styles.legendItem, styles.hexType]}>{t.detail.legendType}</Text>
            <Text style={styles.legendItem}>{t.detail.legendData}</Text>
          </View>
          {records.map((record, index) => (
            <PacketRecord key={index} record={record} index={index} total={records.length} />
          ))}
        </View>
      )}
    </View>
  );
});

const makeStyles = (t: Palette) =>
  StyleSheet.create({
    flex: { flex: 1 },
    section: { gap: 8 },
    sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    sectionTitle: { color: t.textTertiary, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
    card: {
      backgroundColor: t.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: t.border,
      paddingHorizontal: 14,
      paddingVertical: 4,
    },
    row: {
      flexDirection: 'row',
      gap: 12,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.border,
    },
    rowLabelCell: { width: 132, gap: 2 },
    rowLabelLine: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    rowLabel: { color: t.textSecondary, fontSize: 13 },
    rowCode: { color: t.textTertiary, fontSize: 11, fontFamily: 'monospace' },
    rowValue: { color: t.textPrimary, fontSize: 14, flex: 1 },
    missing: { color: t.textTertiary, fontSize: 12, paddingVertical: 10 },

    // Bare, no card, matching Hunt: the trace reads as a line on the page.
    live: { gap: 8, paddingHorizontal: 2, paddingVertical: 4 },
    liveHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    liveFoot: { flexDirection: 'row', justifyContent: 'space-between' },
    liveLabel: { color: t.textTertiary, fontSize: 11 },

    tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tile: {
      flexBasis: '48%',
      flexGrow: 1,
      backgroundColor: t.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: t.border,
      padding: 12,
      gap: 4,
    },
    tileHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    tileValue: { color: t.textPrimary, fontSize: 19, fontWeight: '700', fontFamily: 'monospace' },
    tileCaption: { color: t.textSecondary, fontSize: 12 },

    toggle: { color: t.signal, fontSize: 13, fontWeight: '600' },
    legend: { flexDirection: 'row', gap: 14, paddingTop: 10 },
    legendItem: { color: t.textPrimary, fontSize: 11, fontFamily: 'monospace' },
    packet: { paddingVertical: 10, gap: 8 },
    packetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    copy: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    copyLabel: { color: t.signal, fontSize: 12, fontWeight: '600' },
    structure: { gap: 2 },
    hex: { color: t.textPrimary, fontSize: 12, fontFamily: 'monospace', lineHeight: 18 },
    hexLength: { color: t.textTertiary },
    hexType: { color: t.signal, fontWeight: '700' },
    structureName: { color: t.textTertiary, fontSize: 11 },
    padding: { color: t.textTertiary, fontSize: 11, fontStyle: 'italic' },
  });
