# Kodo: all app text, English and Brazilian Portuguese

Kodo is an Android app (React Native) that passively scans Bluetooth Low Energy (BLE) devices. Screens: **Nearby** (live list of devices broadcasting, with RSSI and advertising interval), a **device detail** screen (decoded advertisement data, raw packet), **Hunt** ("Localizar" in pt-BR: approximate distance to one device from RSSI, with range rings and a WARMER/COLDER-style trend) and **Settings** (theme, language). It never connects to devices; nothing leaves the phone.

How to read this file:
- Each section groups keys by screen or feature. Keys are the identifiers in the code (`src/i18n/en.ts`, `src/i18n/pt-BR.ts`).
- Strings that take values are shown once per sample call, with the arguments used: `{name}` marks text inserted at runtime (device names, times), numbers are sample values.
- `\n` is a line break. `·` is a separator used in the UI. Device names, brand names and protocol terms in pt-BR are deliberately left in English (BLE, RSSI, dBm, UUID, MAC Address, Advertising, Broadcast, Packet, Tx Power, Manufacturer Data).
- `generatedLabels` are names the app gives to devices that broadcast none; English shows the key itself.
- Space is tight on tabs, buttons, pills and tiles (a phone ~360–410 dp wide); some tiles use a monospace font.

## tabs

| key | English | Português (Brasil) |
|---|---|---|
| `tabs.nearby` | Nearby | Por perto |
| `tabs.hunt` | Hunt | Localizar |
| `tabs.settings` | Settings | Configurações |
## common

| key | English | Português (Brasil) |
|---|---|---|
| `common.tryAgain` | Try again | Tentar novamente |
| `common.openSettings` | Open settings | Abrir configurações |
| `common.retry` | Retry | Repetir |
| `common.cancel` | Cancel | Cancelar |
| `common.save` | Save | Salvar |
| `common.copy` | Copy | Copiar |
| `common.copied` | Copied | Copiado |
| `common.device` | Device | Dispositivo |
## bands

| key | English | Português (Brasil) |
|---|---|---|
| `bands.immediate` | immediate | imediato |
| `bands.near` | near | perto |
| `bands.far` | far | longe |
| `bands.distant` | distant | distante |
## kinds

| key | English | Português (Brasil) |
|---|---|---|
| `kinds.phone` | Phone | Celular |
| `kinds.tablet` | Tablet | Tablet |
| `kinds.computer` | Computer | Computador |
| `kinds.tv` | TV / display | TV / display |
| `kinds.watch` | Watch | Relógio |
| `kinds.earbuds` | Earbuds / headphones | Fones de ouvido |
| `kinds.speaker` | Speaker | Caixa de som |
| `kinds.console` | Game console | Console de games |
| `kinds.input` | Input device | Periférico de entrada |
| `kinds.tag` | Tracker tag | Tag rastreadora |
| `kinds.beacon` | Beacon | Beacon |
| `kinds.health` | Health / fitness sensor | Sensor de saúde / fitness |
## kindSources

| key | English | Português (Brasil) |
|---|---|---|
| `kindSources.appearance` | Appearance | Appearance |
| `kindSources.microsoft` | Microsoft beacon | Microsoft Beacon |
| `kindSources.apple` | Apple message type | Tipo de mensagem Apple |
| `kindSources.service` | service UUID | Service UUID |
| `kindSources.name` | name | Nome |
## ble

