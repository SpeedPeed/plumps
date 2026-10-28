# PLUMPS! – Roadmap zur Überarbeitung

Ziel: PLUMPS! soll sich wie ein liebevoll gemachtes, „richtiges“ Partyspiel anfühlen, das man abends eine Stunde lang spielt und am nächsten Tag wieder startet.

Feste Rahmenbedingungen: kostenlos, kein Account, keine Installation, GitHub Pages, Peer-to-Peer über PeerJS mit autoritativem Host, kein Build-Schritt, 2D-Canvas, keine Emojis in der Spielwelt, Oberfläche auf Deutsch, Handy und PC gleichwertig.

Nach jeder Phase: Headless-Test grün, kleine deutsche Commits, kurzer Bericht, dann auf OK warten.

---

## Ausgangslage (Stand vor Phase 0)

| Datei | Zeilen | Inhalt |
|---|---|---|
| `js/sim.js` | ~1000 | Physik, Ablauf, alle 6 Modi, 20 Karten, 8 Power-ups, Bots, Snapshot – alles in einer Klasse, Modi/Karten als `if`-Ketten |
| `js/maps.js` | ~70 | 10 Inseln als Daten + Geometrie |
| `js/render.js` | ~480 | Canvas-Zeichnung, viele Emojis (Hüte, Power-ups, Bomben, Bananen, Krone im Kreis, Kartoffel …) |
| `js/main.js` | ~530 | Menü, Lobby, Netzwerk-Schleifen, HUD, Kartenwahl, Siegerehrung |
| `js/net.js`, `js/input.js`, `js/audio.js` | je <100 | PeerJS-Hülle, Eingabe, Piep-Sounds |

Bekannte Schwächen: Treffer werden beiden Blobs gegenseitig zugeschrieben; alle Zahlen sind verstreut; `Math.random()` überall, daher nicht reproduzierbar; kein automatischer Test im Repo.

---

## Phase 0 – Fundament

**Ziel:** Gleiches Spielverhalten, aber sauber erweiterbar, messbar und reproduzierbar.

- `js/sim.js` wird zum schlanken Kern: Spieler, Physik, Ablauf, Welt-Objekte (Power-ups, Bomben, Bananen, Bumper), Snapshot.
- Module mit Hooks:
  - `js/modes/<id>.js`: `setup`, `step`, `onFall`, `onCollide`, `canRespawn`, `checkEnd`, `score`, `hudMetric`, `botGoal`, `playerMods`, `snapshot`, `carryables`
  - `js/cards/<id>.js`: `fits`, `setup`, `globalMods`, `playerMods`, `input`, `force`, `step`, `onCollide`, `botAdjust`, `snapshot`
  - `js/items/<id>.js`: `apply`, `mods` (wirkt, solange der Effekt läuft), `step`
  - `js/maps/<id>.js`: Formen, Bewegung, später eigene Mechanik (`setup`, `step`)
- `js/tuning.js`: alle Spielzahlen an einem Ort, live änderbar.
- `js/rng.js`: Zufallsgenerator mit Startwert. Pro Match ein Startwert, pro Runde ein abgeleiteter Startwert. Die Simulation nutzt kein `Math.random()` mehr.
- `js/bots.js`: Bot-Logik aus dem Kern herausgelöst; Stärke pro Bot einstellbar (nötig für den Test).
- `js/debug.js` über `?debug`: FPS, Ping, Hitboxen, aktive Effekte, Startwert der Runde, Schieberegler für die wichtigsten Tuning-Werte, „Werte kopieren“.
- `tools/simtest.mjs`: alle Kombinationen aus Modus × Insel × Karte, Abstürze, Runden ohne Ende, Rundendauer pro Modus, Siegverteilung nach Bot-Stärke.
- Fehler: Treffer werden nur noch dem Angreifer gutgeschrieben (Dash oder deutlich höhere Geschwindigkeit in Richtung des anderen). Pups, Bombe, Banane, Bumper und Kartoffel werden ebenso geprüft.

## Phase 1 – Kampf mit Tiefe

Schere-Stein-Papier: **Dash > Herumlaufen, Stemmen > Dash, aufgeladener Dash > Stemmen.**

- Aufladbarer Dash: antippen = kurz und schnell, halten bis ~0,6 s = stark. Beim Laden langsamer, Blob zieht sich zusammen, leuchtet, Ladeton. Knockback = f(Ladung, Aufprallgeschwindigkeit).
- Stemmen (Shift/K, am Handy zweiter Knopf über DASH): weniger Knockback; perfektes Timing (~150 ms) kontert einen Dash. Abklingzeit. Voll geladener Dash bricht das Stemmen.
- Kantenwackeln: ~0,35 s Rettungsfenster mit rudernden Ärmchen, Panikgesicht und Ton.
- Wucht: Treffer-Stopp 40–90 ms, Bewegungsspuren, Kamera-Zoom und leichte Zeitlupe beim letzten Duell, Rauswurf-Einblendung „X schickt Y baden“.
- Eingabe-Protokoll: aus dem Dash-Zähler wird „Dash gedrückt/losgelassen“ plus Stemmen. Damit kein Druck verloren geht, laufen weiter Zähler mit.
- Bots lernen Aufladen, Stemmen und Kantenrettung je nach Stärke.
- Headless-Test belegt: Schwer schlägt Leicht deutlich.

## Phase 2 – Optik & Ton

