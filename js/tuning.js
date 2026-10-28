// Alle Spielzahlen an einem Ort. Das Objekt ist absichtlich veränderbar:
// Die Debug-Ansicht (?debug) schiebt die Werte live hin und her.
// Einheiten: Längen in Welt-Einheiten (Insel-Radius ≈ 300), Zeiten in Sekunden.

export const T = {
  // --- Blob-Bewegung ---
  BLOB_R: 22,             // Radius eines normalen Blobs
  ACC: 1100,              // Beschleunigung bei vollem Stick
  FRIC: 3.2,              // Reibung (höher = bremst schneller)
  SIZE_LERP: 8,           // wie schnell Größenänderungen ankommen

  // --- Dash (antippen = kurz, halten = aufladen) ---
  DASH_V: 560,            // Schub bei angetipptem Dash
  DASH_V_MAX: 860,        // Schub bei voll aufgeladenem Dash
  DASH_CD: 1.3,           // Abklingzeit nach einem angetippten Dash
  DASH_CD_CHARGED: 1.35,  // Faktor auf die Abklingzeit bei voller Ladung
  DASH_T: 0.22,           // so lange gilt ein Blob nach einem Tipp-Dash als „dashend“
  DASH_T_MAX: 0.32,       // … und nach einem voll geladenen
  DASH_BONUS: 300,        // Extra-Stoß für den Getroffenen (Tipp-Dash)
  DASH_BONUS_MAX: 720,    // … bei voller Ladung
  TAP_TIME: 0.08,         // so kurz gedrückt gilt noch als Antippen
  DASH_CHARGE: 0.6,       // so lange halten bis zur vollen Ladung
  DASH_HOLD_MAX: 1.2,     // länger halten löst den Dash automatisch aus
  DASH_BUFFER: 0.15,      // Druck kurz vor Ende der Abklingzeit wird gemerkt
  CHARGE_ACC: 0.35,       // Tempo-Faktor, solange man auflädt
  IMPACT_BASE: 0.5,       // Knockback-Faktor = BASE + Aufprallgeschwindigkeit / IMPACT_SCALE
  IMPACT_SCALE: 1000,
  IMPACT_MIN: 0.6,
  IMPACT_MAX: 1.5,

  // --- Stemmen (Schere-Stein-Papier: Stemmen schlägt Dash, voller Dash schlägt Stemmen) ---
  BRACE_TIME: 0.45,       // so lange krallt man sich fest
  BRACE_PERFECT: 0.15,    // perfektes Zeitfenster am Anfang: Dash wird zurückgeworfen
  BRACE_CD: 1.6,          // Abklingzeit (ab Beginn des Stemmens)
  BRACE_CD_COUNTER: 0.4,  // Abklingzeit nach einem gelungenen Konter
  BRACE_ACC: 0.15,        // Tempo-Faktor beim Stemmen
  BRACE_FRIC: 2.5,        // Reibungs-Faktor beim Stemmen
  BRACE_MASS: 3,          // so viel schwerer ist man beim Stemmen
  BRACE_TAKE: 0.3,        // Anteil Dash-Knockback, der beim Stemmen ankommt
  BRACE_TAKE_OTHER: 0.5,  // … bei Pups und Explosionen
  BREAK_CHARGE: 0.85,     // ab dieser Ladung bricht ein Dash durchs Stemmen
  BREAK_MUL: 1.2,         // Knockback-Faktor beim Durchbruch
  BREAK_DAZE: 0.45,       // so lange ist der Durchbrochene benommen
  COUNTER_F: 650,         // so hart wird ein gekonterter Angreifer zurückgeworfen
  COUNTER_DAZE: 0.35,     // so lange ist der Gekonterte benommen

  // --- Kantenwackeln ---
  EDGE_TIME: 0.35,        // so lange kann man sich an der Kante noch retten
  EDGE_GRACE: 0.9,        // wie weit (× Blob-Radius) der Mittelpunkt über die Kante darf
  EDGE_FRIC: 2,           // Reibungs-Faktor beim Wackeln (Fersen in den Sand)

  // --- Wucht ---
  HITSTOP_FROM: 0.4,      // ab dieser Trefferstärke (0..1) friert das Bild kurz ein
  HITSTOP_MIN: 0.04,
  HITSTOP_MAX: 0.09,
  DUEL_SLOWMO: 0.6,       // Zeitlupe, wenn das letzte Duell beginnt …
  DUEL_SLOWMO_TIME: 1.2,  // … und so lange sie ausklingt
  FINAL_SLOWMO: 0.35,     // Zeitlupe nach dem entscheidenden Rauswurf

  // --- Zusammenstöße ---
  RESTITUTION: 0.9,       // Abprallfaktor (1 = voll elastisch)
  HIT_SPEED_MARGIN: 120,  // so viel schneller muss ein Angreifer ohne Dash sein, damit der Treffer zählt
  KO_WINDOW: 3,           // so lange nach einem Treffer zählt ein Sturz als Rauswurf
  BOING_SPEED: 80,        // ab dieser Aufprallgeschwindigkeit gibt es „Boing“

  // --- Sturz & Wiederkehr ---
  FALL_TIME: 1,           // Dauer der Fall-Animation, danach Geist oder Wartezeit
  RESPAWN_AT: 1.7,        // Zeitpunkt der Wiederkehr nach dem Sturz (Modi mit Respawn)
  SPAWN_MARGIN: 40,       // Mindestabstand zum Rand beim Erscheinen
  END_DELAY: 1,           // Pause (in Zeitlupe), bevor „Letzter Blob“ endet

  // --- Insel schrumpft ---
  SHRINK_RATE: 0.03,      // Anteil pro Sekunde

  // --- Geister ---
  GHOST_SPEED: 270,
  GHOST_RANGE: 380,       // so weit dürfen Geister vom Zentrum weg
  PUPS_CD: 4,
  PUPS_R: 125,
  PUPS_F: 520,
  PUPS_FIRST_CD: 1.5,     // Abklingzeit direkt nach dem Geistwerden

  // --- Ablauf ---
  COUNTDOWN: 3,
  ROUND_END: 3,
  CARD_PICK: 12,
  CARD_SHOW: 2.5,
  BOT_PICK_MIN: 1.5,
  BOT_PICK_MAX: 3,
  EMOTE_TIME: 2.2,

  // --- Power-ups ---
  ITEM_FIRST_MIN: 3,
  ITEM_FIRST_MAX: 5,
  ITEM_EVERY_MIN: 5,
  ITEM_EVERY_MAX: 8,
  ITEM_LIFE: 12,
  ITEM_MAX: 2,            // gleichzeitig auf der Insel (ab 5 Spielern +1)
  ITEM_PICK_R: 16,
  GLOVE_TIME: 8,
  GLOVE_MUL: 2.6,         // Faktor auf den Dash-Knockback, solange der Boxhandschuh wirkt
  ANCHOR_TIME: 6,
  ANCHOR_MASS: 5,
  ANCHOR_ACC: 0.8,
  ANCHOR_TAKE_DASH: 0.25, // Anteil Knockback, der beim Anker ankommt
  ANCHOR_TAKE_PUPS: 0.3,
  ANCHOR_TAKE_BLAST: 0.35,
  BIG_TIME: 7,
  BIG_SIZE: 1.6,
  SPEED_TIME: 7,
  SPEED_ACC: 1.5,
  SPEED_DASH_CD: 0.5,
  INVIS_TIME: 5,
  BANANA_DROP_TIME: 2.4,
  BANANA_DROP_EVERY: 0.6,
  BANANA_LIFE: 25,
  BANANA_MAX: 20,
  SLIP_TIME: 1.5,
  SLIP_ACC: 0.25,
  SLIP_FRIC: 0.25,
  SLIP_MIN_SPEED: 250,
  BOMB_FUSE: 1.6,
  BOMB_R: 95,
  BOMB_F: 620,

  // --- Chaos-Karten ---
  EIS_FRIC: 0.45,
  RIESEN_SIZE: 1.7,
  RIESEN_ACC: 0.85,
  MINI_SIZE: 0.6,
  MINI_ACC: 1.25,
  FLUMMI_RESTITUTION: 2.3,
  TURBO_DASH_CD: 0.35,
  BOMBEN_EVERY_MIN: 0.7,
  BOMBEN_EVERY_MAX: 1.4,
  BOMBEN_FUSE: 1.3,
  DONUT_R: 85,
  WIND_F: 330,
  WIND_TURN: 0.6,
  MAGNET_F: 0.5,
  KARTOFFEL_MIN: 9,
  KARTOFFEL_MAX: 13,
  KARTOFFEL_R: 110,
  KARTOFFEL_F: 500,
  SCHRUMPF_START: 2,
  SCHRUMPF_RATE: 0.055,
  BUMPER_R: 26,
  BUMPER_F: 420,
  TAUSCH_EVERY: 6,
  GEISTER_PUPS_CD: 1.3,
  GEISTER_PUPS_R: 1.35,
  GESCHENK_MIN: 0.6,
  GESCHENK_MAX: 1.2,
  GESCHENK_MAX_ITEMS: 6,
  BANANEN_START: 10,
  ZEITLUPE: 0.55,
  WACKEL: 0.6,

  // --- Modi ---
  KLASSIK_SHRINK: 20,
  LEBEN_LIVES: 3,
  LEBEN_SHRINK: 40,
  HUEGEL_TIME: 60,
  HUEGEL_FILL: 12,        // Sekunden allein im Kreis bis zum Sieg
  HUEGEL_ZONE_R: 70,
  HUEGEL_MOVE: 9,
  MUENZEN_TIME: 40,
  MUENZEN_MAX: 12,
  MUENZEN_EVERY: 0.45,
  MUENZEN_PICK_R: 12,
  FARBE_TIME: 35,
  FANGEN_TIME: 45,
  FANGEN_ACC: 1.12,
  FANGEN_IMMUNE: 0.9,
};