| key | English | Português (Brasil) |
|---|---|---|
| `ble.adTypes.0x01` | Flags | Flags |
| `ble.adTypes.0x02` | 16-bit service UUIDs (partial) | Service UUIDs 16-bit (parcial) |
| `ble.adTypes.0x03` | 16-bit service UUIDs | Service UUIDs 16-bit |
| `ble.adTypes.0x04` | 32-bit service UUIDs (partial) | Service UUIDs 32-bit (parcial) |
| `ble.adTypes.0x05` | 32-bit service UUIDs | Service UUIDs 32-bit |
| `ble.adTypes.0x06` | 128-bit service UUIDs (partial) | Service UUIDs 128-bit (parcial) |
| `ble.adTypes.0x07` | 128-bit service UUIDs | Service UUIDs 128-bit |
| `ble.adTypes.0x08` | Short name | Nome curto |
| `ble.adTypes.0x09` | Complete name | Nome completo |
| `ble.adTypes.0x0a` | Tx power level | Tx Power Level |
| `ble.adTypes.0x14` | 16-bit solicited services | Service Solicitation 16-bit |
| `ble.adTypes.0x15` | 128-bit solicited services | Service Solicitation 128-bit |
| `ble.adTypes.0x16` | Service data (16-bit UUID) | Service Data (UUID 16-bit) |
| `ble.adTypes.0x19` | Appearance | Appearance |
| `ble.adTypes.0x1b` | LE device address | Endereço LE |
| `ble.adTypes.0x20` | Service data (32-bit UUID) | Service Data (UUID 32-bit) |
| `ble.adTypes.0x21` | Service data (128-bit UUID) | Service Data (UUID 128-bit) |
| `ble.adTypes.0x24` | URI | URI |
| `ble.adTypes.0xff` | Manufacturer data | Manufacturer Data |
| `ble.unknownType(hex="{hex}")` | Unknown type 0x{hex} | Tipo desconhecido 0x{hex} |
| `ble.flags.limited` | limited discoverable | detectável (limitado) |
| `ble.flags.general` | discoverable | detectável |
| `ble.flags.leOnly` | BLE only | apenas BLE |
| `ble.flags.classic` | also Classic Bluetooth | também Bluetooth Classic |
| `ble.category` | Category | Categoria |
| `ble.unlistedCompany` | Unlisted company | Fabricante não listado |
## scanErrors

| key | English | Português (Brasil) |
|---|---|---|
| `scanErrors.poweredOff` | Bluetooth is off. Turn it on to keep scanning. | Bluetooth desativado. Ative para continuar o scan. |
| `scanErrors.unauthorized` | The app is no longer allowed to use Bluetooth. Check its permissions in Settings. | O app perdeu a permissão de Bluetooth. Verifique nas configurações. |
| `scanErrors.locationOff` | Location is off. This phone needs it switched on to scan. | Localização desativada. Este aparelho exige a localização para escanear. |
| `scanErrors.resetting` | Bluetooth is restarting. Scanning will resume on its own. | Bluetooth reiniciando. O scan retoma sozinho. |
| `scanErrors.startFailed` | The phone could not start scanning. It will try again shortly. | Falha ao iniciar o scan. Nova tentativa em instantes. |
| `scanErrors.other` | Scanning stopped unexpectedly. It will try again shortly. | O scan parou inesperadamente. Nova tentativa em instantes. |
## gate