- Zuerst `docs/STYLE.md`: Palette, dicke weiche Konturen, Formensprache, Schatten-/Höhenregeln.
- Alle Emojis in der Spielwelt durch eigene Vektorgrafik ersetzen (Hüte, Power-ups, Bombe, Banane, Münze, Krone, Bumper, Kartoffel, Geist …).
- Blobs mit Gesichtsausdrücken (neutral, angestrengt, Panik, selbstgefällig, benommen, triumphierend), Nachschwabbeln, Tropfen.
- Inseln mit Pseudo-3D-Felskante, Brandung, Bodendetails und eigenem Thema pro Insel (Tropen, Eisscholle, Vulkan, Süßigkeiten, Schrottplatz, Holzfloß …).
- Lebendiges Wasser: Wellen, Spiegelungen, Fische, Haiflossen.
- Farbenblind-freundliche Palette plus zweites Merkmal (Muster auf dem Blob).
- Oberfläche im selben Stil, animierte Übergänge, Karten als echte Spielkarten mit Illustration, weniger Text.
- Ton: prozedurale Musik (Grund-Loop, steigert sich bei Schrumpfen/Duell; Motive für Kartenwahl und Siegerehrung), geschichtete Effekte, eigene Tonhöhe und Brabbeln pro Blob, getrennte Lautstärke für Musik und Effekte.
- Leistung: 60 FPS am Handy, automatischer Sparmodus bei Einbrüchen.

## Phase 3 – Tempo & Ablauf

- Wartezeit zwischen Runden ≤ ~8 s: Kartenwahl 6 s, gleichzeitig mit Zwischenstand, Countdown 2 s, freies Herumschwabbeln während der Wartezeit.
- Rauswurf-Wiederholung in Zeitlupe (Ringpuffer beim Host), ersetzt das statische Rundenende.
- Finale bei Matchball: andere Musik, Ansage, kleinere Insel, Matchball-Spieler muss „Letzter Blob“ gewinnen.
- Lobby: Einstellungen für alle sichtbar, Bereit-Anzeige, Rauswerfen, eigene Farbwahl.
- Spielerwechsel: fairer Punktestand für Nachzügler, Bots übernehmen verlassene Plätze.

## Phase 4 – Inhalte mit Charakter

- Jede Insel bekommt eine vorhersehbare Mechanik mit Vorwarnung (Brücke bricht, Wippe lässt rutschen, schiebbare Kisten, Lava mit Vorwarnung, Eisscholle bricht, Karussell-Fliehkraft …).
- Chaos-Karten mit persönlichem Vorteil für den Wählenden bzw. Nachteil für den Führenden; ähnliche Karten zusammenlegen.
- 2–3 neue Modi: Team 2v2/3v3, Boss-Blob, evtl. ein Konter-Modus.
- Power-ups per Headless-Test ausbalancieren; Tarnkappe für Handy neu denken.

## Phase 5 – Gründe zum Wiederkommen

- Lokales Profil (localStorage): XP, Stufen, Statistiken.
- Freischaltbare Kosmetik (Hüte, Muster, Spuren, Emotes, Siegestänze), für alle sichtbar.
- Erinnerungsfoto bei der Siegerehrung.
- Neue Auszeichnungen: Kantenkünstler, Konter-König, Pechvogel …

## Phase 6 – Online-Stabilität

- Client-Vorhersage für den eigenen Blob mit sanftem Abgleich.
- Zwei Kanäle: unzuverlässig für Zustand, zuverlässig für Ereignisse.
- Sparsamere Pakete (Stammdaten nur bei Änderung), Host-Zeitstempel für die Interpolation.
- Konfigurierbare ICE-Server inkl. kostenlosem TURN als Notlösung.
- Wiederverbinden innerhalb von 30 s per Token.
- Ping-Anzeige pro Spieler.
- Optional: Host-Übergabe.

---

## Offene Fragen

1. **Emojis außerhalb der Spielwelt:** Die Vorgabe gilt für das Canvas. Für „sieht auf allen Geräten gleich aus“ würde ich in Phase 2 auch Knöpfe, Karten und Hinweise auf eigene SVG-Symbole umstellen. Einverstanden?
2. **TURN-Server (Phase 6):** Wirklich kostenlose TURN-Dienste brauchen fast immer ein (kostenloses) Konto mit Zugangsdaten, z. B. Metered „Open Relay“ oder Cloudflare. Die Zugangsdaten stünden dann öffentlich im Code. Ist das für dich in Ordnung, oder soll man sie im Spiel eintragen können?
3. **Team-Modus (Phase 4):** Nur ab 4 Spielern sinnvoll. Sollen Bots auffüllen, damit Teams bei 3 oder 5 Spielern aufgehen?
   *Umgesetzt (vorläufig):* Team-Plumps kommt nur bei gerader Spielerzahl ab 4 in den Topf – mitten im Match tauchen keine zusätzlichen Bots auf. Lässt sich ändern, falls ihr lieber auffüllen wollt.
4. **Freischaltungen (Phase 5):** Ein Profil im localStorage lässt sich leicht manipulieren. Für ein Freundespiel halte ich das für egal. Passt das?
   *Umgesetzt so:* Profil nur im localStorage, der Host prüft nur, ob Hut/Spur/Tanz gültige Werte sind. Freischaltungen sind reine Optik.
5. **Spielzeit pro Match:** Für „eine Stunde, 3 Matches“ wären ca. 12–18 Minuten pro Match ideal. Soll der Standard dafür auf 5 Punkte bleiben?
6. **Zufall mit Startwert:** Ein Match lässt sich mit gleichem Startwert und gleichen Eingaben nachspielen. Soll man in Phase 3 den Startwert z. B. für Revanchen „gleiche Inselfolge“ nutzen können, oder bleibt das nur ein Werkzeug für Tests?
