/**
 * Validate an ICD-10 code format
 * @param {string} code - The code to validate
 * @returns {boolean} - True if valid format, false otherwise
 */
export const isValidICDFormat = (code) => {
  // Format: A00 or A00.0 - now case insensitive
  return /^[A-Za-z]\d{2}(\.\d+)?$/.test(code);
};

/**
 * Validate an OPS code format (including extended variants)
 * @param {string} code - The code to validate
 * @returns {boolean} - True if valid format, false otherwise
 */
export const isValidOPSFormat = (code) => {
  return /^(\d-\d+[a-z]*|\d{4,}[a-z]*)(\.[a-z0-9]+)?$/i.test(code);
};

/**
 * Erweiterte Normalisierung für OPS-Codes, um verschiedene Eingabeformate zu unterstützen
 * @param {string} code - Der zu normalisierende Code
 * @returns {string} - Korrekt formatierter OPS-Code
 */
export const normalizeOPSCode = (code) => {
  // Basic normalization
  let normalized = normalizeCode(code);
  
  console.log(`Normalizing OPS code: "${code}" (after basic normalization: "${normalized}")`);
  
  // ROBUSTERE IMPLEMENTIERUNG: Für Codes mit Buchstaben an vierter Stelle MIT nachfolgenden Ziffern
  if (/^\d\d{2}[a-z]\d+$/i.test(normalized)) {
    // Für Eingabe wie "598c2" -> "5-98c.2"
    const firstDigit = normalized.charAt(0);
    const restDigits = normalized.substring(1);
    
    // Finde den ersten Buchstaben nach den Ziffern
    const letterMatch = restDigits.match(/^(\d+)([a-z])(\d+)$/i);
    if (letterMatch) {
      const [, digits, letter, lastDigits] = letterMatch;
      const result = `${firstDigit}-${digits}${letter}.${lastDigits}`;
      console.log(`Normalized with robust pattern: "${code}" -> "${result}"`);
      return result;
    }
  }
  
  // NEUER FALL: Für Codes mit Buchstaben an vierter Stelle OHNE nachfolgende Ziffern
  if (/^\d\d{2}[a-z]$/i.test(normalized)) {
    // Für Eingabe wie "598c" -> "5-98c"
    const firstDigit = normalized.charAt(0);
    const restDigits = normalized.substring(1);
    
    // Extrahiere die Ziffern und den Buchstaben
    const match = restDigits.match(/^(\d+)([a-z])$/i);
    if (match) {
      const [, digits, letter] = match;
      const result = `${firstDigit}-${digits}${letter}`;
      console.log(`Normalized with robust pattern (no trailing digits): "${code}" -> "${result}"`);
      return result;
    }
  }
  
  // Special case for pure numeric codes like "53780"
  const pureNumericPattern = /^(\d)(\d{3})(\d+)$/;
  if (pureNumericPattern.test(normalized)) {
    const matches = normalized.match(pureNumericPattern);
    const firstDigit = matches[1];  // 5
    const midDigits = matches[2];   // 378
    const lastDigits = matches[3];  // 0
    
    const result = `${firstDigit}-${midDigits}.${lastDigits}`;
    console.log(`Normalized numeric case: "${code}" -> "${result}"`);
    return result;
  }
  
  // Special case for codes with letters after numeric part, like "5378a" or "5378ab"
  const numericWithLetterSuffix = /^(\d)(\d{3})([a-z]{1,2})$/i;
  if (numericWithLetterSuffix.test(normalized)) {
    const matches = normalized.match(numericWithLetterSuffix);
    const firstDigit = matches[1];  // 5
    const midDigits = matches[2];   // 378
    const letters = matches[3];     // a or ab
    
    const result = `${firstDigit}-${midDigits}.${letters}`;
    console.log(`Normalized numeric with letter suffix: "${code}" -> "${result}"`);
    return result;
  }
  
  // Special case for mixed patterns like "5378a2" 
  const mixedPattern = /^(\d)(\d{3})([a-z])(\d{1,2})$/i;
  if (mixedPattern.test(normalized)) {
    const matches = normalized.match(mixedPattern);
    const firstDigit = matches[1];  // 5
    const midDigits = matches[2];   // 378
    const letter = matches[3];      // a
    const finalDigits = matches[4]; // 2
    
    // Handle this as: "5-378.a2" (letter and number after the dot)
    const result = `${firstDigit}-${midDigits}.${letter}${finalDigits}`;
    console.log(`Normalized mixed pattern: "${code}" -> "${result}"`);
    return result;
  }
  
  // Special case for "5378b8" or "5-378b8" pattern - with or without hyphen
  const patternWithLetterAndNumber = /^(\d)[-]?(\d+)([a-z])(\d+)$/i;
  if (patternWithLetterAndNumber.test(normalized)) {
    const matches = normalized.match(patternWithLetterAndNumber);
    const firstDigit = matches[1];
    const midDigits = matches[2];
    const letter = matches[3];
    const lastDigits = matches[4];
    
    // Put the dot BEFORE the letter if it's in the middle, 
    // AFTER if it appears to be after the numeric sequence
    if (midDigits.length >= 3) {
      // For patterns like "5378b8" -> "5-378.b8"
      const result = `${firstDigit}-${midDigits}.${letter}${lastDigits}`;
      console.log(`Normalized special case (dot before letter): "${code}" -> "${result}"`);
      return result;
    } else {
      // For patterns where the letter is part of the main code
      // Example: "5-37b8" -> "5-37b.8"
      const result = `${firstDigit}-${midDigits}${letter}.${lastDigits}`;
      console.log(`Normalized special case (dot after letter): "${code}" -> "${result}"`);
      return result;
    }
  }
  
  // Dann erst prüfen, ob es bereits ein korrekt formatierter OPS-Code ist
  if (isValidOPSFormat(normalized)) {
    // Aber auch hier müssen wir sicherstellen, dass der Bindestrich vorhanden ist
    if (!/^\d-/.test(normalized) && /^\d{4,}/.test(normalized)) {
      // Es handelt sich um einen gültigen kompakten OPS-Code ohne Bindestrich
      normalized = normalized.replace(/^(\d)/, '$1-');
    }
    return normalized;
  }
  
  // Rest der vorhandenen Normalisierungslogik...
  
  // Spezialfall für Codes wie "5-378b8" - häufiges Muster mit Bindestrich und Buchstaben
  const specialPattern = /^(\d-\d+)([a-z])(\d+)$/i;
  if (specialPattern.test(normalized)) {
    const [, prefix, letter, suffix] = normalized.match(specialPattern);
    return `${prefix}.${letter}${suffix}`;
  }
  
  // Fall 1: Kein Bindestrich, aber mit Punkt (z.B. "5378.b8")
  if (/^\d{3,}[a-z]*\.[a-z0-9]+$/i.test(normalized)) {
    // Bindestrich nach der ersten Ziffer einfügen
    normalized = normalized.replace(/^(\d)/, '$1-');
    return normalized;
  }
  
  // Fall 2: Mit Bindestrich, aber ohne Punkt (z.B. "5-378b8")
  if (/^\d-\d+[a-z][0-9a-z]*$/i.test(normalized)) {
    // Finde die Position des ersten Buchstabens nach dem Bindestrich
    const match = normalized.match(/^\d-\d+([a-z])([0-9a-z]*)$/i);
    if (match) {
      const prefix = normalized.substring(0, normalized.indexOf(match[1]));
      const letter = match[1];
      const rest = match[2];
      // Füge einen Punkt vor dem Buchstaben ein
      return `${prefix}.${letter}${rest}`;
    }
  }
  
  // Fall 3: Ohne Bindestrich und ohne Punkt, aber mit Buchstabe (z.B. "5378b8")
  if (/^\d{3,}[a-z][0-9a-z]*$/i.test(normalized)) {
    // Finde die Position der ersten Ziffer und des ersten Buchstabens
    const match = normalized.match(/^(\d)(\d{2,})([a-z])([0-9a-z]*)$/i);
    if (match) {
      const firstDigit = match[1];
      const midDigits = match[2];
      const letter = match[3];
      const rest = match[4];
      // Füge Bindestrich und Punkt ein
      return `${firstDigit}-${midDigits}.${letter}${rest}`;
    }
    // Kein Buchstabe mit Zahlen dahinter, nur Bindestrich einfügen
    normalized = normalized.replace(/^(\d)/, '$1-');
  }
  
  // Die bestehenden Normalisierungsfälle beibehalten
  
  // Fall 4: Nur der Bindestrich fehlt, aber Punkt vorhanden (z.B. "538a.90")
  if (/^\d{2,}[a-z]?\.\d+$/i.test(normalized)) {
    normalized = normalized.replace(/^(\d)/, '$1-');
    return normalized;
  }
  
  // Fall 5: Nur der Punkt fehlt (z.B. "5-38a90")
  if (/^\d-\d{2,3}[a-z]?\d+$/i.test(normalized)) {
    const match = normalized.match(/^(\d-\d{2,3}[a-z]?)(\d+)$/i);
    if (match) {
      const basisCode = match[1]; // z.B. "5-38a"
      const restCode = match[2];  // z.B. "90"
      normalized = `${basisCode}.${restCode}`;
      return normalized;
    }
  }
  
  // Fall 6: Kompakte Form ohne Trennzeichen (z.B. "538a90")
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
  
  // Case 3: Without hyphen and without dot (e.g., "53780") - IMPROVED CASE
  if (/^\d{4,}$/.test(normalized)) {
    // This is a pure numeric code without any separators
    // First insert the hyphen after the first digit
    normalized = normalized.replace(/^(\d)/, '$1-');
    
    // Then insert the dot at the appropriate position (after the first 3-4 digits)
    if (normalized.length >= 6) {  // 5-378+rest (at least 1 char after the base)
      normalized = normalized.replace(/^(\d-\d{3})(\d{1,2}|\w{1,2})$/, '$1.$2');
    }
    
    console.log(`Normalized compact numeric case: "${code}" -> "${normalized}"`);
    return normalized;
  }
  
  // Final fallback case for other patterns
  if (!/\./.test(normalized) && normalized.length > 5) {
    // If we haven't added a dot yet and the code is long enough,
    // try to insert a dot after the base code (first 5 chars including hyphen)
    if (/^\d-\d{3}/.test(normalized)) {
      normalized = normalized.replace(/^(\d-\d{3})(.+)$/, '$1.$2');
    }
  }
  
  // Important: Debugging output
  console.log(`Final normalized result for "${code}": "${normalized}"`);
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
 * @returns {Object} - Object with unique codes and info about duplicates
 */
export const parseUserInput = (input) => {
  // Split by comma, semicolon, newline, or space
  const codes = input.split(/[,;\n\s]+/)
    .map(code => code.trim())
    .filter(code => code.length > 0);
  
  // Remove duplicates - use case-insensitive comparison 
  const uniqueMap = new Map();
  const duplicateTracker = {}; // Zum Verfolgen der Duplikate
  
  codes.forEach(code => {
    // Für den Vergleich normalisierte Version (ohne Suffixe)
    const normalizedCode = code.replace(/:(R|L|B)$/i, '');
    const lowerCode = normalizedCode.toLowerCase();
    
    if (!duplicateTracker[lowerCode]) {
      duplicateTracker[lowerCode] = [];
    }
    duplicateTracker[lowerCode].push(code); // Original-Code mit Suffix speichern
    
    // Original-Code für diese normalisierte Version aktualisieren
    if (!uniqueMap.has(lowerCode)) {
      uniqueMap.set(lowerCode, code);
    }
  });
  
  // Eindeutige Codes sammeln und gleichzeitig Suffixe entfernen
  const uniqueCodes = Array.from(uniqueMap.values())
    .map(code => code.replace(/:(R|L|B)$/i, '')); // Suffixe hier entfernen
  
  const duplicatesRemoved = codes.length - uniqueCodes.length;
  
  // Liste der entfernten Duplikate erstellen
  const removedDuplicatesList = [];
  for (const [lowerCode, instances] of Object.entries(duplicateTracker)) {
    if (instances.length > 1) {
      // Behalte den ersten Eintrag und betrachte die restlichen als Duplikate
      const [kept, ...duplicates] = instances;
      
      removedDuplicatesList.push({
        originalCode: kept, // Beibehaltener Code mit Original-Suffix
        duplicates: duplicates, // Duplizierte Codes mit Original-Suffix
        count: duplicates.length
      });
    }
  }
  
  return {
    codes: uniqueCodes,
    duplicatesRemoved,
    removedDuplicatesList
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
  // Ersetze sowohl * als auch % mit regex .* and make it case-insensitive
  const regexPattern = pattern
    .replace(/\*/g, '.*')
    .replace(/%/g, '.*');
  
  return new RegExp(`^${regexPattern}$`, 'i'); // Add 'i' flag for case-insensitivity
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
    // Convert codes to uppercase for case-insensitive comparison
    const upperCode = code.toUpperCase();
    const upperParentCode = normalizedParentCode.toUpperCase();
    
    // Exact match
    if (upperCode === upperParentCode) return true;
    
    // Check if it's a direct child (like L40.7 -> L40.70)
    if (upperCode.startsWith(upperParentCode + '.') || 
        upperCode.startsWith(upperParentCode.split('.')[0] + '.') && 
        upperCode.includes(upperParentCode.replace('.', ''))) {
      return true;
    }
    
    // Für ICD-Codes wie L40.7 -> L40.70, vergleiche ohne den Punkt
    const withoutDotParent = upperParentCode.replace('.', '');
    const withoutDotChild = upperCode.replace('.', '');
    
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
  // Convert parent code to uppercase for case-insensitive comparison
  const upperParentCode = parentCode.toUpperCase();
  
  const childCodes = Object.keys(codeMap).filter(code => {
    const upperCode = code.toUpperCase();
    
    // Exakter Match, aber als nicht-endstellig markiert
    if (upperCode === upperParentCode && codeMap[code].isNonTerminal) {
      return true;
    }
    
    // Kindcodes, die mit dem Elterncode beginnen
    if (upperCode !== upperParentCode && (
        upperCode.startsWith(upperParentCode + '.') || 
        upperCode.startsWith(upperParentCode) && /[A-Z]/i.test(upperCode.substring(upperParentCode.length, upperParentCode.length + 1)) ||
        upperCode.startsWith(upperParentCode) && /\d/.test(upperCode.substring(upperParentCode.length, upperParentCode.length + 1))
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
    // Convert to uppercase for case-insensitive comparison
    if (baseCode.toUpperCase() >= group.start.toUpperCase() && 
        baseCode.toUpperCase() <= group.end.toUpperCase()) {
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
  if (!code || !groupsMap) {
    return '';
  }
  
  // Extrahiere die ersten Zeichen des Codes (z.B. "5-38" aus "5-38a.90")
  const codePrefix = code.split('.')[0].match(/^\d-\d{2}/)?.[0];
  
  if (!codePrefix) return '';
  
  // Gruppiere die Daten nach Kapitel für eine effiziente Suche
  const groupsByChapter = {};
  
  // Alle möglichen (End)codes durchlaufen und nach Kapitel gruppieren
  for (const endCode in groupsMap) {
    // Für 5-39 extrahieren wir "5" als Kapitel
    const chapter = endCode.split('-')[0];
    
    if (!groupsByChapter[chapter]) {
      groupsByChapter[chapter] = [];
    }
    
    groupsByChapter[chapter].push({
      endCode,
      description: groupsMap[endCode].description
    });
  }
  
  // Extrahiere das Kapitel des zu suchenden Codes
  const codeChapter = codePrefix.split('-')[0];
  
  // Nur die Gruppen im selben Kapitel durchsuchen
  const relevantGroups = groupsByChapter[codeChapter] || [];
  
  // Finde die passende Gruppe durch numerischen Vergleich
  // Da wir nur die Endcodes haben, suchen wir nach dem ersten Endcode, der größer/gleich unserem Code ist
  for (const group of relevantGroups) {
    // Extrahiere die numerischen Teile für den Vergleich
    const endCodeNum = parseInt(group.endCode.split('-')[1], 10);
    const prefixNum = parseInt(codePrefix.split('-')[1], 10);
    
    // Wenn unser Code-Präfix kleiner oder gleich dem Endcode ist, haben wir eine Gruppe gefunden
    if (prefixNum <= endCodeNum) {
      return group.description;
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
  
  // Convert to uppercase for case-insensitive lookup
  const upperDreistellerCode = dreistellerCode.toUpperCase();
  
  // Case-insensitive lookup in map
  for (const key in dreistellerMap) {
    if (key.toUpperCase() === upperDreistellerCode) {
      return dreistellerMap[key].description;
    }
  }
  
  // If not found, it might be a parent code itself
  if (dreistellerCode.match(/\d-\d{2}$/)) {
    for (const key in dreistellerMap) {
      if (key.toUpperCase() === upperDreistellerCode) {
        return dreistellerMap[key].description;
      }
    }
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
  
  // Wenn der Code mit einem Buchstaben beginnt, ist es ein ICD-Code - now case insensitive
  if (/^[A-Za-z]/.test(normalized)) {
    return 'icd';
  }
  
  // Wenn der Code mit einer Zahl beginnt und dem OPS-Muster entspricht, ist es ein OPS-Code
  if (/^\d/.test(normalized)) {
    // Erweiterte Erkennung für kompakte OPS-Codes ohne Trennzeichen
    if (/^\d{3,}[a-zA-Z0-9]*$/i.test(normalized)) {
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
  const upperDreistellerCode = dreistellerCode.toUpperCase();
  
  // Prüfe, ob der Dreisteller direkt in der Map existiert (case-insensitive)
  for (const key in dreistellerMap) {
    if (key.toUpperCase() === upperDreistellerCode) {
      return dreistellerMap[key];
    }
  }
  
  // Wenn der exakte Dreisteller-Code nicht gefunden wurde, gibt es keine weitere Suche mehr
  // in der neuen Struktur, da es keine Bereiche mehr gibt
  return null;
};

/**
 * Format an ICD code by inserting a dot after the third character if missing
 * @param {string} code - The ICD code to format
 * @returns {string} - Properly formatted ICD code
 */
export const formatICDCode = (code) => {
  // Make sure first letter is uppercase for ICD codes
  let formattedCode = code.charAt(0).toUpperCase() + code.slice(1).toLowerCase();
  
  // Bereits formatiert (enthält einen Punkt)
  if (formattedCode.includes('.')) {
    return formattedCode;
  }
  
  // Code ist länger als 3 Zeichen und beginnt mit einem Buchstaben
  if (formattedCode.length > 3 && /^[A-Za-z]/.test(formattedCode)) {
    // Punkt nach der dritten Stelle einfügen
    return formattedCode.substring(0, 3) + '.' + formattedCode.substring(3);
  }
  
  return formattedCode;
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