| key | English | Português (Brasil) |
|---|---|---|
| `gate.checking.eyebrow` | starting | iniciando |
| `gate.checking.title` | Checking Bluetooth | Verificando o Bluetooth |
| `gate.checking.body` | One moment. | Um instante. |
| `gate.transient.eyebrow` | restarting | reiniciando |
| `gate.transient.title` | Bluetooth is restarting | Bluetooth reiniciando |
| `gate.transient.body` | The adapter is resetting. This clears on its own. | O adaptador está sendo reiniciado. Isso se resolve sozinho. |
| `gate.permissionDenied.eyebrow` | permission | permissão |
| `gate.permissionDenied.title` | Nearby devices permission needed | Permissão necessária |
| `gate.permissionDenied.body` | Scanning for Bluetooth devices requires permission. Nothing is sent anywhere — the scan is passive and stays on this device. | Para escanear dispositivos Bluetooth, o app precisa da permissão Dispositivos próximos. O scan é passivo e nada sai deste aparelho. |
| `gate.permissionBlocked.eyebrow` | permission | permissão |
| `gate.permissionBlocked.title` | Permission blocked | Permissão bloqueada |
| `gate.permissionBlocked.body` | Android will not ask again, so this has to be changed in system settings. Enable Nearby devices, then come back. | O Android não vai perguntar de novo. Ative a permissão Dispositivos próximos nas configurações do sistema e volte. |
| `gate.bluetoothOff.eyebrow` | bluetooth off | bluetooth desativado |
| `gate.bluetoothOff.title` | Bluetooth is off | Bluetooth desativado |
| `gate.bluetoothOff.body` | Turn Bluetooth on to scan for nearby devices. | Ative o Bluetooth para escanear dispositivos próximos. |
| `gate.bluetoothOff.action` | Turn on Bluetooth | Ativar Bluetooth |
| `gate.locationOff.eyebrow` | location off | localização desativada |
| `gate.locationOff.title` | Location services are off | Localização desativada |
| `gate.locationOff.body` | On this version of Android, Bluetooth scanning needs location services switched on. Your location is never used or stored — Android just requires it. | Nesta versão do Android, o scan Bluetooth exige a localização ativada. Sua localização nunca é usada nem armazenada: é uma exigência do sistema. |
| `gate.unauthorized.eyebrow` | not authorised | sem autorização |
| `gate.unauthorized.title` | Bluetooth is not authorised | Bluetooth não autorizado |
| `gate.unauthorized.body` | This app is not allowed to use Bluetooth. Grant access in system settings. | Este app não tem acesso ao Bluetooth. Libere nas configurações do sistema. |
| `gate.unsupported.eyebrow` | unsupported | incompatível |
| `gate.unsupported.title` | No Bluetooth LE | Sem suporte a BLE |
| `gate.unsupported.body` | This device does not support Bluetooth Low Energy, so it cannot scan. | Este aparelho não tem Bluetooth Low Energy e não consegue escanear. |
## crash

| key | English | Português (Brasil) |
|---|---|---|
| `crash.eyebrow` | something broke | erro |
| `crash.title(app="{app}")` | {app} hit an error | O {app} encontrou um erro |
| `crash.fallback` | An unexpected error stopped this screen. | Um erro inesperado interrompeu esta tela. |
| `crash.copyDetails` | Copy error details | Copiar detalhes do erro |
## scanToggle

| key | English | Português (Brasil) |
|---|---|---|
| `scanToggle.scanning` | Scanning | Escaneando |
| `scanToggle.paused` | Paused | Pausado |
| `scanToggle.pause` | Pause scanning | Pausar scan |
| `scanToggle.resume` | Resume scanning | Retomar scan |
## nearby

| key | English | Português (Brasil) |
|---|---|---|
| `nearby.title` | Nearby | Por perto |
| `nearby.filteredCount(shown=3, total=1)` | 3 of 1 | 3 de 1 |
| `nearby.count(total=1)` | 1 transmitter broadcasting | 1 dispositivo ativo |
| `nearby.count(total=12)` | 12 transmitters broadcasting | 12 dispositivos ativos |
| `nearby.snapshotHeld` | Snapshot held | Snapshot congelado |
| `nearby.listening.eyebrow` | listening | escutando |
| `nearby.listening.title` | Nothing broadcasting yet | Nenhum broadcast ainda |
| `nearby.listening.hint` | Devices appear the moment they advertise. Slow ones send a packet every few seconds. | Os dispositivos aparecem assim que transmitem. Os mais lentos enviam um packet a cada poucos segundos. |
| `nearby.paused.eyebrow` | paused | pausado |
| `nearby.paused.title` | Scanning paused | Scan pausado |
| `nearby.paused.hint` | Resume to pick the air back up. | Retome para voltar a escutar. |
| `nearby.paused.action` | Resume scanning | Retomar scan |
| `nearby.filtered.eyebrow(hidden=1)` | 1 hidden | 1 oculto |
| `nearby.filtered.eyebrow(hidden=4)` | 4 hidden | 4 ocultos |
| `nearby.filtered.title` | Nothing matches | Nenhum resultado |
| `nearby.filtered.hint` | The active filters hide every device in range. | Os filtros ativos ocultam todos os dispositivos ao alcance. |
| `nearby.filtered.action` | Clear filters | Limpar filtros |
## filters

