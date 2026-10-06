import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { bandFor, trendOf } from '@/ble/signal';
import type { Term } from '@/components/detail/glossary';
import { InfoSheet } from '@/components/detail/info-sheet';
import {
  BroadcastSection,
  GlanceTiles,
  LiveCard,
  PacketSection,
  Row,
  Section,
} from '@/components/detail/sections';
import { KindIcon } from '@/components/kind-icon';
import { labelOf, useT, type Strings } from '@/i18n';
import {
  advertisingIntervalMs,
  type DeviceRecord,
  realNameOf,
  useDeviceStore,
} from '@/store/devices';
import { findFavorite, useFavoritesStore } from '@/store/favorites';
import { useTheme } from '@/theme/use-theme';
import type { Palette } from '@/theme/themes';

/** Matches against the live favorites, so the star and the rows agree. */
function useFavorite(record: DeviceRecord) {
  const favorites = useFavoritesStore((state) => state.favorites);
  const name = realNameOf(record);
  return useMemo(
    () => findFavorite(favorites, { id: record.id, name }),
    [favorites, record.id, name]
  );
}

function FavoriteButton({ record }: { record: DeviceRecord }) {
  const theme = useTheme();
  const t = useT();
  const match = useFavorite(record);
  const starred = match !== null;

  const toggle = () => {
    void Haptics.selectionAsync();
    const { add, remove } = useFavoritesStore.getState();
    if (match) {
      remove(match.favorite.id);
      return;
    }
    add({
      id: record.id,
      name: realNameOf(record),
      label: record.identity.label,
      kind: record.identity.kind?.kind ?? null,
    });
  };

  return (
    <Pressable
      onPress={toggle}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityState={{ selected: starred }}
      accessibilityLabel={starred ? t.detail.removeFavorite : t.detail.addFavorite}>
      <MaterialCommunityIcons
        name={starred ? 'star' : 'star-outline'}
        size={28}
        color={starred ? theme.signal : theme.textSecondary}
      />
    </Pressable>
  );
}

function favoriteText(match: ReturnType<typeof useFavorite>, t: Strings): string {
  if (!match) return t.detail.no;
  if (match.by === 'address') return t.detail.yes;
  return t.detail.matchedByName(match.favorite.id);
}

/**
 * Without a broadcast name, the only link to a favorite is the address — and
 * many devices rotate it. Said once, where the star is set, not discovered
 * later as a favorite that silently stopped matching.
 */
function FavoriteNote({ record, styles }: { record: DeviceRecord; styles: Styles }) {
  const t = useT();
  const match = useFavorite(record);
  if (!match || realNameOf(record)) return null;
  return <Text style={styles.note}>{t.detail.favoriteNote}</Text>;
}

function IdentitySection({
  record,
  onInfo,
}: {
  record: DeviceRecord;
  onInfo: (term: Term) => void;
}) {
  const t = useT();
  const match = useFavorite(record);
  const { identity, advertisement: ad } = record;
  const name = ad.name?.trim() || null;
  const localName = ad.localName?.trim() || null;

  return (
    <Section title={t.detail.identity}>
      <Row label={t.detail.address} value={record.id} term="address" onInfo={onInfo} />
      {name && <Row label={t.detail.name} value={name} />}
      {/* Usually identical to the name; only worth a row when it says something else. */}
      {localName && localName !== name && <Row label={t.detail.localName} value={localName} />}
      <Row label={t.detail.vendor} value={identity.vendor ?? t.detail.notIdentified} />
      <Row
        label={t.detail.kind}
        value={
          identity.kind
            ? t.detail.kindFrom(t.kinds[identity.kind.kind], t.kindSources[identity.kind.source])
            : t.detail.notIdentified
        }
      />
      <Row label={t.detail.favorite} value={favoriteText(match, t)} />
    </Section>
  );
}

/**
 * What the device is, in words a newcomer can read: "Samsung watch · accepts
 * connections". Stable facts only. Band and rate already live in the hero and
 * the tiles, and repeating them here made the line change every second.
 *
 * The "what" part is dropped when it would only repeat the title: a device
 * labelled by its vendor ("Apple") or not identified at all ("Unknown device").
 */
function summaryOf(record: DeviceRecord, t: Strings): string {
  const kind = record.identity.kind ? t.kinds[record.identity.kind.kind] : null;
  const vendor = record.identity.vendor;
  const what = vendor && kind ? t.detail.vendorKind(vendor, kind) : vendor ?? kind;

  const repeatsTitle =
    !what || what.toLowerCase() === labelOf(record.identity.label, t).toLowerCase();

  const parts = [
    repeatsTitle ? null : what,
    record.isConnectable === null
      ? null
      : record.isConnectable
        ? t.detail.acceptsConnections
        : t.detail.broadcastOnly,
  ];
  const line = parts.filter(Boolean).join(' · ');
  return line && line[0].toUpperCase() + line.slice(1);
}

/**
 * Read-only by design. v1.0 never connects, so there is no pairing, no GATT
 * browser and no write affordance anywhere on this screen — every value here
 * came from the advertisement (BRIEF.md §1).
 *
 * Layered so a newcomer can stop early and an expert can keep scrolling: a
 * plain summary and the live signal, numbers with their meaning underneath,
 * the decoded broadcast, and the raw bytes last and collapsed. Jargon carries
 * an ⓘ instead of inline explanations.
 */
