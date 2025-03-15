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
      
      // Markieren, ob es sich um einen nicht-endstelligen Code handelt
      const isNonTerminal = originalNotation.includes('.-');
      
      codesMap[kode] = {
        kode,
        beschreibung,
        isNonTerminal
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
    if (parts.length >= 3) {
      // Format: A00;A09;01;Infektiöse Darmkrankheiten
      const startCode = parts[0];
      const endCode = parts[1];
      const description = parts[3];

      groupsMap[`${startCode}-${endCode}`] = {
        start: startCode,
        end: endCode,
        description
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
      
      codesMap[kode] = {
        kode,
        beschreibung,
        isNonTerminal,
        level
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
 * @returns {Object} - Map of OPS three-digit code ranges
 */
export const parseOPSDreisteller = (content) => {
  const lines = content.split('\n').filter(line => line.trim() !== '');
  const dreistellerMap = {};

  lines.forEach(line => {
    const parts = line.split(';');
    if (parts.length >= 4) {
      // Format: 5;5-55;5-59;Andere Operationen an den Harnorganen
      const chapter = parts[0];
      const startCode = parts[1];
      const endCode = parts[2];
      const description = parts[3];

      // Speichere den Bereich als Schlüssel
      const rangeKey = `${startCode}-${endCode}`;
      dreistellerMap[rangeKey] = {
        chapter,
        startCode,
        endCode,
        description,
        isRange: true
      };
      
      // Extrahiere die Basis der Codes (z.B. "5-" aus "5-55")
      const prefix = startCode.split('-')[0] + '-';
      
      // Extrahiere die numerischen Teile (z.B. "55" aus "5-55" und "59" aus "5-59")
      const startNum = parseInt(startCode.split('-')[1], 10);
      const endNum = parseInt(endCode.split('-')[1], 10);
      
      // Speichere jeden einzelnen Dreisteller-Code in diesem Bereich
      for (let i = startNum; i <= endNum; i++) {
        // Formatiere die Nummer mit führender Null, falls nötig (z.B. "05" statt "5")
        const numStr = i.toString().padStart(2, '0');
        const individualCode = `${prefix}${numStr}`;
        
        // Speichere den individuellen Code mit Referenz zum Bereich
        dreistellerMap[individualCode] = {
          chapter,
          rangeKey,
          description,
          isIndividualCode: true
        };
      }
    }
  });

  return dreistellerMap;
}; 