| key | English | Português (Brasil) |
|---|---|---|
| `filters.search` | Search name or address | Buscar nome ou MAC |
| `filters.searchLabel` | Search devices | Buscar dispositivos |
| `filters.clearSearch` | Clear search | Limpar busca |
| `filters.button(active=0)` | Filters | Filtros |
| `filters.button(active=2)` | Filters, 2 active | Filtros, 2 ativos |
| `filters.remove(label="{label}")` | Remove {label} | Remover {label} |
| `filters.sortBy` | Sort by | Ordenar por |
| `filters.sortSignal` | Signal | Sinal |
| `filters.sortName` | Name | Nome |
| `filters.minSignal` | Minimum signal, dBm | RSSI mínimo, dBm |
| `filters.minSignalLabel` | Minimum signal | RSSI mínimo |
| `filters.any` | Any | Todos |
| `filters.favoritesOnly` | Favorites only | Apenas favoritos |
| `filters.namedOnly` | Named devices only | Apenas com nome |
| `filters.legacyOnly` | Legacy advertising only | Apenas legacy advertising |
| `filters.legacyHint` | Bluetooth 4.x. Restarts the scan and clears the list. | Bluetooth 4.x. Reinicia o scan e limpa a lista. |
| `filters.pillFavorites` | Favorites | Favoritos |
| `filters.pillNamed` | Named only | Com nome |
| `filters.pillLegacy` | Legacy 4.x | Legacy 4.x |
| `filters.pillByName` | By name | Por nome |
## list

| key | English | Português (Brasil) |
|---|---|---|
| `list.axisDevice` | device | dispositivo |
| `list.axisWindow` | broadcasts · 10s | broadcasts · 10s |
| `list.axisUnits` | rate · signal | intervalo · RSSI |
| `list.rowLabel({"favorite":true,"label":"Galaxy Watch8","kind":"Watch","dbm":-58,"interval":"300ms"})` | Favorite, Galaxy Watch8, Watch, -58 dBm, every 300ms | Favorito, Galaxy Watch8, Watch, -58 dBm, a cada 300ms |
| `list.rowHint` | Opens device details | Abre os detalhes do dispositivo |
## detail

