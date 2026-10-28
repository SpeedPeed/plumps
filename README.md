# PLUMPS! 🏝️

Ein kostenloses Online-Partyspiel für **2–6 Spieler** direkt im Browser – am PC oder Handy, ohne Installation und ohne Account.

**Ziel:** Schubs alle anderen Blobs von der Insel. Wer als Letzter steht, kriegt einen Punkt.

## Warum es nicht langweilig wird

**6 Spielmodi**, die sich jede Runde abwechseln:

| | Modus | Ziel |
|---|---|---|
| 🏝️ | Letzter Blob | Als Letzter auf der Insel stehen |
| ❤️ | Drei Leben | Am Ende als Einziger noch Leben übrig haben |
| ⛰️ | Hügelkönig | Allein im wandernden Kreis stehen, bis der Balken voll ist |
| 🪙 | Münzrausch | Münzen sammeln – wer ins Wasser fällt, verliert die Hälfte |
| 🎨 | Farbkampf | Die Insel in deiner Farbe anmalen |
| 🧟 | Glibber-Fangen | Den Glibber weiterrempeln – wer ihn am kürzesten hatte, gewinnt |

**10 Inseln**, darunter das sich drehende ✳️ Drehkreuz, die ⚖️ Wippe, das 🎠 Karussell mit fahrenden Inseln, ⭐ Seestern, 🌉 Brückeninseln und ⭕ Ringinsel.

**20 Chaos-Karten**: Wer im Gesamtstand hinten liegt, wählt aus 3 Karten, was die nächste Runde verändert. Zum Beispiel 🧊 Eisbahn, 🪞 Spiegelwelt, 💣 Bombenhagel, 🥔 Heiße Kartoffel, 🌑 Stromausfall, 🍌 Bananenrepublik, 🐌 Zeitlupe oder 🍮 Wackelpudding.

**8 Power-ups** in Seifenblasen: 🥊 Boxhandschuh, ⚓ Anker, 🍄 Riesenpilz, 👟 Turboschuhe, 🍌 Bananen, 💣 Bombe, 🔄 Tauschticket, 🫥 Tarnkappe.

Außerdem:
- **Geister 👻** – Wer im Modus „Letzter Blob“ rausfliegt, schwebt weiter und kann mit einer **Pups-Welle** die Lebenden ins Wasser blasen.
- **Königsmord 👑** – Wer den Führenden ins Wasser schubst, bekommt einen Bonuspunkt.
- **Hüte & Emotes** – Such dir in der Lobby einen Hut aus, im Spiel gibt's Emotes auf den Tasten 1–5.
- **Auszeichnungen** am Ende: Rausschubser, Wasserratte, Pups-Meister, Sammler, Dash-Junkie.
- **Bots 🤖** in drei Stärken (Leicht, Mittel, Schwer) für kleine Runden.

## Steuerung

| | PC | Handy | Gamepad |
|---|---|---|---|
| Bewegen | WASD / Pfeiltasten | links auf den Bildschirm tippen und ziehen | Stick |
| Dash | Leertaste antippen | DASH-Knopf antippen | A |
| Aufgeladener Dash | Leertaste halten, loslassen | DASH-Knopf halten | A halten |
| Stemmen | Shift oder K | STEMMEN-Knopf | B / X / Schultertasten |
| Pups (als Geist) | Leertaste | PUPS-Knopf | A |
| Emotes | 1–5 | Knöpfe oben rechts | – |

## Kämpfen wie ein Profi

**Stein-Schere-Papier:** Dash schlägt Herumstehen · Stemmen schlägt Dash · voll aufgeladener Dash bricht durchs Stemmen.

- **Aufladen:** Halten macht den Dash stärker (voll nach 0,6 s). Dabei bist du langsamer, ziehst dich zusammen und leuchtest. Alle sehen also, dass gleich etwas kommt.
- **Stemmen:** Du krallst dich kurz fest und nimmst kaum Knockback. Wer **genau im Moment des Aufpralls** stemmt, wirft den Angreifer zurück: **Konter!**
- **Durchbruch:** Ein voll aufgeladener Dash bricht durchs Stemmen, und der Gestemmte ist kurz benommen.
- **Kantenwackeln:** Wer knapp über den Rand rutscht, rudert kurz mit den Ärmchen. Gegensteuern oder ein Dash zurück rettet dich.
- **Das letzte Duell:** Sind im Modus „Letzter Blob“ nur noch zwei übrig, zoomt die Kamera heran. Der entscheidende Rauswurf läuft in Zeitlupe.

Gamepads funktionieren auch.

## So spielt ihr

1. Einer öffnet das Spiel und klickt **Raum erstellen**.
2. Er schickt den **Einladungslink** (oder den 4-Buchstaben-Code) an die anderen.
3. Alle treten bei, der Host klickt **Los geht's!**

Der Host sollte den Tab offen lassen – sein Browser ist der Server.

