import type { Strings } from './en';

/** Decimal comma, as Brazilian Portuguese writes it. */
const dec = (value: string) => value.replace('.', ',');

/**
 * Brazilian Portuguese. Typed against `en`, so every key must be here.
 *
 * Localised, not translated word for word, in the voice of a bench
 * instrument: technical, direct, no slang. Protocol and engineering terms
 * stay in English, as Brazilian engineers use them: BLE, RSSI, dBm, UUID,
 * MAC Address, Advertising, Broadcast, Packet, Payload, Beacon, Tx Power,
 * Service Data, Manufacturer Data. Brand and product names never change.
 * "Escanear" / "scan", never "digitalizar". Buttons, tabs and badges stay
 * short: Portuguese runs longer, and a truncated label is worse than a terse one.
 */
export const ptBR: Strings = {
  tabs: { nearby: 'Por perto', hunt: 'Localizar', settings: 'Ajustes' },

  common: {
    tryAgain: 'Tentar de novo',
    openSettings: 'Abrir configurações',
    retry: 'Repetir',
    cancel: 'Cancelar',
    save: 'Salvar',
    copy: 'Copiar',
    copied: 'Copiado',
    device: 'Dispositivo',
  },

  bands: { immediate: 'imediato', near: 'perto', far: 'longe', distant: 'distante' },

  kinds: {
    phone: 'Celular',
    tablet: 'Tablet',
    computer: 'Computador',
    tv: 'TV / display',
    watch: 'Relógio',
    earbuds: 'Fones de ouvido',
    speaker: 'Caixa de som',
    console: 'Console de games',
    input: 'Periférico de entrada',
    tag: 'Tag rastreadora',
    beacon: 'Beacon',
    health: 'Sensor de saúde / fitness',
  },

  kindSources: {
    appearance: 'Appearance',
    microsoft: 'Microsoft Beacon',
    apple: 'tipo de mensagem Apple',
    service: 'Service UUID',
    name: 'nome',
  },

  generatedLabels: {
    'Unknown device': 'Dispositivo desconhecido',
    'Apple device nearby': 'Dispositivo Apple próximo',
    'Proximity tag': 'Tag de proximidade',
    'Heart rate monitor': 'Monitor cardíaco',
    'Battery service': 'Battery Service',
    'Input device': 'Periférico de entrada',
    'Fitness machine': 'Aparelho fitness',
    'Eddystone beacon': 'Eddystone Beacon',
    'Exposure notification': 'Notificação de exposição',
    'HomeKit accessory': 'Acessório HomeKit',
    'AirPlay target': 'AirPlay (receptor)',
    'AirPlay source': 'AirPlay (emissor)',
    'Tethering target': 'Acesso Pessoal (cliente)',
    'Tethering source': 'Acesso Pessoal (host)',
    'Nearby action': 'Nearby Action',
  },

  ble: {
    adTypes: {
      0x01: 'Flags',
      0x02: 'Service UUIDs 16-bit (parcial)',
      0x03: 'Service UUIDs 16-bit',
      0x04: 'Service UUIDs 32-bit (parcial)',
      0x05: 'Service UUIDs 32-bit',
      0x06: 'Service UUIDs 128-bit (parcial)',
      0x07: 'Service UUIDs 128-bit',
      0x08: 'Nome curto',
      0x09: 'Nome completo',
      0x0a: 'Tx Power Level',
      0x14: 'Service Solicitation 16-bit',
      0x15: 'Service Solicitation 128-bit',
      0x16: 'Service Data (UUID 16-bit)',
      0x19: 'Appearance',
      0x1b: 'Endereço LE',
      0x20: 'Service Data (UUID 32-bit)',
      0x21: 'Service Data (UUID 128-bit)',
      0x24: 'URI',
      0xff: 'Manufacturer Data',
    },
    unknownType: (hex) => `Tipo desconhecido 0x${hex}`,
    flags: {
      limited: 'detectável (limitado)',
      general: 'detectável',
      leOnly: 'só BLE',
      classic: 'também Bluetooth Classic',
    },
    category: 'Categoria',
    unlistedCompany: 'Fabricante não listado',
  },

  scanErrors: {
    poweredOff: 'Bluetooth desligado. Ligue para continuar o scan.',
    unauthorized: 'O app perdeu a permissão de Bluetooth. Verifique nas configurações.',
    locationOff: 'Localização desligada. Este aparelho exige a localização para escanear.',
    resetting: 'Bluetooth reiniciando. O scan retoma sozinho.',
    startFailed: 'Falha ao iniciar o scan. Nova tentativa em instantes.',
    other: 'O scan parou inesperadamente. Nova tentativa em instantes.',
  },

  gate: {
    checking: { eyebrow: 'iniciando', title: 'Verificando o Bluetooth', body: 'Um instante.' },
    transient: {
      eyebrow: 'reiniciando',
      title: 'Bluetooth reiniciando',
      body: 'O adaptador está sendo reiniciado. Isso se resolve sozinho.',
    },
    permissionDenied: {
      eyebrow: 'permissão',
      title: 'Permissão necessária',
      body: 'Para escanear dispositivos Bluetooth, o app precisa da permissão Dispositivos por perto. O scan é passivo e nada sai deste aparelho.',
    },
    permissionBlocked: {
      eyebrow: 'permissão',
      title: 'Permissão bloqueada',
      body: 'O Android não vai perguntar de novo. Ative Dispositivos por perto nas configurações do sistema e volte.',
    },
    bluetoothOff: {
      eyebrow: 'bluetooth off',
      title: 'Bluetooth desligado',
      body: 'Ligue o Bluetooth para escanear dispositivos por perto.',
      action: 'Ligar Bluetooth',
    },
    locationOff: {
      eyebrow: 'localização off',
      title: 'Localização desligada',
      body: 'Nesta versão do Android, o scan Bluetooth exige a localização ligada. Sua localização nunca é usada nem armazenada: é uma exigência do sistema.',
    },
    unauthorized: {
      eyebrow: 'sem autorização',
      title: 'Bluetooth não autorizado',
      body: 'Este app não tem acesso ao Bluetooth. Libere nas configurações do sistema.',
    },
    unsupported: {
      eyebrow: 'incompatível',
      title: 'Sem suporte a BLE',
      body: 'Este aparelho não tem Bluetooth Low Energy e não consegue escanear.',
    },
  },

  crash: {
    eyebrow: 'erro',
    title: (app) => `O ${app} encontrou um erro`,
    fallback: 'Um erro inesperado interrompeu esta tela.',
    copyDetails: 'Copiar detalhes do erro',
  },

  scanToggle: {
    scanning: 'Escaneando',
    paused: 'Pausado',
    pause: 'Pausar scan',
    resume: 'Retomar scan',
  },

  nearby: {
    title: 'Por perto',
    filteredCount: (shown, total) => `${shown} de ${total}`,
    count: (total) => `${total} ${total === 1 ? 'dispositivo ativo' : 'dispositivos ativos'}`,
    snapshotHeld: 'Snapshot congelado',
    listening: {
      eyebrow: 'escutando',
      title: 'Nenhum broadcast ainda',
      hint: 'Os dispositivos aparecem no primeiro advertising. Os mais lentos enviam um packet a cada poucos segundos.',
    },
    paused: {
      eyebrow: 'pausado',
      title: 'Scan pausado',
      hint: 'Retome para voltar a escutar.',
      action: 'Retomar scan',
    },
    filtered: {
      eyebrow: (hidden) => `${hidden} ${hidden === 1 ? 'oculto' : 'ocultos'}`,
      title: 'Nenhum resultado',
      hint: 'Os filtros ativos ocultam todos os dispositivos ao alcance.',
      action: 'Limpar filtros',
    },
  },

  filters: {
    search: 'Buscar nome ou MAC',
    searchLabel: 'Buscar dispositivos',
    clearSearch: 'Limpar busca',
    button: (active) => (active > 0 ? `Filtros, ${active} ativos` : 'Filtros'),
    remove: (label) => `Remover ${label}`,
    sortBy: 'Ordenar por',
    sortSignal: 'Sinal',
    sortName: 'Nome',
    minSignal: 'RSSI mínimo, dBm',
    minSignalLabel: 'RSSI mínimo',
    any: 'Todos',
    favoritesOnly: 'Só favoritos',
    namedOnly: 'Só com nome',
    legacyOnly: 'Só legacy advertising',
    legacyHint: 'Bluetooth 4.x. Reinicia o scan e limpa a lista.',
    pillFavorites: 'Favoritos',
    pillNamed: 'Com nome',
    pillLegacy: 'Legacy 4.x',
    pillByName: 'Por nome',
  },

  list: {
    axisDevice: 'dispositivo',
    axisWindow: 'broadcasts · 10s',
    axisUnits: 'intervalo · RSSI',
    rowLabel: ({ favorite, label, kind, dbm, interval }) =>
      `${favorite ? 'Favorito, ' : ''}${label}${kind ? `, ${kind}` : ''}, ${dbm} dBm, a cada ${interval}`,
    rowHint: 'Abre os detalhes do dispositivo',
  },

  detail: {
    outOfRange: 'Fora de alcance',
    dropped: 'Este dispositivo parou de anunciar e saiu do scan.',
    live: 'ao vivo',
    notHeard: 'sem sinal recente',
    huntThis: 'Localizar dispositivo',
    footnote: 'Scan passivo. Nenhum dado aqui exigiu conexão com o dispositivo.',
    addFavorite: 'Adicionar aos favoritos',
    removeFavorite: 'Remover dos favoritos',
    favoriteNote:
      'Este dispositivo não transmite nome. Se o MAC Address mudar, como celulares e aparelhos Apple fazem a cada poucos minutos, ele deixa de ser reconhecido como favorito.',
    acceptsConnections: 'aceita conexões',
    broadcastOnly: 'só broadcast',
    vendorKind: (vendor, kind) => `${kind.toLowerCase()} ${vendor}`,
    identity: 'Identificação',
    address: 'MAC Address',
    name: 'Nome',
    localName: 'Local name',
    vendor: 'Fabricante',
    kind: 'Tipo',
    favorite: 'Favorito',
    notIdentified: 'Não identificado',
    kindFrom: (kind, source) => `${kind}, via ${source}`,
    no: 'Não',
    yes: 'Sim',
    matchedByName: (id) => `Sim, reconhecido pelo nome (salvo como ${id})`,
    liveLabel: 'RSSI e broadcasts',
    secondsAgo: (seconds) => `-${seconds} s`,
    now: 'agora',
    trend: { approaching: 'subindo', receding: 'caindo', steady: 'estável' },
    duration: (seconds) => {
      if (seconds < 60) return `${seconds} s`;
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes} min ${seconds % 60} s`;
      return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
    },
    rate: (interval) => {
      if (interval === null) return 'packets insuficientes';
      if (interval < 1000) return `${Math.max(1, Math.round(1000 / interval))} por segundo`;
      return `1 a cada ${dec((interval / 1000).toFixed(1))} s`;
    },
    since: (time) => `desde ${time}`,
    received: 'broadcasts recebidos',
    broadcasting: 'Advertisement Data',
    connections: 'Conexões',
    acceptsConnectionsTitle: 'Aceita conexões',
    broadcastOnlyTitle: 'Só broadcast',
    notBroadcast: (fields) => `Ausente no advertising: ${fields}`,
    notable: {
      name: 'nome',
      manufacturer: 'Manufacturer Data',
      category: 'categoria',
      services: 'serviços',
      txPower: 'Tx Power',
    },
    rawPacket: 'Packet bruto',
    hide: 'Ocultar',
    showBytes: 'Ver bytes',
    legendLength: 'tamanho',
    legendType: 'tipo',
    legendData: 'dados',
    packetHead: (index, total, bytes) =>
      `${total > 1 ? `Variante ${index + 1} de ${total}` : 'Packet'} · ${bytes} bytes`,
    copyHex: 'Copiar hex dump',
    padding: (bytes) => `+ ${bytes} bytes de padding (zeros) adicionados pelo Android`,
  },

  glossary: {
    whatIs: (title) => `O que é ${title}?`,
    signal: {
      title: 'RSSI (dBm)',
      body:
        'Intensidade com que este celular recebe o dispositivo, em decibel-miliwatts. Quanto mais perto de zero, mais forte: −45 é colado em você, −90 está no limite da recepção.\n\n' +
        'RSSI não é distância. Paredes, pessoas e a posição do aparelho alteram o valor, por isso esta tela mostra uma faixa (imediato, perto, longe, distante) e se o sinal está subindo ou caindo. A tela Localizar converte o RSSI em uma distância aproximada.',
    },
    interval: {
      title: 'Advertising interval',
      body:
        'Frequência com que o dispositivo se anuncia. Todo dispositivo BLE repete um broadcast curto em ritmo fixo, de 20 ms (50 vezes por segundo) a mais de 10 segundos.\n\n' +
        'O ritmo é revelador: beacons e dispositivos em pareamento anunciam rápido; rastreadores e sensores anunciam devagar para economizar bateria.',
    },
    seen: {
      title: 'Tempo visível',
      body: 'Há quanto tempo este celular recebe o dispositivo sem uma interrupção longa o bastante para removê-lo da lista.',
    },
    packets: {
      title: 'Packets',
      body: 'Quantos broadcasts este celular recebeu do dispositivo desde que ele apareceu. Sempre há perdas: o scan BLE escuta um canal de advertising por vez.',
    },
    cadence: {
      title: 'Sinal e cadência ao vivo',
      body:
        'As duas faixas cobrem os últimos 10 segundos, com o momento atual à direita.\n\n' +
        'A linha é o RSSI: mais alto, mais forte. Cada traço abaixo é um broadcast recebido, no instante em que chegou. Um bloco sólido indica que o dispositivo anuncia mais rápido do que o olho consegue distinguir.',
    },
    address: {
      title: 'MAC Address',
      body: 'O endereço com que o dispositivo está anunciando. Celulares, aparelhos Apple e muitos outros trocam esse endereço a cada poucos minutos, de propósito, para evitar rastreamento. Quando isso acontece, o mesmo dispositivo aparece como um item novo.',
    },
    advertisement: {
      title: 'Advertisement Data',
      body:
        'Tudo nesta tela vem do advertising público do dispositivo. O app nunca se conecta a ele.\n\n' +
        'Um advertisement é formado por campos curtos: nome, fabricante, categoria, serviços oferecidos. Cada linha aqui é um desses campos, decodificado. O código ao lado (0x09, 0xFF…) é o tipo do campo (AD type) definido pela especificação.',
    },
    connectable: {
      title: 'Aceita conexões',
      body: 'Indica se o dispositivo aceita conexões de outros aparelhos, para pareamento ou troca de dados. Dispositivos só de broadcast, como beacons e muitos rastreadores, apenas se anunciam. Este app nunca se conecta, em nenhum caso.',
    },
    packet: {
      title: 'Packet bruto',
      body:
        'O advertisement exatamente como foi recebido, byte a byte. É uma sequência de campos, cada um no formato: um byte de tamanho, um byte de tipo e o payload.\n\n' +
        'O Android completa o packet com zeros até o tamanho máximo; esse padding não faz parte do que o dispositivo enviou.',
    },
    distance: {
      title: 'Estimativa de distância',
      body:
        'Um valor aproximado calculado a partir do RSSI, nunca exato, com a faixa provável logo abaixo. Paredes e pessoas no caminho fazem o dispositivo parecer mais distante.\n\n' +
        'RSSI não indica direção. Caminhe e observe se a distância diminui.\n\n' +
        '"Sem calibrar" significa que o dispositivo não informa a própria potência (Tx Power), então o valor pode errar por um fator de 2 a 3. Para corrigir, mantenha o celular parado a 1 m do dispositivo por 5 segundos e toque em "Calibrar a 1 m".\n\n' +
        'Mesmo sem calibração, siga a tendência: distância diminuindo e APROXIMANDO indicam que você está chegando perto.',
    },
  },

  hunt: {
    title: 'Localizar',
    empty: {
      eyebrow: 'sem alvo',
      title: 'Nenhum alvo selecionado',
      hint: 'Abra um dispositivo em Por perto e toque em “Localizar dispositivo”.',
      action: 'Abrir Por perto',
    },
    lost: {
      eyebrow: 'sem sinal',
      title: 'Sinal perdido',
      hint: 'O dispositivo parou de anunciar. Volte até onde o sinal estava mais forte.',
    },
    trend: { approaching: '▲  APROXIMANDO', receding: '▼  AFASTANDO', steady: '↔  ESTÁVEL' },
    calibration: {
      user: 'Calibrado',
      ibeacon: 'Beacon',
      'tx-power': 'Tx Power',
      default: 'Sem calibrar',
    },
    likely: (range) => `aproximado · faixa provável ${range} m`,
    a11yDistance: (approx, range) =>
      `Aproximadamente ${approx} metros, faixa provável de ${range} metros`,
    signalLabel: (seconds) => `RSSI · últimos ${seconds} s`,
    strongest: 'pico',
    strongestAgo: (seconds) => `pico · há ${seconds} s`,
    calibrate: 'Calibrar a 1 m',
    recalibrate: 'Recalibrar',
    a11yAt1m: (dbm) => `${dbm} dBm a 1 metro`,
    hint: 'Sem direção: caminhe e observe a distância diminuir.',
    calibrateAlert: {
      notEnoughTitle: 'Sinal insuficiente',
      notEnoughBody: (seconds) =>
        `Mantenha o celular a 1 m do dispositivo por ${seconds} segundos e tente de novo.`,
      remove: 'Remover calibração',
      tooStrong:
        '\n\nValor acima do que a maioria dos dispositivos registra a 1 m. Se o celular estava mais perto, todas as distâncias vão aparecer maiores do que são.',
      tooWeak:
        '\n\nValor abaixo do que a maioria dos dispositivos registra a 1 m. Se havia algo no caminho, todas as distâncias vão aparecer menores do que são.',
      rotating:
        '\n\nEste dispositivo não transmite nome. Se o MAC Address mudar, a calibração se perde.',
      title: 'Calibrar a 1 m',
      body: (label, seconds, dbm) =>
        `O celular está a 1 m de ${label} há pelo menos ${seconds} segundos?\n\nO RSSI medido foi ${dbm} dBm. Ele passa a ser a referência de 1 m deste dispositivo.`,
    },
  },

  settings: {
    title: 'Ajustes',
    theme: 'Tema',
    themes: {
      graphite: {
        title: 'Grafite',
        blurb: 'Cinzas neutros, âmbar só no sinal. Mais confortável em sessões longas.',
      },
      night: {
        title: 'Noite',
        blurb: 'Âmbar sobre fundo marrom-escuro. Ideal para ambientes internos e à noite.',
      },
    },
    language: 'Idioma',
    languages: { system: 'Padrão do sistema', en: 'English', 'pt-BR': 'Português (Brasil)' },
    systemHint: (name) => `Segue o idioma do aparelho: ${name}`,
  },
};
