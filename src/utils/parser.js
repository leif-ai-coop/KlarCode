/**
 * Parse ICD-10 codes from a codes file
 * @param {string} content - Content of the ICD-10 codes file
 * @returns {Object} - Map of ICD-10 codes
 */
export const parseICDCodes = (content) => {
  const lines = content.split('\n').filter(line => line.trim() !== '');
  const codesMap = {};

  lines.forEach(line => {
    const parts = line.split(';');
    if (parts.length >= 8) {
      // Format: 3;N;X;01;A00;A00.-;A00;A00;Cholera;Cholera;;;V;V;1-002;2-001;3-003;4-002;001;9;9;9999;9999;9;J;J;J;J
      // Or for subcodes: 4;T;X;01;A00;A00.0;A00.0;A000;Cholera durch Vibrio cholerae O:1, Biovar cholerae;Cholera;...
      const kode = parts[6]; // A00.0 format
      const originalNotation = parts[5]; // A00.- format für nicht-endstellige Codes
      const beschreibung = parts[8];
      const kapitel = parts[3]; // Kapitelnummer im 4. Feld (Index 3)
      
      // Markieren, ob es sich um einen nicht-endstelligen Code handelt
      const isNonTerminal = originalNotation.includes('.-');
      
      // Feld 13: Verwendung der Schlüsselnummer nach Paragraph 295
      let usage295 = '-';
      if (parts.length > 12) {
        switch (parts[12]) {
          case 'P': usage295 = 'Primärverschlüsselung zugelassen'; break;
          case 'O': usage295 = 'Nur als Sternschlüsselnummer'; break;
          case 'Z': usage295 = 'Nur als Ausrufezeichenschlüsselnummer'; break;
          case 'V': usage295 = 'Nicht zur Verschlüsselung zugelassen'; break;
          default: usage295 = parts[12] || '-';
        }
      }
      
      // Feld 14: Verwendung der Schlüsselnummer nach Paragraph 301
      let usage301 = '-';
      if (parts.length > 13) {
        switch (parts[13]) {
          case 'P': usage301 = 'Primärverschlüsselung zugelassen'; break;
          case 'O': usage301 = 'Nur als Sternschlüsselnummer'; break;
          case 'Z': usage301 = 'Nur als Ausrufezeichenschlüsselnummer'; break;
          case 'V': usage301 = 'Nicht zur Verschlüsselung zugelassen'; break;
          default: usage301 = parts[13] || '-';
        }
      }
      
      // Feld 20: Geschlechtsbezug der Schlüsselnummer
      let genderRestriction = '-';
      if (parts.length > 19) {
        switch (parts[19]) {
          case '9': genderRestriction = 'Kein Geschlechtsbezug'; break;
          case 'M': genderRestriction = 'Nur männlich'; break;
          case 'W': genderRestriction = 'Nur weiblich'; break;
          default: genderRestriction = parts[19] || '-';
        }
      }
      
      // Feld 22: Untere Altersgrenze
      let minAge = '-';
      if (parts.length > 21 && parts[21] !== '9999') {
        const ageValue = parts[21];
        if (ageValue.startsWith('t')) {
          const days = parseInt(ageValue.substring(1), 10);
          minAge = `Ab ${days} ${days === 1 ? 'Tag' : 'Tagen'}`;
        } else if (ageValue.startsWith('j')) {
          const years = parseInt(ageValue.substring(1), 10);
          minAge = `Ab ${years} ${years === 1 ? 'Jahr' : 'Jahren'}`;
        } else {
          minAge = ageValue;
        }
      }
      
      // Feld 23: Obere Altersgrenze
      let maxAge = '-';
      if (parts.length > 22 && parts[22] !== '9999') {
        const ageValue = parts[22];
        if (ageValue.startsWith('t')) {
          const days = parseInt(ageValue.substring(1), 10);
          maxAge = `Bis ${days} ${days === 1 ? 'Tag' : 'Tagen'}`;
        } else if (ageValue.startsWith('j')) {
          const years = parseInt(ageValue.substring(1), 10);
          maxAge = `Bis ${years} ${years === 1 ? 'Jahr' : 'Jahren'}`;
        } else {
          maxAge = ageValue;
        }
      }
      
      // Feld 24: Art des Fehlers bei Altersbezug
      let ageError = '-';
      if (parts.length > 23) {
        switch (parts[23]) {
          case '9': ageError = 'Irrelevant'; break;
          case 'M': ageError = 'Muss-Fehler'; break;
          case 'K': ageError = 'Kann-Fehler'; break;
          default: ageError = parts[23] || '-';
        }
      }
      
      // Feld 27: IfSG-Meldung
      const ifsgReportingRaw = parts.length > 26 ? parts[26] : '';
      const ifsgReporting = ifsgReportingRaw.trim() === 'J' ? 'Ja' : 
                            ifsgReportingRaw.trim() === 'N' ? 'Nein' : '-';
      
      // Feld 28: IfSG-Labor
      const ifsgLab = parts.length > 27 ? 
        (parts[27] === 'J' ? 'Ja' : 
         parts[27] === 'N' ? 'Nein' : '-') : '-';
      
      codesMap[kode] = {
        kode,
        beschreibung,
        isNonTerminal,
        kapitel, // Kapitelinformation speichern
        // Neue Felder
        usage295,
        usage301,
        genderRestriction,
        minAge,
        maxAge,
        ageError,
        ifsgReporting,
        ifsgLab
      };
    }
  });

  return codesMap;
};

