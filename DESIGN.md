# ble-app — Design, UI & Motion

Visual direction, UI stack, and motion rules for the BLE radar. Technical
architecture — BLE config, state management, build setup — lives in
[ARCHITECTURE.md](./ARCHITECTURE.md).

**Scope:** Android only for now. Sections note where a decision is platform-coupled.
**Verified:** 2026-09-29 against the project's actual dependency resolution.

---

## 1. Design intent

A scanner that does not look like a scanner. Store BLE apps are a scrolling list
of MAC addresses because composing native views makes that easy.

Refusing that default is not a licence to invent data — the radar was cut for
exactly that. Distinction has to come from something materially true about BLE
and currently invisible. It comes from **rhythm**.

Devices broadcast on intervals from 20 ms to 10.24 s. A Microsoft beacon at
118 ms draws a near-solid block; a watch at 231 ms a dense comb; a Find My tag at
2 s two lone ticks. The cadence identifies the kind of device before the name
does, and no app on the store shows it. Every pixel of it is measured.

The palette is amber CRT: deep brown-black ground, warm bone text, one amber.
Monochrome by intent — proximity is ordinal, so it reads as a luminance ramp of
a single hue rather than four unrelated colours. A paper ground was tried first
and rejected: a green signal on light paper read as neither instrument nor
document.

---

## 2. Data flow contract

