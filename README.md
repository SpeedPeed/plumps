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

| | PC | Handy |
|---|---|---|
| Bewegen | WASD / Pfeiltasten | links auf den Bildschirm tippen und ziehen |
| Dash / Pups | Leertaste | DASH-Knopf rechts |

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
index.html      Bildschirme (Menü, Lobby, HUD, Kartenwahl, Siegerehrung)
style.css
js/sim.js       Spiellogik, Modi, Karten, Power-ups, Bots (läuft nur beim Host)
js/maps.js      Inselformen (Kreise/Rechtecke, drehend/fahrend)
js/net.js       Host/Client über PeerJS
js/render.js    Canvas-Grafik
js/input.js     Tastatur, Touch-Joystick, Gamepad
js/audio.js     Synthetisierte Soundeffekte
js/main.js      Alles zusammenstecken
```

### Lokal starten

```bash
python3 -m http.server 8000
```

Dann <http://localhost:8000> öffnen.

### Online stellen (kostenlos mit GitHub Pages)

Repository → **Settings** → **Pages** → Source: *Deploy from a branch* → Branch `main`, Ordner `/ (root)` → Save.
Nach ~1 Minute läuft das Spiel unter `https://<dein-name>.github.io/plumps/`.

### Eigene Inhalte bauen

- **Chaos-Karte:** in `js/sim.js` bei `CARDS` eintragen und in `Game.step()` mit `if (card === 'deinekarte')` die Regel einbauen.
- **Insel:** in `js/maps.js` bei `MAPS` aus Kreisen (`k: 'c'`) und Rechtecken (`k: 'r'`) zusammensetzen. `angle: (t) => …` lässt sie drehen, `orbit` lässt Teile im Kreis fahren.
- **Power-up:** bei `ITEMS` eintragen und in `Game.applyItem()` die Wirkung einbauen.

## Bekannte Grenzen

- In seltenen Netzwerken (strenge Firmen- oder Mobilfunk-NAT) klappt die direkte Verbindung nicht. Dann hilft meistens WLAN statt mobiler Daten.
- Wer mitten in einer Runde beitritt, ist bis zur nächsten Runde ein Geist.