/**
 * Parse ICD-10 groups from a group file
 * @param {string} content - Content of the ICD-10 groups file
 * @returns {Object} - Map of ICD-10 groups
 */
export const parseICDGroups = (content) => {
  const lines = content.split('\n').filter(line => line.trim() !== '');
  const groupsMap = {};

  lines.forEach(line => {
    const parts = line.split(';');
    if (parts.length >= 4) {
      // Format: A00;A09;01;Infektiöse Darmkrankheiten
      const startCode = parts[0];
      const endCode = parts[1];
      const chapterId = parts[2]; // third column contains the chapter number (e.g., "01")
      const description = parts[3];

      groupsMap[`${startCode}-${endCode}`] = {
        // original fields
        start: startCode,
        end: endCode,
        description,
        // aliases / additional data expected by other components
        rangeStart: startCode,
        rangeEnd: endCode,
        chapter: chapterId
      };
    }
  });

  return groupsMap;
};

/**
 * Parse ICD-10 chapters from a chapter file
 * @param {string} content - Content of the ICD-10 chapters file
 * @returns {Object} - Map of ICD-10 chapters
 */
export const parseICDChapters = (content) => {
  const lines = content.split('\n').filter(line => line.trim() !== '');
  const chaptersMap = {};

  lines.forEach(line => {
    const parts = line.split(';');
    if (parts.length >= 2) {
      // Format: 01;Bestimmte infektiöse und parasitäre Krankheiten
      const id = parts[0];
      const description = parts[1];

      chaptersMap[id] = {
        id,
        description
      };
    }
  });

  return chaptersMap;
};

/**
 * Parse OPS codes from a codes file
 * @param {string} content - Content of the OPS codes file
 * @returns {Object} - Map of OPS codes
 */