The one architectural fact the render layer depends on. Full reasoning in
[ARCHITECTURE.md §3](./ARCHITECTURE.md#3-state-management).

| Concern | Lives in | Re-renders React? |
|---|---|---|
| Device *set* (appeared / dropped) | zustand store | Yes — infrequent |
| RSSI → radius, angle, trail | Reanimated shared values | **Never** |
| Advertisement stream (5–20 Hz) | Buffered `Map`, flushed ~8 Hz | No |

The 100–300 packets/sec stream must never reach React. Skia reads shared values
directly on the UI thread. Breaking this contract is the one change that will
cost the frame rate outright.

### Where the Scanner list fits

The 8 Hz store flush is deliberate, but it must not become 8 re-renders/sec of a
sorted list. Three separate subscriptions, not one:

| Subscribes to | Cadence | Re-renders |
|---|---|---|
| Ordered array of device **ids** | 3 s cooldown, suspended while the list is touched | the list |
| That device's own record | ≤2 Hz, at once on a 3 dBm jump | one row's readouts |
| Nothing — Reanimated shared values | every frame | nothing |

Membership changes (a device appears or expires) bypass the cooldown and land
within one 1 Hz sweep; only *reordering* waits. Explicit sort and filter changes
bypass it too — a control that takes 3 s to answer reads as broken.

The list container subscribes to an **id array only**, so an RSSI change cannot
re-render it. Each row and each cadence strip listens to the store but exits at
once unless its own record object changed — `merge` replaces only the records
that received packets, so the per-write cost no longer grows with the list.

Readouts are throttled on top of that. The smoothed dBm and mean interval shift
on nearly every 8 Hz flush, which re-rendered every row 8×/s for digits nobody
can read at that rate. They now show at most every 500 ms, or at once on a jump
of 3 dBm or more; identity, staleness and band changes show immediately.

**The strips are the expensive part, and they were UI-thread bound.** Measured
on a Galaxy device over scrcpy with 30 synthetic advertisers (two at 5 ms, two
at 12 ms): 76% janky frames while scrolling, a 29 ms median frame, the UI thread
at 90% CPU. With the canvas disabled the same load was 7% janky, so the strips
were the cost, and a 5 ms advertiser — 2000 segments in one strip — was the
worst of it. Four changes, in order of effect:

1. **Density cap.** Arrivals closer than 40 ms are not kept (`MIN_TICK_GAP_MS`).
   One pixel of the strip is about 50 ms, so denser ticks drew on top of each
   other as the same solid block. `packets` still counts every advertisement, so
   the interval readout is unaffected.
2. **Translate, don't rebuild.** A strip's path is built once per change in
   arrivals, relative to the instant it was built. Time passing is a translation
   by the shared clock, clipped to the track. Most devices advertise rarely, so
   most paths never rebuild.
3. **One native call per path.** The path is parsed from an SVG string rather
   than built with two JSI calls per tick.
4. **No scroll handler.** An earlier cull of off-screen strips re-ran every
   path on every scroll event. The canvas scrolls natively with the rows;
   leave it alone.

Result under the same load: 0.34% janky while scrolling (7 of 2039 frames, 99th
percentile 18 ms) and 11.6% idle, down from 50%. The clock is a steady 10 Hz
interval that stops with the scan, so a paused list holds still.

Re-sort cadence is capped and paused on touch for a **UX** reason ahead of a
performance one: a signal-sorted list reordering 8×/sec moves rows out from under
the user's finger. Freezing order while scrolling costs nothing and is what makes
the sort usable at all.

**Cadence alone is not enough.** Raw RSSI swings ±10 dBm, so two devices of
similar strength trade places on *every* recompute no matter how slow it is. The
signal key is therefore quantized to 4 dBm buckets, with the row's previous
position as the tiebreaker inside a bucket.

Bucketing, not an "ignore differences under N" comparator: that comparator is
intransitive (a≈b, b≈c, yet a<c), and `Array.sort` is explicitly undefined for an
inconsistent comparator. Bucket-then-tiebreak stays transitive.

---

## 3. Stack

### Version pinning

SDK 57 pins several of these **behind** their npm `latest` tag. Gesture Handler is
a whole major version apart. Always `npx expo install`.

| Library | npm `latest` | SDK 57 pins |
|---|---|---|
| `react-native-reanimated` | 4.7.0 | **4.5.1** |
| `react-native-gesture-handler` | 3.3.0 | **~2.32.0** |
| `@shopify/react-native-skia` | 2.13.1 | **2.6.2** |
| `react-native-svg` | 15.15.5 | **15.15.4** |

### Install

```bash
npx expo install expo-router react-native-reanimated react-native-worklets \
  react-native-gesture-handler @shopify/react-native-skia \
  expo-haptics @expo/ui expo-linear-gradient expo-system-ui
```

| Layer | Library | Role |
|---|---|---|
| Radar canvas | `@shopify/react-native-skia` 2.6.2 | The differentiator (§4) |
| Motion engine | `react-native-reanimated` 4.5.1 | UI-thread animation |
| Worklets | `react-native-worklets` 0.10.1 | **Separate install**, required by Reanimated 4 |
| Gestures | `react-native-gesture-handler` ~2.32.0 | Pinch radar range, drag cards |
| Touch feel | `expo-haptics` ~57.0.3 | Garnish only — see §5 |
| Chrome | `@expo/ui` ~57.0.21 | Real Jetpack Compose on Android |
| Depth | `expo-linear-gradient` ~57.0.2 | Scrims over the canvas |
| Theme | `expo-system-ui` ~57.0.4 | Required for `userInterfaceStyle` on Android |
| Navigation | `expo-router` ~57.0.24 | Tabs + detail stack; needs an entry-point change, see ARCHITECTURE.md §4 |

Skia 2.6.2 peers (`react >=19`, `react-native >=0.78`, `reanimated >=3.19.1`) are
all satisfied.

### Rejected

| Skip | Use instead |
|---|---|
| `expo-blur` | Nothing — on Android it is only a semi-transparent view, not blur. Blur happens in Skia (§4). |
| `expo-glass-effect` | iOS-only. Revisit if iOS ships. |
| `@gorhom/bottom-sheet` | `@expo/ui` `BottomSheet` |
| `moti` | Reanimated CSS transitions — Moti wraps what we already have |
| `react-native-linear-gradient` | `expo-linear-gradient` |
| Core `Animated` | Reanimated — `useNativeDriver` only handles transform/opacity |
| `react-native-svg` for the radar | Skia. SVG drives updates through React; fine for static icons only |
| Lottie for UI state | Illustration and empty states only, never state indication |

---

## 4. Signal traces in Skia, not a radar

**The radar is removed.** A circle with blips at angles reads as 2D position
however the caption is worded — the *form* made a claim the data cannot support.
BLE gives distance, not bearing, so the display encodes exactly one measured
quantity per device and how it changes.

### Hunt, not a second list

The wall of traces that first replaced the radar was itself cut: a list of
devices with RSSI is what Scanner already is, and a sparkline does not make it a
different screen. Hunt shows **one** device — a dial, a trend state, and its
trace — because finding a specific thing is a different mode, not a different
chart.

| Channel | Encodes | Real? |
|---|---|---|
| Arc fill | smoothed RSSI, fixed −40…−100 scale | **Yes** |
| Trace Y | the same scale | **Yes** |
| Trace X | time, last 20 s | **Yes** |
| — | *no spatial channel exists* | — |

The Y scale is fixed, not per-row auto-scaled: auto-scaling would make rows
incomparable and magnify noise into apparent movement.

History is sampled on a fixed 4 Hz clock, never per packet. Sampling on arrival
would make the x-axis a function of how chattily each device advertises rather
than of time.

Trend compares the mean of the recent half of the window against the older half
and needs 3 dBm to register. Comparing endpoints would report the ±10 dBm noise
floor as movement.

### Why it is still Skia

Trace samples and the dial's fill live in shared values written from a store
subscription, and both paths are rebuilt in worklets — a signal change never
re-renders React. Should a multi-device trace view ever return, it must be a
single `<Canvas>`: one per row is one native surface per device, which is what
kills a list like that.

Trace samples live in shared values written from a store subscription and the
path is rebuilt in a worklet, so a signal change never re-renders React.

**Skia is also the blur.** Platform blur is unavailable on Android, so glow and
bloom are drawn with Skia's GPU blur shaders — real blur, not a fallback, and one
render path instead of per-platform compositing.

---

## 5. Android UI constraints

- **Never animate `elevation`.** Android re-rasterizes the shadow every frame.
  Crossfade a pre-shadowed layer, or draw the shadow in Skia.
- **Haptics are not load-bearing.** Silent on much Android hardware. The visual
  must stand alone. One per commit, never per frame, never on scroll.
- **Refresh rate varies (60/90/120 Hz).** Drive motion from elapsed time; never
  assume a frame interval. iOS needs a `CADisableMinimumFrameDurationOnPhone`
  opt-in for 120 Hz; Android does not.
- **`@expo/ui` `List` is not virtualized** — it is grouped Compose rows. The
  device list is unbounded and updates at 5–20 Hz, so use `FlatList`/`FlashList`.
  Reserve `@expo/ui` for the detail sheet and settings.
- **Ripple only in a Material-styled app.** In a custom-designed app a consistent
  `scale: 0.97` press reads more coherent across platforms.

---

## 6. Motion budget

The trap for an app aiming at "lots of cool animations" is animating the
**chrome**. High-frequency animation makes an app feel slow, not premium.

| Tier | Animate? | Here |
|---|---|---|
| 100+/day | **No** | Tab switches (`animation: 'none'`), list scroll, settings toggles |
| Tens/day | Under 150ms or nothing | Press feedback, row selection |
| Occasional | Standard | Device detail sheet, connect/disconnect |
| Rare | The delight budget | First-detection bloom, empty state, successful pairing |

**Continuous exception:** the range pulses and blip blooms. Not chrome — it is the app's
primary content, a live data display. Legitimately always-on.

Tabs must not slide; tabs are peers, and sliding implies a hierarchy that is not
there.

### Craft rules

- Feedback on press-in, commit on press-out. `scale: 0.97` in 100–150ms.
  Full-width rows highlight their background instead of scaling.
- 48dp minimum touch target; add `hitSlop` rather than growing the visual.
- Springs when a finger was involved (they carry velocity through an
  interruption); timing curves otherwise. Never `ease-in` on UI.
- Never `scale(0)` entrances — `scale(0.95)` + `opacity: 0`.
- Prefer `transform` and `opacity`. Everything else triggers a Yoga pass.
- Reduced motion ships *with* each animation, not after: keep opacity and colour
  changes, drop translation, scale, parallax and overshoot.

### Gotchas

- **Reanimated 4.5.1 rejects raw `'cubic-bezier(...)'` strings.** Use
  `cubicBezier()` from `react-native-reanimated` in CSS-style props, and
  `Easing.bezier()` in `withTiming`.
- Reanimated 4 without `react-native-worklets` installed throws
  `Failed to create a worklet` at runtime.
- `GestureHandlerRootView` must wrap the app or gestures silently do nothing.
- Never `setState` in a gesture or scroll handler.
- `scheduleOnRN` (not the deprecated `runOnJS`), and never per frame — use `onEnd`
  or a `useAnimatedReaction` threshold.
- Shared values via `.get()`/`.set()`; never read or write during render.

---

## 7. Judging feel

**Only a release build on the slowest supported Android counts.** A dev build's JS
thread is slow enough to hide exactly the jank worth finding, and Expo Go is not a
performance environment.

Per animation, check on device: flick it, interrupt it mid-flight, reverse it.
Gesture handoff and haptic timing cannot be judged from code.

---

## 8. Design tokens

Two dark palettes: Graphite — neutral chrome with amber kept for data — and
Night, the original amber CRT. The user picks in Settings; `src/theme/themes.ts`
holds both and `useTheme()` serves the active one.

Every ratio is computed against that palette's own ground — text at 4.5:1,
non-text graphics at 3:1. Three palettes in a row had a first draft whose faint
end failed, so the check now runs before values land.

### Night

| Token | Value | On `bg` |
|---|---|---|
| `bg` | `#0A0705` | deep brown-black |
| `surface` / `surfaceRaised` | `#16100B` / `#211810` | |
| `border` | `#2A1F14` | |
| `textPrimary` | `#F2D9A8` | 14.60 — AAA |
| `textTertiary` | `#A8855A` | 5.90 — AA |
| `signal` | `#FFB224` | 11.14 — AAA |
| bands | `#FDAE26` `#EB9A0F` `#C38418` `#92661C` | 10.77 → 3.96 |

### Graphite (default)

Added after amber-on-brown read as tiring over long sessions, and made the
default after comparing it with Night on the device. Night stays selectable.

| Token | Value | On `bg` |
|---|---|---|
| `bg` | `#121418` | neutral charcoal, 3× Night's luminance |
| `surface` / `surfaceRaised` | `#1A1D21` / `#22262B` | |
| `border` | `#2C3036` | |
| `textPrimary` | `#D5D8DD` | 12.90 — AAA |
| `textSecondary` | `#ABB0B7` | 8.45 |
| `textTertiary` | `#878D95` | 5.51 — AA |
| `signal` | `#FFB224` | 10.22 — AAA |
| bands | Night's ramp, unchanged | 9.89 → 3.63 (3.33 on the track) |

Two levers against glare, neither of them hue: a lifted ground, since
near-black under bright text is what blooms, and primary text pulled from 14.6
to 12.9:1. Grey text alone would not help — `#E5E7EB` sits at the same contrast
as Night's bone. Identity chips are barely tinted (14% saturation) so amber
stays reserved for what is measured.

**No light palette.** Two were built — amber pressed into warm paper, then a
neutral light twin of Graphite — and both were dropped. Amber cannot be bright
on a light ground and stay legible, so it darkens toward brown, and the light
ground compresses the band ramp. The app is dark-only.

Identity-chip hues are constrained to **24–58** so per-device colour stays inside
the amber family in every palette.

### Type

Scale: **11 · 12 · 14 · 15 · 17 · 28**. Numeric readouts use tabular figures: at
8 Hz a proportional face changes glyph widths as digits change, so the value
jitters and the row reflows. Correctness, not style.

### Spacing, radius

Spacing on a 4 grid: **4 · 6 · 8 · 10 · 16 · 24**.
Radius: **3** (chips, meter face) · **10** (controls) · full (pills).

### Native chrome

`NativeTabs` takes its colours from the platform theme — Material blue on
Android — so it is given explicit `backgroundColor`, `tintColor`, `iconColor`,
`labelStyle`, `indicatorColor` and `rippleColor` from the active palette.

---

## 9. Open design decisions

**Resolved**

- **The detail screen is layered for newcomers and experts.** Top to bottom:
  hero (kind icon, name, live dBm) and a one-line plain summary ("Samsung
  watch · near · 3 per second · accepts connections"); the live 20 s trace and
  10 s cadence strip; Hunt; four tiles, each a number with its meaning
  underneath; the broadcast decoded field by field with its AD type code; the
  identity; and the raw packet last, collapsed, annotated by length / type /
  data with a Copy button. Jargon carries an ⓘ that opens an `@expo/ui`
  BottomSheet, so explanations are one tap away without cluttering the screen.
  Fields a device does not send collapse into one "Not broadcast" line, and
  padded duplicate scan records are merged. No beginner/expert switch: the
  layering does that job.
- **The list screen is "Nearby"**, as both tab label and title, so the tab
  predicts the screen it opens. "Scanner" named the tool rather than the
  content, and "Transmitters" was too long for a bottom tab; the word stays in
  the count line ("5 transmitters broadcasting"). Docs keep "Scanner" as the
  internal name.
- **Theme, sort and filters persist** across restarts (ARCHITECTURE.md §3).
  The search text does not: a stale query on launch would hide devices for no
  visible reason. When filters hide everything, the list says so.
- **Favorites, starred only from the detail screen.** Pinned above the sort,
  marked with an amber star, and filterable. Matched by address, then by exact
  broadcast name, because many devices rotate their address; the detail screen
  says which. An unnamed device with a rotating address cannot be recognised
  again, and the detail screen says that when it is starred. Hunt stays
  without a picker.
- **Palettes are user-selectable** in Settings — see §8. Graphite is the default.
- **Hunt reads on a moving-coil meter**, not a progress ring: printed face,
  etched scale, needle on a pivot with a counterweight tail. A needle shows a
  value and its movement in one mark, has no notion of position, and its lag is
  physical rather than decorative.
- **Scanner is organised by cadence** — see §1 and §4.
- **Proximity bands: fixed thresholds** — see §4.
- **Scanner row details.** Cadence ticks sit in a recessed `surface` track, so
  an empty stretch reads as measured silence rather than missing data. The
  column header reads `interval`; the signal value carries its own smaller
  `dBm` unit (`-75 dBm`). A faint `›`
  marks the row as opening the detail screen; Hunt stays one step further, on
  that screen. The vendor joins the id chip (`SAMSUNG·3F2A`) only when the label
  does not already name it, and stays text in the chip colours: no brand logos
  or brand colours.
- **Scanner controls collapse behind one button.** A search field with a leading
  icon and a tune button carrying a count badge. Sort, minimum signal and
  named-only live in a panel that drops in under 150 ms; with the panel closed,
  each active setting shows as a removable pill, so nothing hides state. The
  signal floor is a four-detent segmented control instead of a chip that cycles
  on tap, because four coarse steps are all RSSI supports and a cycling chip
  does not say what the next tap does. Legacy-only sits below a rule: it is a
  scan setting that restarts the radio, not a filter.
- **Device-kind icons, only on evidence.** `src/ble/kind.ts` reads the kind from,
  in order: GAP Appearance (from the raw scan record), the Microsoft CDP
  device-type byte, the Apple message type, service UUIDs, then vendor naming
  conventions (`[TV]`, `Galaxy Watch`, `Buds`). No signal means no icon, never
  a guess. The detail screen names the source (`Watch (from name)`), because
  the last tier is a pattern match rather than a declared value.

**Still open**

- Dense cadence strips merge into a solid block above roughly 10 Hz. Density is
  itself the signal, so this may be correct as-is.
- App name is still a placeholder.
