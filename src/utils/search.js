/**
 * Validate an ICD-10 code format
 * @param {string} code - The code to validate
 * @returns {boolean} - True if valid format, false otherwise
 */
export const isValidICDFormat = (code) => {
  // Format: A00 or A00.0
  return /^[A-Z]\d{2}(\.\d+)?$/.test(code);
};

/**
 * Validate an OPS code format
 * @param {string} code - The code to validate
 * @returns {boolean} - True if valid format, false otherwise
 */
export const isValidOPSFormat = (code) => {
  // Erweiterte Validierung für OPS-Codes:
  // - Beginnt mit Ziffer-Bindestrich-Ziffern: \d-\d+
  // - Kann Buchstaben im Hauptteil haben: [a-z]*
  // - Kann optional einen Punkt haben, gefolgt von:
  //   - Ziffern und/oder Buchstaben: [a-z0-9]+
  // 
  // Beispiele:
  // - 1-20 (einfacher Code)
  // - 1-202.00 (Code mit Dezimalstelle)
  // - 1-20a.31 (Code mit Buchstabe und Dezimalstelle)
  // - 1-20b (Code mit Buchstabe ohne Dezimalstelle)
  // - 1-20c.x, 1-20c.y (Code mit Buchstaben nach dem Punkt)
  return /^\d-\d+[a-z]*(\.[a-z0-9]+)?$/i.test(code);
};

/**
 * Erweiterte Normalisierung für OPS-Codes, um verschiedene Eingabeformate zu unterstützen
 * @param {string} code - Der zu normalisierende Code
 * @returns {string} - Korrekt formatierter OPS-Code
 */
export const normalizeOPSCode = (code) => {
  // Zuerst grundlegende Normalisierung durchführen
  let normalized = normalizeCode(code);
  
  // Prüfen, ob es bereits ein korrekt formatierter OPS-Code ist
  if (isValidOPSFormat(normalized)) {
    return normalized;
  }
  
  // Fall 1: Nur der Bindestrich fehlt (z.B. "538a.90")
  if (/^\d{2,}[a-z]?\.\d+$/i.test(normalized)) {
    normalized = normalized.replace(/^(\d)/, '$1-');
    return normalized;
  }
  
  // Fall 2: Nur der Punkt fehlt (z.B. "5-38a90")
  if (/^\d-\d{2,3}[a-z]?\d+$/i.test(normalized)) {
    const match = normalized.match(/^(\d-\d{2,3}[a-z]?)(\d+)$/i);
    if (match) {
      const basisCode = match[1]; // z.B. "5-38a"
      const restCode = match[2];  // z.B. "90"
      normalized = `${basisCode}.${restCode}`;
      return normalized;
    }
  }
  
  // Fall 3: Kompakte Form ohne Trennzeichen (z.B. "538a90")
  if (/^\d{3,}[a-z0-9]*$/i.test(normalized)) {
    // Bindestrich nach der ersten Ziffer einfügen
    normalized = normalized.replace(/^(\d)/, '$1-');
    
    // Ermitteln, wo der Punkt eingefügt werden soll
    // Regel: Nach dem Buchstaben, oder nach den ersten 2-3 Ziffern, wenn kein Buchstabe vorhanden ist
    const match = normalized.match(/^\d-(\d{2,3}[a-z]?)([0-9a-z]*)$/i);
    
    if (match) {
      const basisCode = match[1]; // z.B. "38a" oder "38"
      const restCode = match[2];  // z.B. "90"
      
      // Nur Punkt hinzufügen, wenn restCode nicht leer ist
      if (restCode && restCode.length > 0) {
        normalized = `${normalized.substring(0, normalized.indexOf(basisCode) + basisCode.length)}.${restCode}`;
      }
    }
  }
  
  return normalized;
};

/**
 * Normalize a code by removing non-alphanumeric characters
 * @param {string} code - The code to normalize
 * @returns {string} - Normalized code
 */
export const normalizeCode = (code) => {
  // Keep only alphanumeric characters and dots
  return code.replace(/[^A-Za-z0-9.-]/g, '');
};

/**
 * Parse user input into an array of codes
 * @param {string} input - User input
 * @returns {string[]} - Array of individual codes
 */