// Bot-Stärken: Reaktionszeit, Zielfehler, Dash-Lust, Reichweite, Vorsicht am Rand,
// Tempo, Aussetzer, Pups-Lust als Geist
export const BOT_LEVELS = [
  // charge: Lust aufzuladen, hold: Haltezeit, brace: Lust zu stemmen, braceAt: Zeit bis zum Aufprall,
  // bei der gestemmt wird (perfekt wäre < BRACE_PERFECT), save: Chance, sich an der Kante zu retten
  { name: 'Leicht', react: 0.45, aimErr: 90, dash: 0.12, range: 70,  care: 0.8,  speed: 0.72, derp: 0.12, pups: 0.08,
    charge: 0.15, hold: [0.15, 0.35], brace: 0.08, braceAt: 0.32, save: 0.3 },
  { name: 'Mittel', react: 0.28, aimErr: 45, dash: 0.25, range: 95,  care: 0.92, speed: 0.86, derp: 0.05, pups: 0.18,
    charge: 0.4, hold: [0.25, 0.55], brace: 0.3, braceAt: 0.2, save: 0.6 },
  { name: 'Schwer', react: 0.14, aimErr: 15, dash: 0.45, range: 120, care: 0.99, speed: 1,    derp: 0.01, pups: 0.35,
    charge: 0.6, hold: [0.4, 0.65], brace: 0.55, braceAt: 0.11, save: 0.9 },
];

