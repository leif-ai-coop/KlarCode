# Medizinische Codes - ICD/OPS Lookup

Eine Webanwendung zur Suche und Anzeige von medizinischen Codes (ICD-10 und OPS) mit ihren Beschreibungen.

## Funktionen

- Suche nach ICD-10 und OPS Codes
- Anzeige von Code-Beschreibungen, Gruppen, Kapiteln und Dreistellern (OPS)
- Unterstützung für verschiedene Eingabeformate (mit/ohne Sonderzeichen)
- Mehrere Codes gleichzeitig suchen (durch Komma, Semikolon, Leerzeichen oder Zeilenumbruch getrennt)
- Automatische Entfernung von Duplikaten
- Wildcard-Suche (z.B. A0*, 1-20*)
- Erkennung von nicht-endstelligen Codes und Anzeige aller zugehörigen endstelligen Codes
- Sortierbare und filterbare Ergebnistabelle
- Export der Ergebnisse als CSV oder Excel
- Kopieren der Ergebnisse in die Zwischenablage
- Dunkelmodus
- Responsive Design für mobile Geräte
- Jahresauswahl (2025, 2026)
- Clientseitiges Caching der Daten für bessere Performance

## Technologien

- React 19
- Material-UI 6
- Tailwind CSS

## Datenstruktur

Die Anwendung verwendet Textdateien im folgenden Format:

```
daten/
  ├── 2025/
  │   ├── icd10/
  │   └── ops/
  ├── 2026/
  │   ├── icd10/
  │   └── ops/
```

## Installation

1. Repository klonen
2. Abhängigkeiten installieren:
   ```
   npm install
   ```
3. Entwicklungsserver starten:
   ```
   npm start
   ```

## Nutzung

1. Geben Sie einen oder mehrere ICD-10 oder OPS Codes in das Suchfeld ein
2. Wählen Sie das gewünschte Jahr aus
3. Klicken Sie auf "Suchen"
4. Die Ergebnisse werden in einer Tabelle angezeigt
5. Nutzen Sie die Schalter, um zusätzliche Informationen anzuzeigen (Kapitel, Gruppe, Dreisteller)
6. Sortieren Sie die Ergebnisse durch Klicken auf die Spaltenüberschriften
7. Exportieren Sie die Ergebnisse als CSV oder Excel oder kopieren Sie sie in die Zwischenablage

## Gültige Eingabeformate

- ICD: [A-Z]\d{2}(\.\d+)? (z.B. A00, A00.1)
- OPS: \d-\d{2,3}(\.\d{1,2})? (z.B. 1-20, 1-202.00)

## Lizenz

Dieses Projekt ist unter der MIT-Lizenz lizenziert. 