export const parseUserInput = (input) => {
  // Split by comma, semicolon, newline, or space
  const codes = input.split(/[,;\n\s]+/)
    .map(code => code.trim())
    .filter(code => code.length > 0);
  
  // Remove duplicates
  const uniqueCodes = [...new Set(codes)];
  const duplicatesRemoved = codes.length - uniqueCodes.length;
  
  return {
    codes: uniqueCodes,
    duplicatesRemoved
  };
};

/**
 * Check if a code is a wildcard search
 * @param {string} code - The code to check
 * @returns {boolean} - True if wildcard, false otherwise
 */
export const isWildcardSearch = (code) => {
  // Sowohl * als auch % als Wildcard-Zeichen erkennen
  return code.includes('*') || code.includes('%');
};

/**
 * Convert wildcard pattern to regex
 * @param {string} pattern - Wildcard pattern
 * @returns {RegExp} - Regular expression
 */
export const wildcardToRegex = (pattern) => {
  // Ersetze sowohl * als auch % mit regex .*
  const regexPattern = pattern
    .replace(/\*/g, '.*')
    .replace(/%/g, '.*');
  
  return new RegExp(`^${regexPattern}$`);
};

/**
 * Find all codes matching a wildcard pattern
 * @param {string} pattern - Wildcard pattern
 * @param {Object} codeMap - Map of all codes
 * @returns {string[]} - Array of matching codes
 */
export const findWildcardMatches = (pattern, codeMap) => {
  const regex = wildcardToRegex(pattern);
  
  return Object.keys(codeMap).filter(code => {
    return regex.test(code);
  });
};

/**
 * Find all child codes for a non-terminal ICD code
 * @param {string} parentCode - The parent code
 * @param {Object} allCodes - Map of all codes
 * @returns {string[]} - Array of child codes
 */
export const findChildICDCodes = (parentCode, allCodes) => {
  // Normalisiere den Code für den Vergleich
  const normalizedParentCode = normalizeCode(parentCode);
  
  return Object.keys(allCodes).filter(code => {
    // Exact match
    if (code === normalizedParentCode) return true;
    
    // Check if it's a direct child (like L40.7 -> L40.70)
    if (code.startsWith(normalizedParentCode + '.') || 
        code.startsWith(normalizedParentCode.split('.')[0] + '.') && 
        code.includes(normalizedParentCode.replace('.', ''))) {
      return true;
    }
    
    // Für ICD-Codes wie L40.7 -> L40.70, vergleiche ohne den Punkt
    const withoutDotParent = normalizedParentCode.replace('.', '');
    const withoutDotChild = code.replace('.', '');
    
    if (withoutDotChild.startsWith(withoutDotParent) && 
        withoutDotChild !== withoutDotParent) {
      return true;
    }
    
    return false;
  });
};

/**
 * Find all child codes for a non-terminal OPS code
 * @param {string} parentCode - The parent code
 * @param {Object} codeMap - Map of all codes
 * @returns {string[]} - Array of child codes
 */
export const findChildOPSCodes = (parentCode, codeMap) => {
  // Verschiedene Arten von Kindcodes bei OPS:
  // 1. Codes, die mit dem Elterncode + Punkt beginnen: 1-20.0, 1-20.1 für 1-20
  // 2. Codes, die mit dem Elterncode + Buchstabe beginnen: 1-20a, 1-20b für 1-20
  // 3. Codes, die mit dem Elterncode + Buchstabe + Punkt beginnen: 1-20a.31 für 1-20a
  
  const childCodes = Object.keys(codeMap).filter(code => {
    // Exakter Match, aber als nicht-endstellig markiert
    if (code === parentCode && codeMap[code].isNonTerminal) {
      return true;
    }
    
    // Kindcodes, die mit dem Elterncode beginnen
    if (code !== parentCode && (
        code.startsWith(parentCode + '.') || 
        code.startsWith(parentCode) && /[a-z]/i.test(code.substring(parentCode.length, parentCode.length + 1)) ||
        code.startsWith(parentCode) && /\d/.test(code.substring(parentCode.length, parentCode.length + 1))
    )) {
      return true;
    }
    
    return false;
  });
  
  console.log(`Finding child codes for OPS ${parentCode}, found ${childCodes.length} children`);
  console.log('Child codes found for ' + parentCode + ':', childCodes);
  return childCodes;
};