## Technik

- Reines HTML/CSS/JavaScript, kein Build-Schritt, keine Abhängigkeiten außer [PeerJS](https://peerjs.com/).
- Multiplayer läuft **Peer-to-Peer über WebRTC**: Der Browser des Hosts berechnet das Spiel und schickt 30× pro Sekunde den Zustand an alle. Es gibt keinen eigenen Server, also kostet das Ganze nichts.
- Der öffentliche PeerJS-Server wird nur zum Verbinden gebraucht (wie ein Telefonbuch).
- Alle Grafiken und Sounds werden im Code erzeugt – keine Bild- oder Audiodateien.

```
index.html         Bildschirme (Menü, Lobby, HUD, Kartenwahl, Siegerehrung)
style.css
js/main.js         Alles zusammenstecken: Menü, Lobby, Netzwerk-Schleifen, HUD
js/sim.js          Spiel-Kern: Spieler, Physik, Ablauf, Snapshot (läuft nur beim Host)
js/tuning.js       ALLE Spielzahlen an einem Ort (Tempo, Dash, Zeiten, Karten …)
js/rng.js          Zufall mit Startwert – gleiche Eingaben ergeben das gleiche Spiel
js/modes/*.js      Spielmodi (je eine Datei, über Hooks angebunden)
js/cards/*.js      Chaos-Karten
js/items/*.js      Power-ups und ihre Effekte
js/maps/*.js       Inseln
js/geometry.js     Inselformen: Kreise/Rechtecke, drehend/fahrend
js/bots.js         Bot-Verhalten
js/net.js          Host/Client über PeerJS
js/render.js       Canvas-Grafik
js/input.js        Tastatur, Touch-Joystick, Gamepad
js/audio.js        Synthetisierte Soundeffekte
js/debug.js        Debug-Ansicht (?debug)
tools/simtest.mjs  Headless-Test mit Bots
docs/ROADMAP.md    Plan für die Überarbeitung
```

### Lokal starten

```bash
python3 -m http.server 8000
```

Dann <http://localhost:8000> öffnen.

### Online stellen (kostenlos mit GitHub Pages)

Repository → **Settings** → **Pages** → Source: *Deploy from a branch* → Branch `main`, Ordner `/ (root)` → Save.
Nach ~1 Minute läuft das Spiel unter `https://<dein-name>.github.io/plumps/`.

### Testen

```bash
node tools/simtest.mjs --quick
```

Simuliert ohne Grafik Runden nur mit Bots, in allen Kombinationen aus Modus, Insel und Karte. Der Test meldet:
- Abstürze und Runden ohne Ende
- durchschnittliche Rundendauer pro Modus
- Siegverteilung nach Bot-Stärke
- die Prüfungen zur Treffer-Zuordnung

Ohne `--quick` laufen alle gut 1000 Kombinationen (ca. 45 s). Mit `--seed 123` gibt es einen anderen Startwert, mit `--only klassik/kreuz/eis` genau eine Kombination.

### Debug-Ansicht

Hänge `?debug` an die Adresse, z. B. `http://localhost:8000/?debug`. Dann siehst du:
- FPS und Ping
- den Startwert der Runde
- Hitboxen und die aktiven Effekte pro Spieler; `← Name` zeigt, wem ein Sturz gerade gutgeschrieben würde
- Schieberegler für die wichtigsten Werte aus `js/tuning.js`

Die Regler wirken nur beim Host bzw. im Solo-Spiel. Mit „Geänderte Werte kopieren“ landen deine Änderungen als JSON in der Zwischenablage.

### Eigene Inhalte bauen

Jede Datei in `js/modes/`, `js/cards/`, `js/items/` und `js/maps/` ist ein Objekt mit optionalen Hooks. Welche es gibt, steht oben in der jeweiligen `index.js`.

- **Chaos-Karte:** neue Datei in `js/cards/`, in `js/cards/index.js` eintragen. Zum Beispiel ändert `globalMods(g, gm)` Werte für alle, `step(g, dt, alive)` läuft jeden Tick.
- **Modus:** neue Datei in `js/modes/`. Mindestens `checkEnd` oder `time` + `score`.
- **Insel:** neue Datei in `js/maps/` aus Kreisen (`k: 'c'`) und Rechtecken (`k: 'r'`). `angle: (t) => …` lässt sie drehen, `orbit` lässt Teile im Kreis fahren.
- **Power-up:** neue Datei in `js/items/` mit `apply` und optional `effects`.
- Zahlen gehören nach `js/tuning.js`.

## Bekannte Grenzen

- In seltenen Netzwerken (strenge Firmen- oder Mobilfunk-NAT) klappt die direkte Verbindung nicht. Dann hilft meistens WLAN statt mobiler Daten.
- Wer mitten in einer Runde beitritt, ist bis zur nächsten Runde ein Geist.