export default function DeviceDetailScreen() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const record = useDeviceStore((state) => state.devices[id]);
  const [term, setTerm] = useState<Term | null>(null);
  const onInfo = useCallback((next: Term) => setTerm(next), []);

  if (!record) {
    return (
      <View style={styles.empty}>
        <Stack.Screen options={{ title: t.common.device }} />
        <Text style={styles.emptyTitle}>{t.detail.outOfRange}</Text>
        <Text style={styles.emptyBody}>{t.detail.dropped}</Text>
      </View>
    );
  }

  const band = bandFor(record.smoothed);
  const interval = advertisingIntervalMs(record);
  const stale = record.staleness === 'stale';
  const kind = record.identity.kind?.kind ?? null;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* The hero carries the name and the star; the header keeps only the back arrow. */}
        <Stack.Screen options={{ title: '' }} />

        <View style={styles.hero}>
          <View style={[styles.badge, { backgroundColor: theme.chipFill(record.hue) }]}>
            {/* A generic glyph when the kind is unknown: the address tag already
                sits under the name, and in the badge it read as a mystery number. */}
            {kind ? (
              <KindIcon kind={kind} size={30} color={theme.chipInk(record.hue)} />
            ) : (
              <MaterialCommunityIcons name="bluetooth" size={30} color={theme.chipInk(record.hue)} />
            )}
          </View>
          <View style={styles.heroBody}>
            <Text style={styles.heroTitle} numberOfLines={2}>
              {labelOf(record.identity.label, t)}
            </Text>
            <Text style={styles.heroSub}>
              {record.identity.suffix}
              {` · ${stale ? t.detail.notHeard : t.detail.live}`}
            </Text>
          </View>
          {/* The live dBm is in the Signal tile below; the hero holds what is stable. */}
          <FavoriteButton record={record} />
        </View>

        {(() => {
          const summary = summaryOf(record, t);
          return summary ? <Text style={styles.summary}>{summary}</Text> : null;
        })()}

        <LiveCard id={record.id} onInfo={onInfo} />

        <Pressable
          style={({ pressed }) => [styles.hunt, pressed && styles.huntPressed]}
          accessibilityRole="button"
          onPress={() => {
            useDeviceStore.getState().setTarget(record.id);
            // Back to the existing tabs, not a new copy of them on top of this
            // screen: `replace` stacked a second (tabs), and with it a second scan.
            router.dismissTo('/hunt');
          }}>
          <MaterialCommunityIcons name="crosshairs-gps" size={18} color={theme.signal} />
          <Text style={styles.huntLabel}>{t.detail.huntThis}</Text>
        </Pressable>

        <FavoriteNote record={record} styles={styles} />

        <GlanceTiles
          glance={{
            dbm: Math.round(record.smoothed),
            band,
            trend: trendOf(record.history),
            interval,
            seenFor: Math.max(0, Math.round((record.lastSeen - record.firstSeen) / 1000)),
            firstSeen: record.firstSeen,
            packets: record.packets,
          }}
          onInfo={onInfo}
        />

        <BroadcastSection
          advertisement={record.advertisement}
          connectable={record.isConnectable}
          onInfo={onInfo}
        />

        <IdentitySection record={record} onInfo={onInfo} />

        <PacketSection rawRecords={record.advertisement.rawRecords} onInfo={onInfo} />

        <Text style={styles.footnote}>{t.detail.footnote}</Text>
      </ScrollView>

      <InfoSheet term={term} onClose={() => setTerm(null)} />
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (t: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.bg },
    content: { padding: 16, gap: 16, paddingBottom: 48 },
    empty: {
      flex: 1,
      backgroundColor: t.bg,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      gap: 8,
    },
    emptyTitle: { color: t.textPrimary, fontSize: 20, fontWeight: '600' },
    emptyBody: { color: t.textSecondary, fontSize: 15, textAlign: 'center' },

    hero: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    badge: { width: 60, height: 60, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    heroBody: { flex: 1, gap: 3 },
    heroTitle: { color: t.textPrimary, fontSize: 22, fontWeight: '700' },
    heroSub: { color: t.textTertiary, fontSize: 12, fontFamily: 'monospace' },
    summary: { color: t.textSecondary, fontSize: 15, lineHeight: 21, marginTop: -4 },

    // Outlined with an amber tint, not filled: a solid amber block blooms on
    // the dark ground. The tint is about 8% alpha (0x14), 16% when pressed.
    hunt: {
      flexDirection: 'row',
      gap: 8,
      backgroundColor: `${t.signal}14`,
      borderWidth: 1,
      borderColor: t.signal,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    huntPressed: { backgroundColor: `${t.signal}29` },
    huntLabel: { color: t.signal, fontSize: 15, fontWeight: '700' },
    note: { color: t.textTertiary, fontSize: 13, lineHeight: 18 },
    footnote: { color: t.textTertiary, fontSize: 12, textAlign: 'center', marginTop: 4 },
  });