/**
 * Find the chapter for an ICD code
 * @param {string} code - The ICD code
 * @param {Object} codeMap - Map of all ICD codes
 * @param {Object} chaptersMap - Map of chapters
 * @returns {string} - Chapter description or empty string if not found
 */
export const findICDChapter = (code, codeMap, chaptersMap) => {
  if (!code || !codeMap[code] || !chaptersMap) return '';
  
  // Hole die Kapitelnummer aus den Codedaten
  const kapitelNr = codeMap[code].kapitel;
  
  // Wenn keine Kapitelnummer vorhanden ist, zurück leeren String
  if (!kapitelNr) return '';
  
  // Formatiere die Kapitelnummer als zweistellig (falls nicht bereits so)
  const formattedKapitelNr = kapitelNr.padStart(2, '0');
  
  // Hole die Kapitelbeschreibung
  return chaptersMap[formattedKapitelNr] ? chaptersMap[formattedKapitelNr].description : '';
};

/**
 * Find the group for an ICD code
 * @param {string} code - The ICD code
 * @param {Object} groupsMap - Map of groups
 * @returns {string} - Group description or empty string if not found
 */
export const findICDGroup = (code, groupsMap) => {
  // Extract the base code (A00 from A00.1)
  const baseCode = code.split('.')[0];
  
  // Find the group where the code falls between start and end
  for (const groupKey in groupsMap) {
    const group = groupsMap[groupKey];
    if (baseCode >= group.start && baseCode <= group.end) {
      return group.description;
    }
  }
  
  return '';
};

/**
 * Find the chapter for an OPS code
 * @param {string} code - The OPS code
 * @param {Object} chaptersMap - Map of chapters
 * @returns {string} - Chapter description or empty string if not found
 */
export const findOPSChapter = (code, chaptersMap) => {
  // OPS codes start with the chapter number, e.g., "1-20" is in chapter "1"
  const chapterId = code.split('-')[0];
  
  return chaptersMap[chapterId] ? chaptersMap[chapterId].description : '';
};

/**
 * Find the group for an OPS code
 * @param {string} code - The OPS code
 * @param {Object} groupsMap - Map of groups
 * @returns {string} - Group description or empty string if not found
 */
export const findOPSGroup = (code, groupsMap) => {
  // Extract base code (1-20 from 1-202.00)
  const parts = code.split('.');
  let baseCode = parts[0];
  
  // If it's a detailed code like 1-202, we need the base group like 1-20
  if (baseCode.match(/\d-\d{3}/)) {
    baseCode = baseCode.substring(0, 4); // Get 1-20 from 1-202
  }
  
  // Find the exact group or a parent group
  if (groupsMap[baseCode]) {
    return groupsMap[baseCode].description;
  }
  
  // If not found, try to find a parent group
  for (const groupKey in groupsMap) {
    if (baseCode.startsWith(groupKey)) {
      return groupsMap[groupKey].description;
    }
  }
  
  return '';
};

/**
 * Find the three-digit code for an OPS code
 * @param {string} code - The OPS code
 * @param {Object} dreistellerMap - Map of three-digit codes
 * @returns {string} - Three-digit code description or empty string if not found
 */
export const findOPSDreisteller = (code, dreistellerMap) => {
  // Extract the three-digit part from codes like 1-202.00 -> 1-202
  const dreistellerCode = code.split('.')[0];
  
  if (dreistellerMap[dreistellerCode]) {
    return dreistellerMap[dreistellerCode].description;
  }
  
  // If not found, it might be a parent code itself
  if (dreistellerCode.match(/\d-\d{2}$/)) {
    return dreistellerMap[dreistellerCode] ? dreistellerMap[dreistellerCode].description : '';
  }
  
  return '';
};

/**
 * Erkennt, ob ein Code ein ICD oder OPS Code ist
 * @param {string} code - Der zu prüfende Code
 * @returns {string} - 'icd', 'ops' oder 'unknown'
 */
