# PLUMPS! 🏝️

Ein kostenloses Online-Partyspiel für **2–6 Spieler** direkt im Browser – am PC oder Handy, ohne Installation und ohne Account.

**Ziel:** Schubs alle anderen Blobs von der Insel. Wer als Letzter steht, kriegt einen Punkt.

## Warum es nicht langweilig wird

- **Geister spielen weiter 👻** – Wer rausfliegt, schwebt als Geist über der Insel und kann mit einer **Pups-Welle** die Lebenden ins Wasser blasen. Niemand sitzt rum und wartet.
- **Chaos-Karten 🃏** – Wer zuerst rausgeflogen ist, darf aus 3 Karten wählen, was die nächste Runde verändert. 16 Karten, z.B.:
  - 🧊 Eisbahn · 🐘 Riesenblobs · 🐭 Mini-Blobs · 🪞 Spiegelwelt (Steuerung vertauscht – nur nicht für dich)
  - 💣 Bombenhagel · 🥔 Heiße Kartoffel · 🌑 Stromausfall · 🔀 Platztausch · 🧲 Magnetfeld · 🍩 Donut-Insel …
- **Königsmord 👑** – Wer führt, trägt eine Krone. Wer den König ins Wasser schubst, bekommt einen Bonuspunkt.
- **Schrumpfende Insel** – Nach ~20 Sekunden wird die Insel kleiner. Campen bringt nichts.
- **Bots 🤖** – Zu zweit? Einfach ein paar Bots dazunehmen, dann ist mehr los.

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
js/sim.js       Spiellogik + Physik + Bots (läuft nur beim Host)
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

### Eigene Chaos-Karte bauen

1. In `js/sim.js` bei `CARDS` einen Eintrag hinzufügen.
2. In `Game.step()` (oder `beginCountdown()`) mit `if (card === 'deinekarte')` die Regel einbauen.

## Bekannte Grenzen

- In seltenen Netzwerken (strenge Firmen- oder Mobilfunk-NAT) klappt die direkte Verbindung nicht. Dann hilft meistens WLAN statt mobiler Daten.
- Wer mitten in einer Runde beitritt, ist bis zur nächsten Runde ein Geist.