export const parseOPSCodes = (content) => {
  const lines = content.split('\n').filter(line => line.trim() !== '');
  const codesMap = {};

  lines.forEach(line => {
    const parts = line.split(';');
    if (parts.length >= 9) { // Mind. 9 Teile für gültige OPS-Zeile
      const kode = parts[6]; // z.B. 1-20a.31
      const beschreibung = parts[8];
      const level = parseInt(parts[0], 10); // Die erste Zahl gibt das Level an (4, 5, 6 usw.)
      
      // Ein Code mit niedrigerem Level und/oder ohne Punkt ist wahrscheinlich ein übergeordneter Code
      const isNonTerminal = level < 6 || !kode.includes('.');
      
      // Extrahiere die zusätzlichen Felder
      const terminalCode = parts[1] === 'T' ? 'Ja' : 'Nein';
      
      // Feld 8 (Index 7): Seitenangabe erforderlich
      const sideRequired = parts.length > 7 && parts[7] === 'J' ? 'Ja' : 'Nein';
      
      // Feld 13 (Index 12): Gültigkeit nach § 17d KHG
      let validityKHG = '-';
      if (parts.length > 12) {
        switch (parts[12]) {
          case '0': validityKHG = 'Gültig nach § 17b KHG'; break;
          case '1': validityKHG = 'Gültig nach § 17d KHG'; break;
          case '2': validityKHG = 'Gültig nach § 17b und § 17d KHG'; break;
          case '3': validityKHG = 'Nicht gültig nach § 17b und § 17d KHG'; break;
          default:
            console.warn(`Unbekannter Gültigkeitswert für KHG in parseOPSCodes: ${parts[12]}`);
            validityKHG = '-'; // Explizit auf Standardwert setzen
            break;
        }
      }
      
      // Feld 14 (Index 13): Zusatzkode
      const isAdditionalCode = parts.length > 13 ? 
        (parts[13] === 'J' ? 'Ja' : 
         parts[13] === 'N' ? 'Nein' : '-') : '-';
      
      // Feld 15 (Index 14): Einmalkode - KORRIGIERTE IMPLEMENTIERUNG
      let isOneTimeCode = '-';
      if (parts.length > 14) {
        // Trim zum Entfernen möglicher Whitespaces oder Zeilenumbrüche
        const oneTimeValue = parts[14].trim();
        isOneTimeCode = oneTimeValue === 'J' ? 'Ja' : 
                        oneTimeValue === 'N' ? 'Nein' : 
                        oneTimeValue === '' ? '-' : oneTimeValue;
      }
      
      // Debug-Ausgabe für das problematische Feld
      console.log(`Code ${kode} - Original Einmalkode Wert: '${parts.length > 14 ? parts[14] : "nicht vorhanden"}', Interpretiert als: ${isOneTimeCode}`);
      
      codesMap[kode] = {
        kode,
        beschreibung,
        isNonTerminal,
        level,
        // Neue Felder
        terminalCode,
        sideRequired,
        validityKHG,
        isAdditionalCode,
        isOneTimeCode
      };
    }
  });

  return codesMap;
};

/**
 * Parse OPS groups from a group file
 * @param {string} content - Content of the OPS groups file
 * @returns {Object} - Map of OPS groups
 */
export const parseOPSGroups = (content) => {
  const lines = content.split('\n').filter(line => line.trim() !== '');
  const groupsMap = {};

  lines.forEach(line => {
    const parts = line.split(';');
    if (parts.length >= 4) {
      // Format: 1;1-10;1-10;Klinische Untersuchung
      const groupCode = parts[2];
      const description = parts[3];

      groupsMap[groupCode] = {
        code: groupCode,
        description
      };
    }
  });

  return groupsMap;
};

/**
 * Parse OPS chapters from a chapter file
 * @param {string} content - Content of the OPS chapters file
 * @returns {Object} - Map of OPS chapters
 */
export const parseOPSChapters = (content) => {
  const lines = content.split('\n').filter(line => line.trim() !== '');
  const chaptersMap = {};

  lines.forEach(line => {
    const parts = line.split(';');
    if (parts.length >= 2) {
      // Format: 1;DIAGNOSTISCHE MASSNAHMEN
      const id = parts[0];
      const description = parts[1];

      chaptersMap[id] = {
        id,
        description
      };
    }
  });

  return chaptersMap;
};

/**
 * Parse OPS three-digit codes from a file
 * @param {string} content - Content of the OPS three-digit codes file
 * @returns {Object} - Map of OPS three-digit codes
 */
export const parseOPSDreisteller = (content) => {
  const lines = content.split('\n').filter(line => line.trim() !== '');
  const dreistellerMap = {};

  lines.forEach(line => {
    const parts = line.split(';');
    if (parts.length >= 4) {
      // Format: 1;1-20;1-31;Funktionsuntersuchungen des Verdauungstraktes
      // Feld 1: Kapitelnummer
      // Feld 2: Erster Dreisteller der Gruppe
      // Feld 3: Dreistellerkode (der eigentliche Code)
      // Feld 4: Dreistellertitel (die Beschreibung)
      const chapter = parts[0];
      const groupCode = parts[1];
      const dreistellerCode = parts[2]; // Der eigentliche Dreistellercode
      const description = parts[3];     // Die Beschreibung

      // Speichere den Dreistellercode mit seiner Beschreibung
      dreistellerMap[dreistellerCode] = {
        chapter,
        groupCode,
        description,
        isIndividualCode: true
      };
      
      // Debug-Ausgabe für Verifikation
      console.log(`Parsed OPS dreisteller: ${dreistellerCode} => "${description}"`);
    }
  });

  return dreistellerMap;
}; 