export const detectCodeType = (code) => {
  // Normalisieren
  const normalized = normalizeCode(code);
  
  // Wenn der Code mit einem Buchstaben beginnt, ist es ein ICD-Code
  if (/^[A-Z]/.test(normalized)) {
    return 'icd';
  }
  
  // Wenn der Code mit einer Zahl beginnt und dem OPS-Muster entspricht, ist es ein OPS-Code
  if (/^\d/.test(normalized)) {
    // Erweiterte Erkennung für kompakte OPS-Codes ohne Trennzeichen
    if (/^\d{3,}[a-z0-9]*$/i.test(normalized)) {
      return 'ops';
    }
    return 'ops';
  }
  
  // Wenn nichts zutrifft, ist der Typ unbekannt
  return 'unknown';
};

/**
 * Prüft, ob eine Liste von Codes gemischte Typen enthält
 * @param {Array<string>} codes - Liste der zu prüfenden Codes
 * @returns {Object} - Enthält Informationen über die erkannten Codetypen
 */
export const analyzeCodeTypes = (codes) => {
  let hasICD = false;
  let hasOPS = false;
  let unknownCodes = [];
  
  for (const code of codes) {
    const type = detectCodeType(code);
    
    if (type === 'icd') {
      hasICD = true;
    } else if (type === 'ops') {
      hasOPS = true;
    } else {
      unknownCodes.push(code);
    }
  }
  
  return {
    hasICD,
    hasOPS,
    unknownCodes,
    isMixed: hasICD && hasOPS,
    type: hasICD && !hasOPS ? 'icd' : !hasICD && hasOPS ? 'ops' : 'mixed'
  };
};

/**
 * Findet den Dreisteller-Bereich für einen OPS-Code
 * @param {string} code - Der OPS-Code
 * @param {Object} dreistellerMap - Map der Dreisteller-Bereiche
 * @returns {Object|null} - Dreisteller-Informationen oder null wenn nicht gefunden
 */
export const findDreistellerRange = (code, dreistellerMap) => {
  if (!code || !dreistellerMap) {
    return null;
  }
  
  // Extrahiere den Dreisteller-Teil (z.B. "5-59" aus "5-590")
  const match = code.match(/^(\d-\d{2})/);
  if (!match) {
    return null;
  }
  
  const dreistellerCode = match[1];
  
  // Prüfe, ob der Dreisteller direkt in der Map existiert
  if (dreistellerMap[dreistellerCode]) {
    return dreistellerMap[dreistellerCode];
  }
  
  // Prüfe alle Bereiche in der Map
  for (const key in dreistellerMap) {
    // Überspringe Einträge, die keine Bereichsschlüssel sind
    if (!key.includes('-') || key.length <= 3) {
      continue;
    }
    
    // Bereichsschlüssel haben das Format "startCode-endCode"
    const [startCode, endCode] = key.split('-');
    
    // Prüfe, ob der Dreisteller-Code in diesem Bereich liegt
    if (dreistellerCode >= startCode && dreistellerCode <= endCode) {
      return dreistellerMap[key];
    }
    
    // Alternativ: Prüfe, ob der vollständige Code in diesem Bereich liegt
    if (code >= startCode && code <= endCode) {
      return dreistellerMap[key];
    }
  }
  
  return null;
};

/**
 * Format an ICD code by inserting a dot after the third character if missing
 * @param {string} code - The ICD code to format
 * @returns {string} - Properly formatted ICD code
 */
export const formatICDCode = (code) => {
  // Bereits formatiert (enthält einen Punkt)
  if (code.includes('.')) {
    return code;
  }
  
  // Code ist länger als 3 Zeichen und beginnt mit einem Buchstaben
  if (code.length > 3 && /^[A-Z]/.test(code)) {
    // Punkt nach der dritten Stelle einfügen
    return code.substring(0, 3) + '.' + code.substring(3);
  }
  
  return code;
};

/**
 * Format an OPS code by:
 * 1. Inserting a hyphen after the first digit if missing
 * 2. Inserting a dot at the correct position if missing
 * @param {string} code - The OPS code to format
 * @returns {string} - Properly formatted OPS code
 */
export const formatOPSCode = (code) => {
  // Nutze die neue erweiterte Normalisierung
  return normalizeOPSCode(code);
}; 