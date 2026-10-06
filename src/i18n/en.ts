/**
 * Every user-facing string, in English. The pt-BR file is typed against this
 * one, so a key added here and not translated there fails the typecheck.
 *
 * Pure data and pure functions, no imports: the BLE modules and their tests
 * read from it without loading anything native.
 */
export const en = {
  tabs: { nearby: 'Nearby', hunt: 'Hunt', settings: 'Settings' },

  common: {
    tryAgain: 'Try again',
    openSettings: 'Open settings',
    retry: 'Retry',
    cancel: 'Cancel',
    save: 'Save',
    copy: 'Copy',
    copied: 'Copied',
    device: 'Device',
  },

  bands: { immediate: 'immediate', near: 'near', far: 'far', distant: 'distant' },

  kinds: {
    phone: 'Phone',
    tablet: 'Tablet',
    computer: 'Computer',
    tv: 'TV / display',
    watch: 'Watch',
    earbuds: 'Earbuds / headphones',
    speaker: 'Speaker',
    console: 'Game console',
    input: 'Input device',
    tag: 'Tracker tag',
    beacon: 'Beacon',
    health: 'Health / fitness sensor',
  },

  kindSources: {
    appearance: 'Appearance',
    microsoft: 'Microsoft beacon',
    apple: 'Apple message type',
    service: 'service UUID',
    name: 'name',
  },

  /**
   * Labels the app makes up for devices that broadcast no name, keyed by the
   * English label `deriveIdentity` stores. Brand and protocol names (iBeacon,
   * AirDrop, Handoff, Find My…) are not listed and stay as they are.
   */
  generatedLabels: {} as Record<string, string>,

  /** Decoding a raw advertisement for the detail screen. */
  ble: {
    adTypes: {
      0x01: 'Flags',
      0x02: '16-bit service UUIDs (partial)',
      0x03: '16-bit service UUIDs',
      0x04: '32-bit service UUIDs (partial)',
      0x05: '32-bit service UUIDs',
      0x06: '128-bit service UUIDs (partial)',
      0x07: '128-bit service UUIDs',
      0x08: 'Short name',
      0x09: 'Complete name',
      0x0a: 'Tx power level',
      0x14: '16-bit solicited services',
      0x15: '128-bit solicited services',
      0x16: 'Service data (16-bit UUID)',
      0x19: 'Appearance',
      0x1b: 'LE device address',
      0x20: 'Service data (32-bit UUID)',
      0x21: 'Service data (128-bit UUID)',
      0x24: 'URI',
      0xff: 'Manufacturer data',
    } as Record<number, string>,
    unknownType: (hex: string) => `Unknown type 0x${hex}`,
    flags: {
      limited: 'limited discoverable',
      general: 'discoverable',
      leOnly: 'BLE only',
      classic: 'also Classic Bluetooth',
    },
    category: 'Category',
    unlistedCompany: 'Unlisted company',
  },

  scanErrors: {
    poweredOff: 'Bluetooth is off. Turn it on to keep scanning.',
    unauthorized: 'The app is no longer allowed to use Bluetooth. Check its permissions in Settings.',
    locationOff: 'Location is off. This phone needs it switched on to scan.',
    resetting: 'Bluetooth is restarting. Scanning will resume on its own.',
    startFailed: 'The phone could not start scanning. It will try again shortly.',
    other: 'Scanning stopped unexpectedly. It will try again shortly.',
  },

  gate: {
    checking: { eyebrow: 'starting', title: 'Checking Bluetooth', body: 'One moment.' },
    transient: {
      eyebrow: 'restarting',
      title: 'Bluetooth is restarting',
      body: 'The adapter is resetting. This clears on its own.',
    },
    permissionDenied: {
      eyebrow: 'permission',
      title: 'Nearby devices permission needed',
      body: 'Scanning for Bluetooth devices requires permission. Nothing is sent anywhere — the scan is passive and stays on this device.',
    },
    permissionBlocked: {
      eyebrow: 'permission',
      title: 'Permission blocked',
      body: 'Android will not ask again, so this has to be changed in system settings. Enable Nearby devices, then come back.',
    },
    bluetoothOff: {
      eyebrow: 'bluetooth off',
      title: 'Bluetooth is off',
      body: 'Turn Bluetooth on to scan for nearby devices.',
      action: 'Turn on Bluetooth',
    },
    locationOff: {
      eyebrow: 'location off',
      title: 'Location services are off',
      body: 'On this version of Android, Bluetooth scanning needs location services switched on. Your location is never used or stored — Android just requires it.',
    },
    unauthorized: {
      eyebrow: 'not authorised',
      title: 'Bluetooth is not authorised',
      body: 'This app is not allowed to use Bluetooth. Grant access in system settings.',
    },
    unsupported: {
      eyebrow: 'unsupported',
      title: 'No Bluetooth LE',
      body: 'This device does not support Bluetooth Low Energy, so it cannot scan.',
    },
  },

  crash: {
    eyebrow: 'something broke',
    title: (app: string) => `${app} hit an error`,
    fallback: 'An unexpected error stopped this screen.',
    copyDetails: 'Copy error details',
  },

  scanToggle: {
    scanning: 'Scanning',
    paused: 'Paused',
    pause: 'Pause scanning',
    resume: 'Resume scanning',
  },

  nearby: {
    title: 'Nearby',
    filteredCount: (shown: number, total: number) => `${shown} of ${total}`,
    count: (total: number) =>
      `${total} ${total === 1 ? 'transmitter' : 'transmitters'} broadcasting`,
    snapshotHeld: 'Snapshot held',
    listening: {
      eyebrow: 'listening',
      title: 'Nothing broadcasting yet',
      hint: 'Devices appear the moment they advertise. Slow ones send a packet every few seconds.',
    },
    paused: {
      eyebrow: 'paused',
      title: 'Scanning paused',
      hint: 'Resume to pick the air back up.',
      action: 'Resume scanning',
    },
    filtered: {
      eyebrow: (hidden: number) => `${hidden} hidden`,
      title: 'Nothing matches',
      hint: 'The active filters hide every device in range.',
      action: 'Clear filters',
    },
  },

  filters: {
    search: 'Search name or address',
    searchLabel: 'Search devices',
    clearSearch: 'Clear search',
    button: (active: number) => (active > 0 ? `Filters, ${active} active` : 'Filters'),
    remove: (label: string) => `Remove ${label}`,
    sortBy: 'Sort by',
    sortSignal: 'Signal',
    sortName: 'Name',
    minSignal: 'Minimum signal, dBm',
    minSignalLabel: 'Minimum signal',
    any: 'Any',
    favoritesOnly: 'Favorites only',
    namedOnly: 'Named devices only',
    legacyOnly: 'Legacy advertising only',
    legacyHint: 'Bluetooth 4.x. Restarts the scan and clears the list.',
    pillFavorites: 'Favorites',
    pillNamed: 'Named only',
    pillLegacy: 'Legacy 4.x',
    pillByName: 'By name',
  },

  list: {
    axisDevice: 'device',
    axisWindow: 'broadcasts · 10s',
    axisUnits: 'rate · signal',
    rowLabel: (parts: {
      favorite: boolean;
      label: string;
      kind: string | null;
      dbm: number;
      interval: string;
    }) =>
      `${parts.favorite ? 'Favorite, ' : ''}${parts.label}${parts.kind ? `, ${parts.kind}` : ''}, ${parts.dbm} dBm, every ${parts.interval}`,
    rowHint: 'Opens device details',
  },

  detail: {
    outOfRange: 'Out of range',
    dropped: 'This device stopped advertising and was dropped from the scan.',
    live: 'live',
    notHeard: 'not heard recently',
    huntThis: 'Hunt this device',
    footnote: 'Passive scan only. Nothing here required connecting to the device.',
    addFavorite: 'Add to favorites',
    removeFavorite: 'Remove from favorites',
    favoriteNote:
      'This device broadcasts no name. If it changes its address, as phones and Apple devices do every few minutes, it will not be recognised as a favorite.',
    acceptsConnections: 'accepts connections',
    broadcastOnly: 'broadcast only',
    /** "Samsung watch": vendor, then the kind in lower case. */
    vendorKind: (vendor: string, kind: string) => `${vendor} ${kind.toLowerCase()}`,
    identity: 'Identity',
    address: 'Address',
    name: 'Name',
    localName: 'Local name',
    vendor: 'Vendor',
    kind: 'Kind',
    favorite: 'Favorite',
    notIdentified: 'Not identified',
    kindFrom: (kind: string, source: string) => `${kind}, from ${source}`,
    no: 'No',
    yes: 'Yes',
    matchedByName: (id: string) => `Yes, matched by name (saved as ${id})`,
    liveLabel: 'signal and broadcasts',
    secondsAgo: (seconds: number) => `${seconds} s ago`,
    now: 'now',
    trend: { approaching: 'getting stronger', receding: 'getting weaker', steady: 'steady' },
    duration: (seconds: number) => {
      if (seconds < 60) return `${seconds} s`;
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes} min ${seconds % 60} s`;
      return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
    },
    rate: (interval: number | null) => {
      if (interval === null) return 'not enough packets yet';
      if (interval < 1000) return `${Math.max(1, Math.round(1000 / interval))} per second`;
      return `once every ${(interval / 1000).toFixed(1)} s`;
    },
    since: (time: string) => `since ${time}`,
    received: 'broadcasts received',
    broadcasting: 'What it is broadcasting',
    connections: 'Connections',
    acceptsConnectionsTitle: 'Accepts connections',
    broadcastOnlyTitle: 'Broadcast only',
    notBroadcast: (fields: string) => `Not broadcast: ${fields}`,
    notable: {
      name: 'name',
      manufacturer: 'manufacturer data',
      category: 'category',
      services: 'services',
      txPower: 'Tx power',
    },
    rawPacket: 'Raw packet',
    hide: 'Hide',
    showBytes: 'Show bytes',
    legendLength: 'length',
    legendType: 'type',
    legendData: 'data',
    packetHead: (index: number, total: number, bytes: number) =>
      `${total > 1 ? `Variant ${index + 1} of ${total}` : 'Packet'} · ${bytes} bytes`,
    copyHex: 'Copy packet hex',
    padding: (bytes: number) => `+ ${bytes} zero bytes of padding added by Android`,
  },

  glossary: {
    whatIs: (title: string) => `What is ${title}?`,
    signal: {
      title: 'Signal strength (dBm)',
      body:
        'How strongly this phone hears the device, in decibel-milliwatts. Closer to zero is stronger: −45 is right next to you, −90 is barely audible.\n\n' +
        'It is not a distance by itself. Walls, bodies and the way a device is held all change it, so this screen shows a band (immediate, near, far, distant) and whether the signal is rising or falling. Hunt turns it into an approximate distance.',
    },
    interval: {
      title: 'Advertising interval',
      body:
        'How often the device announces itself. Every Bluetooth LE device repeats a short broadcast on a fixed rhythm, from 20 ms (50 times a second) to over 10 seconds.\n\n' +
        'The rhythm says a lot: beacons and devices being paired shout fast, trackers and sensors whisper slowly to save battery.',
    },
    seen: {
      title: 'Seen for',
      body: 'How long this phone has been hearing the device without a gap long enough to drop it from the list.',
    },
    packets: {
      title: 'Packets',
      body: 'How many broadcasts this phone has received from the device since it first appeared. Some broadcasts are always missed; Bluetooth scanning listens on one channel at a time.',
    },
    cadence: {
      title: 'Live signal and rhythm',
      body:
        'Both rows cover the last 10 seconds, with now on the right.\n\n' +
        'The line is the signal strength: higher is stronger. Each tick below it is one broadcast received, at the moment it arrived. A solid block means the device broadcasts faster than the eye can separate.',
    },
    address: {
      title: 'Address',
      body: 'The hardware address the device is broadcasting under. Phones, Apple devices and many others change it every few minutes on purpose, so they cannot be tracked. When that happens, the same device appears as a new entry.',
    },
    advertisement: {
      title: 'What it is broadcasting',
      body:
        'Everything on this screen comes from the device’s public broadcast. The app never connects to it.\n\n' +
        'A broadcast is made of small labelled fields: a name, the manufacturer, a category, the services it offers. Each row here is one of those fields, decoded. The code next to it (0x09, 0xFF…) is the field’s official type number.',
    },
    connectable: {
      title: 'Accepts connections',
      body: 'Whether the device lets other devices connect to it, for pairing or exchanging data. Broadcast-only devices, like beacons and many trackers, only ever announce themselves. This app does not connect either way.',
    },
    packet: {
      title: 'Raw packet',
      body:
        'The broadcast exactly as received, byte by byte. It is a run of fields, each one written as: a length byte, a type byte, then the data.\n\n' +
        'Android pads the packet with zeros to its full size; that padding is not part of what the device sent.',
    },
    distance: {
      title: 'Distance estimate',
      body:
        'An approximate figure from signal strength, never an exact one, with the range it is likely in underneath. Walls and bodies can make a device seem further away.\n\n' +
        'Signal strength has no direction. Walk, and watch whether the distance shrinks.\n\n' +
        '"Uncalibrated" means the device does not say how strong it is, so the figure can be off by 2–3 times. To fix it, hold the phone still, 1 m from the device, for 5 seconds and tap "Calibrate at 1 m".\n\n' +
        'Without calibration, still follow the trend: a shrinking distance and WARMER mean you are getting closer.',
    },
  },

  hunt: {
    title: 'Hunt',
    empty: {
      eyebrow: 'no target',
      title: 'Pick something to hunt',
      hint: 'Open a device in Nearby and choose “Hunt this device”.',
      action: 'Browse Nearby',
    },
    lost: {
      eyebrow: 'signal lost',
      title: 'Lost',
      hint: 'This device stopped advertising. Walk back toward where it was last strong.',
    },
    trend: { approaching: '▲  WARMER', receding: '▼  COLDER', steady: '↔  HOLDING' },
    calibration: {
      user: 'Calibrated',
      ibeacon: 'Beacon',
      'tx-power': 'Tx power',
      default: 'Uncalibrated',
    },
    likely: (range: string) => `approximate · likely ${range} m`,
    a11yDistance: (approx: string, range: string) =>
      `Approximately ${approx} metres, likely ${range} metres`,
    signalLabel: (seconds: number) => `signal · last ${seconds} s`,
    strongest: 'strongest',
    strongestAgo: (seconds: number) => `strongest · ${seconds} s ago`,
    calibrate: 'Calibrate at 1 m',
    recalibrate: 'Recalibrate',
    a11yAt1m: (dbm: number) => `${dbm} dBm at 1 metre`,
    hint: 'No direction — walk, and watch the distance shrink.',
    calibrateAlert: {
      notEnoughTitle: 'Not enough signal yet',
      notEnoughBody: (seconds: number) =>
        `Keep the phone 1 m from the device for ${seconds} seconds, then try again.`,
      remove: 'Remove calibration',
      tooStrong:
        '\n\nThat is stronger than most devices read at 1 m. If the phone was closer, every distance will read too far.',
      tooWeak:
        '\n\nThat is weaker than most devices read at 1 m. If something was in the way, every distance will read too close.',
      rotating:
        '\n\nThis device broadcasts no name. If it changes its address, the calibration is lost.',
      title: 'Calibrate at 1 m',
      body: (label: string, seconds: number, dbm: number) =>
        `Is the phone 1 m from ${label}, and has it been for the last ${seconds} seconds?\n\nThe signal there was ${dbm} dBm. It becomes this device's strength at 1 m.`,
    },
  },

  settings: {
    title: 'Settings',
    theme: 'Theme',
    themes: {
      graphite: {
        title: 'Graphite',
        blurb: 'Neutral greys, amber only for signal. Easier on the eyes for long sessions.',
      },
      night: { title: 'Night', blurb: 'Amber on deep brown-black. Best indoors and after dark.' },
    },
    language: 'Language',
    languages: { system: 'System default', en: 'English', 'pt-BR': 'Português (Brasil)' },
    systemHint: (name: string) => `Follows the phone: ${name}`,
  },
};

export type Strings = typeof en;