// Werte, die die Debug-Ansicht als Schieberegler anbietet: [Schlüssel, min, max, Schritt]
export const TUNING_SLIDERS = [
  ['ACC', 400, 2000, 50],
  ['FRIC', 0.5, 8, 0.1],
  ['DASH_V', 200, 1000, 10],
  ['DASH_V_MAX', 400, 1400, 10],
  ['DASH_CD', 0.2, 3, 0.05],
  ['DASH_BONUS', 0, 800, 10],
  ['DASH_BONUS_MAX', 200, 1500, 10],
  ['DASH_CHARGE', 0.2, 1.5, 0.05],
  ['BRACE_TIME', 0.1, 1, 0.05],
  ['BRACE_PERFECT', 0.05, 0.4, 0.01],
  ['BRACE_CD', 0.3, 4, 0.1],
  ['COUNTER_F', 200, 1200, 10],
  ['EDGE_TIME', 0, 1, 0.05],
  ['EDGE_GRACE', 0, 1.5, 0.05],
  ['HITSTOP_MAX', 0, 0.2, 0.01],
  ['RESTITUTION', 0.2, 2, 0.05],
  ['HIT_SPEED_MARGIN', 0, 400, 10],
  ['PUPS_F', 0, 1200, 10],
  ['SHRINK_RATE', 0, 0.1, 0.005],
];

// Ausgangswerte merken, damit die Debug-Ansicht nur Änderungen exportiert
export const T_DEFAULTS = { ...T };
