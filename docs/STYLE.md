# PLUMPS! – Stil-Leitfaden

**Gemütlich-chaotischer Cartoon.** Alles sieht aus, als hätte man es aus weicher Knete geformt und mit einem dicken Filzstift umrandet. Satte, aber nicht grelle Farben. Nichts ist spitz, alles wackelt ein bisschen.

## Grundregeln

1. **Dicke, weiche Kontur.** Jede Figur und jedes Objekt hat eine Umrandung in *Tinte* (`#2A1B3D`, ein tiefes Pflaumenblau, nie reines Schwarz). Strichstärke ≈ 6 % der Objektgröße, runde Ecken und Enden (`lineJoin/lineCap = round`).
2. **Flach + ein Glanzlicht.** Flächen sind einfarbig. Dazu kommt oben links ein weiches, halbtransparentes weißes Glanzlicht. Kein Verlauf über das ganze Objekt, außer bei Blobs (Glibber darf glänzen).
3. **Licht von oben links.** Schatten liegen unten rechts, als weiche dunkle Ellipse auf dem Boden (Tinte, 25 % Deckkraft).
4. **Runde Formen.** Ecken haben mindestens 20 % Radius. Spitz sind nur Splitter, Blitze und Sterne.
5. **Pseudo-3D.** Inseln haben eine sichtbare Seitenwand (ca. 26 Welt-Einheiten tief, 35 % dunkler als die Oberfläche) und eine Gischtlinie am Wasser. Objekte auf der Insel werfen Schatten.
6. **Bewegung mit Übertreibung.** Squash & Stretch, Nachschwabbeln, Überschwingen beim Erscheinen (`cubic-bezier(.34, 1.56, .64, 1)`).
7. **Keine Emojis.** Alles wird im Code gezeichnet (`js/art/icons.js`). So sieht es auf iPhone, Android und Windows gleich aus. Das gilt auch für Knöpfe und Karten in der Oberfläche: Sie bekommen dieselben gezeichneten Symbole als Bild.

## Palette

| Name | Farbe | Verwendung |
|---|---|---|
| Tinte | `#2A1B3D` | Konturen, Schrift auf hellem Grund, Augen |
| Papier | `#FFF6E5` | Kartenfläche, helle Schrift |
| Meer | `#2C8FC9` → `#13406E` | Wasser, von der Mitte nach außen dunkler |
| Gischt | `#EAF7FF` | Brandung, Spritzer |
| Sonne | `#FFC93C` | Akzent, Hauptknöpfe, Punkte |
| Koralle | `#FF6B6B` | Warnung, Gefahr |
| Minze | `#5ED6A0` | Erfolg, Rettung, Pups |
| Nacht | `#1E1B3A` | Panels der Oberfläche (90 % Deckkraft) |
| Nebel | `#A9A3C9` | gedämpfte Schrift |

## Spielerfarben (farbenblind-freundlich)

Abgeleitet von der Okabe-Ito-Palette, die auch bei Rot-Grün-Schwäche unterscheidbar bleibt. Zusätzlich hat **jede Farbe ein festes Muster** auf dem Blob. Damit sind die Spieler auch ohne Farbsehen unterscheidbar, das Muster steht auch am Namensschild.

| Platz | Farbe | Name | Muster |
|---|---|---|---|
| 1 | `#E8603C` | Zinnober | Punkte |
| 2 | `#4DB3EA` | Himmel | Streifen |
| 3 | `#F4D54A` | Zitrone | Sterne |
| 4 | `#17A37A` | Smaragd | Zickzack |
| 5 | `#CC79A7` | Flieder | Ringe |
| 6 | `#3A5FBF` | Kobalt | Sommersprossen |

## Inselthemen

Jede Insel hat ein eigenes Thema mit eigener Palette (Oberfläche, Rand, Seitenwand, Deko):

| Insel | Thema | Oberfläche | Deko |
|---|---|---|---|
| Rundinsel | Tropen | Gras | Grasbüschel, Blümchen |
| Kistenland | Kistenstapel | Holzbohlen | Bretterfugen, Nägel |
| Drehkreuz | Schrottplatz | Blech | Nieten, Warnstreifen am Rand |
| Brückeninseln | Tropen + Holzbrücke | Gras / Planken | Büschel, Seile |
| Archipel | Sandbank | Sand | Muscheln, Seesterne |
| Ringinsel | Vulkan | dunkler Fels | Glutadern, Lava im Krater |
| Karussell | Süßigkeiten | rosa Zuckerguss | Streusel |
| Seestern | Korallenriff | Koralle | Saugnäpfe |
| Kartoffelinsel | Acker | Erde | Furchen, Kartoffeln |
| Wippe | Holzfloß | Bretter | Fugen, Seilknoten |

Die Karte „Eisbahn“ verwandelt jede Insel in eine **Eisscholle**.

## Gesichter

Blobs zeigen ihre Lage im Gesicht:

| Ausdruck | Wann |
|---|---|
| neutral | normal |
| angestrengt | Aufladen, Stemmen (zusammengekniffene Augen, Brauen) |
| Panik | Kantenwackeln (große Augen, kleiner Pupillen, „O“-Mund) |
| selbstgefällig | mit Krone (halb geschlossene Augen, Grinsen) |
| benommen | nach Treffer oder Konter (Spiralaugen) |
| triumphierend | Rundensieg, Siegerehrung (zugekniffene Lachaugen, offener Mund) |

## Schrift

- **Lilita One** für Überschriften, Namen und große Einblendungen
- **Nunito** (600/800) für alles andere

Schrift auf dem Spielfeld bekommt immer eine Tinten-Kontur.

## Ton

- **Musik:** Dur-Pentatonik, gezupfte Klänge (Ukulele/Marimba-artig), 112–136 BPM. Die Musik wird dichter und schneller, wenn die Insel schrumpft und im letzten Duell.
- **Effekte:** immer mindestens zwei Schichten (Körper + Textur), z. B. Plumps = fallender Ton + Wasserrauschen + Blubbern.
- **Stimmen:** Jeder Blob hat eine eigene Tonhöhe und brabbelt kurze Silben.