| key | English | Português (Brasil) |
|---|---|---|
| `detail.outOfRange` | Out of range | Fora de alcance |
| `detail.dropped` | This device stopped advertising and was dropped from the scan. | Este dispositivo parou de transmitir e saiu do scan. |
| `detail.live` | live | ao vivo |
| `detail.notHeard` | not heard recently | sem sinal recente |
| `detail.huntThis` | Hunt this device | Localizar dispositivo |
| `detail.footnote` | Passive scan only. Nothing here required connecting to the device. | Scan passivo. Nenhum dado aqui exigiu conexão com o dispositivo. |
| `detail.addFavorite` | Add to favorites | Adicionar aos favoritos |
| `detail.removeFavorite` | Remove from favorites | Remover dos favoritos |
| `detail.favoriteNote` | This device broadcasts no name. If it changes its address, as phones and Apple devices do every few minutes, it will not be recognised as a favorite. | Este dispositivo não transmite nome. Se o MAC Address mudar, como celulares e aparelhos Apple fazem a cada poucos minutos, ele deixa de ser reconhecido como favorito. |
| `detail.acceptsConnections` | accepts connections | aceita conexões |
| `detail.broadcastOnly` | broadcast only | apenas broadcast |
| `detail.vendorKind(vendor="{vendor}", kind="{kind}")` | {vendor} {kind} | {kind} {vendor} |
| `detail.identity` | Identity | Identificação |
| `detail.address` | Address | MAC Address |
| `detail.name` | Name | Nome |
| `detail.localName` | Local name | Local name |
| `detail.vendor` | Vendor | Fabricante |
| `detail.kind` | Kind | Tipo |
| `detail.favorite` | Favorite | Favorito |
| `detail.notIdentified` | Not identified | Não identificado |
| `detail.kindFrom(kind="{kind}", source="{source}")` | {kind}, from {source} | {kind}, via {source} |
| `detail.no` | No | Não |
| `detail.yes` | Yes | Sim |
| `detail.matchedByName(id="{id}")` | Yes, matched by name (saved as {id}) | Sim, reconhecido pelo nome (salvo como {id}) |
| `detail.liveLabel` | signal and broadcasts | RSSI e broadcasts |
| `detail.secondsAgo(seconds=5)` | 5 s ago | -5 s |
| `detail.now` | now | agora |
| `detail.trend.approaching` | getting stronger | subindo |
| `detail.trend.receding` | getting weaker | caindo |
| `detail.trend.steady` | steady | estável |
| `detail.duration(seconds=5)` | 5 s | 5 s |
| `detail.rate(interval=null)` | not enough packets yet | packets insuficientes |
| `detail.rate(interval=250)` | 4 per second | 4 por segundo |
| `detail.rate(interval=1600)` | once every 1.6 s | 1 a cada 1,6 s |
| `detail.since(time="{time}")` | since {time} | desde {time} |
| `detail.received` | broadcasts received | broadcasts recebidos |
| `detail.broadcasting` | What it is broadcasting | Advertisement Data |
| `detail.connections` | Connections | Conexões |
| `detail.acceptsConnectionsTitle` | Accepts connections | Aceita conexões |
| `detail.broadcastOnlyTitle` | Broadcast only | Apenas broadcast |
| `detail.notBroadcast(fields="{fields}")` | Not broadcast: {fields} | Ausente no advertising: {fields} |
| `detail.notable.name` | name | nome |
| `detail.notable.manufacturer` | manufacturer data | Manufacturer Data |
| `detail.notable.category` | category | categoria |
| `detail.notable.services` | services | serviços |
| `detail.notable.txPower` | Tx power | Tx Power |
| `detail.rawPacket` | Raw packet | Packet bruto |
| `detail.hide` | Hide | Ocultar |
| `detail.showBytes` | Show bytes | Ver bytes |
| `detail.legendLength` | length | tamanho |
| `detail.legendType` | type | tipo |
| `detail.legendData` | data | dados |
| `detail.packetHead(index=0, total=1, bytes=31)` | Packet · 31 bytes | Packet · 31 bytes |
| `detail.copyHex` | Copy packet hex | Copiar hex dump |
| `detail.padding(bytes=31)` | + 31 zero bytes of padding added by Android | + 31 bytes de padding (zeros) adicionados pelo Android |
## glossary

