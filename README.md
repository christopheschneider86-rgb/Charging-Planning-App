# ChargeFlow — EV Planner

Eine private, browserbasierte Planungs-App für E-Auto-Fahrer:innen.
Findet Ladesäulen in deiner Nähe, plant Routen entlang echter Straßenwege und
schätzt den Ladezustand pro Stopp anhand deiner Fahrzeugdaten.

**Kein Account. Kein Tracking. Alle Daten bleiben in deinem Browser.**

---

## Features

### Ladesäulen finden
- **Suche nach Adresse, PLZ oder POI-Namen** (z. B. „Berlin Hauptbahnhof",
  „Fashion Place"). Adress-Autocomplete mit 5 Vorschlägen.
- **Mein Standort**: Geolocation-Knopf für die nächsten Ladesäulen.
- **Karte oder Liste**, Vollbild-Karte mit dynamischen Kartenstilen
  (Standard, Dunkel, Satellit, Topo).

### Routenplaner
- **Echte Fahrstrecke** via OSRM, mit Distanz- und Fahrzeit-Anzeige.
- **Ladesäulen entlang der Route** in einem einstellbaren Korridor (±2–25 km).
- **SoC-Berechnung pro Ladestopp** basierend auf deinem aktiven Fahrzeug:
  - Restladung in % an jeder Säule
  - Warnung, wenn die Strecke ohne Laden nicht reicht
  - Farbcodierung (grün/orange/rot) je nach Sicherheitsreserve
- **Routen speichern** (Name, Start, Ziel, Fahrzeug, Start-SoC) und
  per Klick wieder laden.

### Fahrzeuge
- Beliebig viele Fahrzeuge mit Akku-Kapazität, Verbrauch (kWh/100 km) und
  optional max. DC-Ladeleistung.
- Aktives Fahrzeug wählbar; bei mehreren wird das gespeicherte Fahrzeug einer
  Route auf Klick aktiviert.

### Favoriten
- Stationen und Anbieter als Favoriten merken.
- Eigener Tab mit Karten- und Listenansicht.
- **Mit OpenChargeMap abgleichen**: aktualisiert oder entfernt stale Einträge.

### Filter
- Min-Leistung (kW), Anbieter (positiv und ausschließend), nur Verfügbare,
  Entfernung von/bis, Connector-Typen (CCS, Type 2, CHAdeMO, …).
- Aktiv-Filter-Badge zeigt die Anzahl und setzt mit einem Klick zurück.

### Orte
- **Home** und **Arbeit** als Schnellauswahl. Weitere benannte Orte
  („Schwiegereltern", „Lieblingscafé") frei hinterlegbar.
- Chips auf den Tabs für 1-Klick-Suche bzw. Start/Ziel-Belegung.

### Navigation
- Bevorzugte Navi-App in den Einstellungen wählbar: **Google Maps**,
  **Apple Maps** oder **Waze**. Direkter Deeplink aus Marker-Popup und
  Detail-Sheet, mit Möglichkeit auf alternative App umzuschalten.

---

## Tech-Stack

- React 19 + Vite 8
- Leaflet via `react-leaflet` für Karten
- `vite-plugin-pwa` (offline-fähig, installierbar)
- Lucide-Icons
- Datenquellen:
  - **[OpenChargeMap](https://openchargemap.org)** — Ladesäulen-Datenbank (CC-BY-SA 4.0). API-Key kostenlos auf der Seite.
  - **[Nominatim / OpenStreetMap](https://nominatim.org)** — Geocoding & POI-Suche (ODbL).
  - **[OSRM](https://project-osrm.org)** — Routing (öffentlicher Demo-Server, BSD-2).
  - **OpenStreetMap, CARTO, Esri World Imagery, OpenTopoMap** — Kartentiles.

Keine Server-seitige Komponente. Alles läuft im Browser, alle Anfragen gehen
direkt an die obigen APIs.

---

## Lokal entwickeln

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
npm run preview
```

---

## Datenschutz & Lizenz

- Alle Einstellungen (API-Key, Favoriten, Orte, Fahrzeuge, gespeicherte Routen)
  liegen in `localStorage`. Es gibt keinen ChargeFlow-Server, keine Accounts,
  keine Cookies, kein Tracking.
- Anfragen werden direkt vom Browser an OpenChargeMap, Nominatim, OSRM und die
  Karten-Anbieter gesendet. ChargeFlow vermittelt nicht.
- Details: in der App unter **Info & Datenschutz** (Shield-Icon oben rechts).

ChargeFlow ist ein nicht-kommerzielles Hobbyprojekt und wird „wie besehen"
bereitgestellt — siehe Haftungsausschluss in der App.

---

## Roadmap

- Favoriten mit Notizen + Sternen
- Optional: Auth + Cloud-Sync via Firebase (Future)
- Import/Export