| key | English | Português (Brasil) |
|---|---|---|
| `glossary.whatIs(title="{title}")` | What is {title}? | O que é {title}? |
| `glossary.signal.title` | Signal strength (dBm) | RSSI (dBm) |
| `glossary.signal.body` | How strongly this phone hears the device, in decibel-milliwatts. Closer to zero is stronger: −45 is right next to you, −90 is barely audible.\n\nIt is not a distance by itself. Walls, bodies and the way a device is held all change it, so this screen shows a band (immediate, near, far, distant) and whether the signal is rising or falling. Hunt turns it into an approximate distance. | Intensidade com que este celular recebe o dispositivo, em decibel-miliwatts. Quanto mais perto de zero, mais forte: −45 é colado em você, −90 está no limite da recepção.\n\nRSSI não é distância. Paredes, pessoas e a posição do aparelho alteram o valor, por isso esta tela mostra uma faixa (imediato, perto, longe, distante) e se o sinal está subindo ou caindo. A tela Localizar converte o RSSI em uma distância aproximada. |
| `glossary.interval.title` | Advertising interval | Advertising interval |
| `glossary.interval.body` | How often the device announces itself. Every Bluetooth LE device repeats a short broadcast on a fixed rhythm, from 20 ms (50 times a second) to over 10 seconds.\n\nThe rhythm says a lot: beacons and devices being paired shout fast, trackers and sensors whisper slowly to save battery. | Frequência com que o dispositivo se anuncia. Todo dispositivo BLE repete um broadcast curto em ritmo fixo, de 20 ms (50 vezes por segundo) a mais de 10 segundos.\n\nO ritmo é revelador: beacons e dispositivos em pareamento transmitem rápido; rastreadores e sensores transmitem devagar para economizar bateria. |
| `glossary.seen.title` | Seen for | Tempo visível |
| `glossary.seen.body` | How long this phone has been hearing the device without a gap long enough to drop it from the list. | Há quanto tempo este celular recebe o dispositivo sem uma interrupção longa o bastante para removê-lo da lista. |
| `glossary.packets.title` | Packets | Packets |
| `glossary.packets.body` | How many broadcasts this phone has received from the device since it first appeared. Some broadcasts are always missed; Bluetooth scanning listens on one channel at a time. | Quantos broadcasts este celular recebeu do dispositivo desde que ele apareceu. Sempre há perdas: o scan BLE escuta um canal de advertising por vez. |
| `glossary.cadence.title` | Live signal and rhythm | Sinal e cadência ao vivo |
| `glossary.cadence.body` | Both rows cover the last 10 seconds, with now on the right.\n\nThe line is the signal strength: higher is stronger. Each tick below it is one broadcast received, at the moment it arrived. A solid block means the device broadcasts faster than the eye can separate. | As duas faixas cobrem os últimos 10 segundos, com o momento atual à direita.\n\nA linha é o RSSI: mais alto, mais forte. Cada traço abaixo é um broadcast recebido, no instante em que chegou. Um bloco sólido indica que o dispositivo anuncia mais rápido do que o olho consegue distinguir. |
| `glossary.address.title` | Address | MAC Address |
| `glossary.address.body` | The hardware address the device is broadcasting under. Phones, Apple devices and many others change it every few minutes on purpose, so they cannot be tracked. When that happens, the same device appears as a new entry. | O endereço com que o dispositivo está anunciando. Celulares, aparelhos Apple e muitos outros trocam esse endereço a cada poucos minutos, de propósito, para evitar rastreamento. Quando isso acontece, o mesmo dispositivo aparece como um item novo. |
| `glossary.advertisement.title` | What it is broadcasting | Advertisement Data |
| `glossary.advertisement.body` | Everything on this screen comes from the device’s public broadcast. The app never connects to it.\n\nA broadcast is made of small labelled fields: a name, the manufacturer, a category, the services it offers. Each row here is one of those fields, decoded. The code next to it (0x09, 0xFF…) is the field’s official type number. | Tudo nesta tela vem do advertising público do dispositivo. O app nunca se conecta a ele.\n\nUm advertisement é formado por campos curtos: nome, fabricante, categoria, serviços oferecidos. Cada linha aqui é um desses campos, decodificado. O código ao lado (0x09, 0xFF…) é o tipo do campo (AD type) definido pela especificação. |
| `glossary.connectable.title` | Accepts connections | Aceita conexões |
| `glossary.connectable.body` | Whether the device lets other devices connect to it, for pairing or exchanging data. Broadcast-only devices, like beacons and many trackers, only ever announce themselves. This app does not connect either way. | Indica se o dispositivo aceita conexões de outros aparelhos, para pareamento ou troca de dados. Dispositivos apenas de broadcast, como beacons e muitos rastreadores, somente se anunciam. Este app nunca se conecta, em nenhum caso. |
| `glossary.packet.title` | Raw packet | Packet bruto |
| `glossary.packet.body` | The broadcast exactly as received, byte by byte. It is a run of fields, each one written as: a length byte, a type byte, then the data.\n\nAndroid pads the packet with zeros to its full size; that padding is not part of what the device sent. | O advertisement exatamente como foi recebido, byte a byte. É uma sequência de campos, cada um no formato: um byte de tamanho, um byte de tipo e o payload.\n\nO Android completa o packet com zeros até o tamanho máximo; esse padding não faz parte do que o dispositivo enviou. |
| `glossary.distance.title` | Distance estimate | Estimativa de distância |
| `glossary.distance.body` | An approximate figure from signal strength, never an exact one, with the range it is likely in underneath. Walls and bodies can make a device seem further away.\n\nSignal strength has no direction. Walk, and watch whether the distance shrinks.\n\n"Uncalibrated" means the device does not say how strong it is, so the figure can be off by 2–3 times. To fix it, hold the phone still, 1 m from the device, for 5 seconds and tap "Calibrate at 1 m".\n\nWithout calibration, still follow the trend: a shrinking distance and WARMER mean you are getting closer. | Um valor aproximado calculado a partir do RSSI, nunca exato, com a faixa provável logo abaixo. Paredes e pessoas no caminho fazem o dispositivo parecer mais distante.\n\nRSSI não indica direção. Caminhe e observe se a distância diminui.\n\n"Sem calibrar" significa que o dispositivo não informa a própria potência (Tx Power), então o valor pode errar por um fator de 2 a 3. Para corrigir, mantenha o celular parado a 1 m do dispositivo por 5 segundos e toque em "Calibrar a 1 m".\n\nMesmo sem calibração, siga a tendência: distância diminuindo e APROXIMANDO indicam que você está chegando perto. |
## hunt

| key | English | Português (Brasil) |
|---|---|---|
| `hunt.title` | Hunt | Localizar |
| `hunt.empty.eyebrow` | no target | sem alvo |
| `hunt.empty.title` | Pick something to hunt | Nenhum alvo selecionado |
| `hunt.empty.hint` | Open a device in Nearby and choose “Hunt this device”. | Abra um dispositivo em Por perto e toque em “Localizar dispositivo”. |
| `hunt.empty.action` | Browse Nearby | Abrir Por perto |
| `hunt.lost.eyebrow` | signal lost | sem sinal |
| `hunt.lost.title` | Lost | Sinal perdido |
| `hunt.lost.hint` | This device stopped advertising. Walk back toward where it was last strong. | O dispositivo parou de anunciar. Volte até onde o sinal estava mais forte. |
| `hunt.trend.approaching` | ▲  WARMER | ▲  APROXIMANDO |
| `hunt.trend.receding` | ▼  COLDER | ▼  AFASTANDO |
| `hunt.trend.steady` | ↔  HOLDING | ↔  ESTÁVEL |
| `hunt.calibration.user` | Calibrated | Calibrado |
| `hunt.calibration.ibeacon` | Beacon | Beacon |
| `hunt.calibration.tx-power` | Tx power | Tx Power |
| `hunt.calibration.default` | Uncalibrated | Sem calibrar |
| `hunt.likely(range="{range}")` | approximate · likely {range} m | aproximado · faixa provável {range} m |
| `hunt.a11yDistance(approx="{approx}", range="{range}")` | Approximately {approx} metres, likely {range} metres | Aproximadamente {approx} metros, faixa provável de {range} metros |
| `hunt.signalLabel(seconds=5)` | signal · last 5 s | RSSI · últimos 5 s |
| `hunt.strongest` | strongest | pico |
| `hunt.strongestAgo(seconds=5)` | strongest · 5 s ago | pico · há 5 s |
| `hunt.calibrate` | Calibrate at 1 m | Calibrar a 1 m |
| `hunt.recalibrate` | Recalibrate | Recalibrar |
| `hunt.a11yAt1m(dbm=-58)` | -58 dBm at 1 metre | -58 dBm a 1 metro |
| `hunt.hint` | No direction — walk, and watch the distance shrink. | Sem direção: caminhe e observe a distância diminuir. |
| `hunt.calibrateSheet.title` | Calibrate at 1 m | Calibrar a 1 m |
| `hunt.calibrateSheet.question(label="{label}")` | Is the phone 1 m from {label}, held still? | O celular está a 1 m de {label}, parado? |
| `hunt.calibrateSheet.measured(seconds=5)` | measured over the last 5 s | medido nos últimos 5 s |
| `hunt.calibrateSheet.becomes` | Saved as this device’s reference at 1 m. Every distance is measured from it. | Salvo como referência de 1 m deste dispositivo. As distâncias estimadas serão calculadas a partir dele. |
| `hunt.calibrateSheet.tooStrong` | Stronger than most devices read at 1 m. If the phone was closer, every distance will read too far. | Acima do que a maioria dos dispositivos registra a 1 m. Se o celular estava mais perto, as distâncias estimadas parecerão maiores do que o real. |
| `hunt.calibrateSheet.tooWeak` | Weaker than most devices read at 1 m. If something was in the way, every distance will read too close. | Abaixo do que a maioria dos dispositivos registra a 1 m. Se havia algo no caminho, as distâncias estimadas parecerão menores do que o real. |
| `hunt.calibrateSheet.rotating` | This device broadcasts no name. If it changes its address, the calibration is lost. | Este dispositivo não transmite nome. Se o MAC Address mudar, a calibração se perde. |
| `hunt.calibrateSheet.current(dbm=-58)` | Current reference: -58 dBm | Referência atual: -58 dBm |
| `hunt.calibrateSheet.remove` | Remove calibration | Remover calibração |
| `hunt.calibrateSheet.notEnoughTitle` | Not enough signal yet | Sinal insuficiente |
| `hunt.calibrateSheet.notEnoughBody(seconds=5)` | Hold the phone 1 m from the device for 5 seconds, then try again. | Mantenha o celular a 1 m do dispositivo por 5 segundos e tente de novo. |
| `hunt.calibrateSheet.ok` | OK | OK |
## settings

| key | English | Português (Brasil) |
|---|---|---|
| `settings.title` | Settings | Configurações |
| `settings.theme` | Theme | Tema |
| `settings.themes.graphite.title` | Graphite | Grafite |
| `settings.themes.graphite.blurb` | Neutral greys, amber only for signal. Easier on the eyes for long sessions. | Cinzas neutros, âmbar apenas no sinal. Mais confortável em sessões longas. |
| `settings.themes.night.title` | Night | Noite |
| `settings.themes.night.blurb` | Amber on deep brown-black. Best indoors and after dark. | Âmbar sobre fundo marrom-escuro. Ideal para ambientes internos e à noite. |
| `settings.language` | Language | Idioma |
| `settings.languages.system` | System default | Padrão do sistema |
| `settings.languages.en` | English | English |
| `settings.languages.pt-BR` | Português (Brasil) | Português (Brasil) |
| `settings.systemHint(name="{name}")` | Follows the phone: {name} | Segue o idioma do aparelho: {name} |
## generatedLabels

| key | English | Português (Brasil) |
|---|---|---|
| `generatedLabels.Unknown device` | Unknown device | Dispositivo desconhecido |
| `generatedLabels.Apple device nearby` | Apple device nearby | Dispositivo Apple próximo |
| `generatedLabels.Proximity tag` | Proximity tag | Tag de proximidade |
| `generatedLabels.Heart rate monitor` | Heart rate monitor | Monitor cardíaco |
| `generatedLabels.Battery service` | Battery service | Battery Service |
| `generatedLabels.Input device` | Input device | Periférico de entrada |
| `generatedLabels.Fitness machine` | Fitness machine | Aparelho fitness |
| `generatedLabels.Eddystone beacon` | Eddystone beacon | Eddystone Beacon |
| `generatedLabels.Exposure notification` | Exposure notification | Notificação de exposição |
| `generatedLabels.HomeKit accessory` | HomeKit accessory | Acessório HomeKit |
| `generatedLabels.AirPlay target` | AirPlay target | AirPlay (receptor) |
| `generatedLabels.AirPlay source` | AirPlay source | AirPlay (emissor) |
| `generatedLabels.Tethering target` | Tethering target | Ponto de acesso (cliente) |
| `generatedLabels.Tethering source` | Tethering source | Ponto de acesso (host) |
| `generatedLabels.Nearby action` | Nearby action | Nearby Action |
