import { 
  parseICDCodes, 
  parseICDGroups, 
  parseICDChapters,
  parseOPSCodes,
  parseOPSGroups,
  parseOPSChapters,
  parseOPSDreisteller
} from '../utils/parser';

import {
  isValidICDFormat,
  isValidOPSFormat,
  normalizeCode,
  parseUserInput,
  isWildcardSearch,
  findWildcardMatches,
  findChildICDCodes,
  findChildOPSCodes,
  findICDChapter,
  findICDGroup,
  findOPSChapter,
  findOPSGroup,
  findOPSDreisteller,
  detectCodeType,
  formatOPSCode,
  formatICDCode,
  findDreistellerRange,
  normalizeOPSCode
} from '../utils/search';

import { normalizeCodeKey } from '../utils/catalogDiff';

// Cache für geladene Daten
const dataCache = {
  icd: {},
  ops: {}
};

/**
 * Get all available years for which data exists
 * @returns {Promise<string[]>} - Promise resolving to array of available years
 */
export const getAvailableYears = async () => {
  try {
    // Relativen Pfad verwenden
    const response = await fetch('./data/jahre.json');
    
    if (!response.ok) {
      throw new Error(`Failed to load years: ${response.status}`);
    }
    
    const verfügbareJahre = await response.json();
    
    // Sortiere die Jahre in absteigender Reihenfolge (neueste zuerst)
    const sortedYears = [...verfügbareJahre].sort((a, b) => b - a);
    console.log("Verfügbare Jahre aus jahre.json (absteigend):", sortedYears);
    return sortedYears;
  } catch (error) {
    console.error("Fehler beim Laden der Jahre:", error);
    return ['2025']; // Fallback
  }
};

/**
 * Get the current year or fallback to the first available year
 * @returns {Promise<string>} - Promise resolving to the current year
 */
export const getCurrentYear = async () => {
  const availableYears = await getAvailableYears();
  const currentYear = new Date().getFullYear().toString();
  
  // Wenn das aktuelle Jahr in den verfügbaren Jahren ist, verwende es
  if (availableYears.includes(currentYear)) {
    return currentYear;
  }
  
  // Ansonsten verwende das erste verfügbare Jahr
  return availableYears[0];
};

/**
 * Load all ICD-10 data for a specific year
 * @param {string} year - The year to load data for
 * @returns {Promise} - Promise resolving to the loaded data
 */
export const loadICDData = async (year) => {
  // Sicherstellen, dass year ein String ist
  if (year instanceof Promise) {
    try {
      year = await year; // Auf die Auflösung des Promise warten
      console.log(`Resolved year promise to: ${year}`);
    } catch (error) {
      console.error("Error resolving year promise:", error);
      throw new Error("Failed to resolve year promise");
    }
  }
  
  // Check if data is already cached
  if (dataCache.icd[year]) {
    return dataCache.icd[year];
  }
  
  try {
    // Relativen Pfad verwenden
    const baseUrl = `./data/${year}/icd10/`;
    
    console.log(`Loading ICD data from: ${baseUrl}`);
    
    // Load all required files
    const codesResponse = await fetch(`${baseUrl}icd10gm${year}syst_kodes.txt`);
    
    if (!codesResponse.ok) {
      console.error(`Failed to load ICD-10 codes: ${codesResponse.status}`);
      throw new Error(`Failed to load ICD-10 data for ${year}`);
    }
    
    console.log("Successfully loaded ICD data!");
    const codes = parseICDCodes(await codesResponse.text());
    
    // Load other files
    const groupsResponse = await fetch(`${baseUrl}icd10gm${year}syst_gruppen.txt`);
    const chaptersResponse = await fetch(`${baseUrl}icd10gm${year}syst_kapitel.txt`);
    
    if (!groupsResponse.ok || !chaptersResponse.ok) {
      throw new Error(`Failed to load ICD-10 groups or chapters for ${year}`);
    }
    
    const groups = parseICDGroups(await groupsResponse.text());
    const chapters = parseICDChapters(await chaptersResponse.text());
    
    // Create a case-insensitive lookup map for codes
    const codeMap = {};
    for (const key in codes) {
      codeMap[key.toUpperCase()] = key;
    }
    
    // Cache the data
    dataCache.icd[year] = { 
      codes, 
      groups, 
      chapters,
      codeMap // Add the case-insensitive map
    };
    
    // Datenzusammenfassung ausgeben
    console.log(`Loaded ${Object.keys(codes).length} ICD codes`);
    return dataCache.icd[year];
  } catch (error) {
    console.error(`Error loading ICD data for ${year}:`, error);
    throw error;
  }
};

/**
 * Load all OPS data for a specific year
 * @param {string} year - The year to load data for
 * @returns {Promise} - Promise resolving to the loaded data
 */
export const loadOPSData = async (year) => {
  // Sicherstellen, dass year ein String ist
  if (year instanceof Promise) {
    try {
      year = await year; // Auf die Auflösung des Promise warten
      console.log(`Resolved year promise to: ${year}`);
    } catch (error) {
      console.error("Error resolving year promise:", error);
      throw new Error("Failed to resolve year promise");
    }
  }
  
  // Check if data is already cached
  if (dataCache.ops[year]) {
    return dataCache.ops[year];
  }
  
  try {
    // Relativen Pfad verwenden
    const baseUrl = `./data/${year}/ops/`;
    
    // Load all required files
    const codesResponse = await fetch(`${baseUrl}ops${year}syst_kodes.txt`);
    const groupsResponse = await fetch(`${baseUrl}ops${year}syst_gruppen.txt`);
    const chaptersResponse = await fetch(`${baseUrl}ops${year}syst_kapitel.txt`);
    const dreistellerResponse = await fetch(`${baseUrl}ops${year}syst_dreisteller.txt`);
    
    if (!codesResponse.ok || !groupsResponse.ok || !chaptersResponse.ok || !dreistellerResponse.ok) {
      throw new Error(`Failed to load OPS data for ${year}`);
    }
    
    const codesText = await codesResponse.text();
    const groupsText = await groupsResponse.text();
    const chaptersText = await chaptersResponse.text();
    const dreistellerText = await dreistellerResponse.text();
    
    // Parse the data
    const codes = parseOPSCodes(codesText);
    const groups = parseOPSGroups(groupsText);
    const chapters = parseOPSChapters(chaptersText);
    const dreisteller = parseOPSDreisteller(dreistellerText);
    
    // Integriere alle Datensätze in eine umfassende Datenstruktur
    const integratedCodes = { ...codes };
    
    // Dreisteller hinzufügen, falls sie noch nicht in der Hauptcodeliste sind
    for (const dreistellerCode in dreisteller) {
      if (!integratedCodes[dreistellerCode]) {
        integratedCodes[dreistellerCode] = {
          kode: dreistellerCode,
          beschreibung: dreisteller[dreistellerCode].description,
          isNonTerminal: true, // Markieren als übergeordneten Code
          isDreisteller: true, // Explizit als Dreisteller kennzeichnen
          level: 3 // Dreisteller sind typischerweise Level 3
        };
      } else {
        // Falls der Code bereits existiert, markiere ihn als Dreisteller
        integratedCodes[dreistellerCode].isDreisteller = true;
      }
    }
    
    // Create case-insensitive lookup maps
    const codeMap = {};
    for (const key in integratedCodes) {
      codeMap[key.toUpperCase()] = key;
    }
    
    const dreistellerMap = {};
    for (const key in dreisteller) {
      dreistellerMap[key.toUpperCase()] = key;
    }
    
    // Cache the data with the integrated codes and case maps
    dataCache.ops[year] = { 
      codes: integratedCodes,
      groups, 
      chapters, 
      dreisteller,
      codeMap,
      dreistellerMap
    };
    
    return dataCache.ops[year];
  } catch (error) {
    console.error(`Error loading OPS data for ${year}:`, error);
    throw error;
  }
};

/**
 * Helper function to find a code in a case-insensitive way
 * @param {string} code - The code to find
 * @param {Object} codeMap - Case-insensitive lookup map
 * @param {Object} codes - Original codes object
 * @returns {Object|null} - The code data or null if not found
 */
const findCodeCaseInsensitive = (code, codeMap, codes) => {
  // Convert to uppercase for lookup
  const upperCode = code.toUpperCase();
  
  // Try to find the original case key
  const originalKey = codeMap[upperCode];
  
  if (originalKey && codes[originalKey]) {
    return {
      found: true,
      codeData: codes[originalKey],
      exactCode: originalKey
    };
  }
  
  return { found: false, codeData: null, exactCode: code };
};

/**
 * Search for ICD-10 codes
 * @param {string} input - User input
 * @param {string} year - The year to search in
 * @param {boolean} showChildCodes - Whether to include child codes in results (default: false)
 * @returns {Promise<SearchResult>} - Promise resolving to search results
 */
export const searchICDCodes = async (input, year, showChildCodes = false) => {
  const results = [];
  const errors = [];
  
  try {
    // Load or get cached data
    const icdData = await loadICDData(year);
    console.log(`ICD Data loaded, ${Object.keys(icdData.codes).length} codes available`);
    
    // Parse user input
    const { codes, duplicatesRemoved } = parseUserInput(input);
    console.log(`Parsed input "${input}" into codes for ICD search:`, codes);
    
    // Process each code
    for (const rawCode of codes) {
      const code = normalizeCode(rawCode);
      
      // Skip non-ICD codes
      if (detectCodeType(code) !== 'icd') {
        console.log(`Skipping non-ICD code: ${code}`);
        continue;
      }
      
      // Formatieren des ICD-Codes
      const formattedCode = formatICDCode(code);
      
      console.log(`Processing ICD code "${rawCode}" (normalized: "${code}", formatted: "${formattedCode}")`);
      
      // Handle wildcard search
      if (isWildcardSearch(formattedCode)) {
        const matchedCodes = findWildcardMatches(formattedCode, icdData.codes);
        
        if (matchedCodes.length === 0) {
          errors.push(`Keine passenden ICD-Codes für Muster: ${rawCode}`);
        } else {
          matchedCodes.forEach(matchedCode => {
            const codeData = icdData.codes[matchedCode];
            results.push({
              kode: matchedCode,
              beschreibung: codeData.beschreibung,
              gruppe: findICDGroup(matchedCode, icdData.groups),
              kapitel: findICDChapter(matchedCode, icdData.codes, icdData.chapters),
              isParent: true,
              hasChildCodes: true,
              isDirectInput: true,
              isEndstellig: !codeData.isNonTerminal && !formattedCode.endsWith('-'),
            });
          });
        }
        continue;
      }
      
      // Validate code format
      if (!isValidICDFormat(formattedCode)) {
        errors.push(`Formatfehler: ICD-Codes müssen im Format A00, A00.1 oder ähnlich eingegeben werden. Ungültig: ${rawCode}`);
        continue;
      }
      
      // Find code case-insensitively
      const { found, codeData, exactCode } = findCodeCaseInsensitive(
        formattedCode, 
        icdData.codeMap, 
        icdData.codes
      );
      
      // Check if code exists directly
      if (found) {
        // Prüfen, ob der Code selbst existiert
        const childCodes = findChildICDCodes(exactCode, icdData.codes);
        
        // Prüfen, ob es tatsächlich Kind-Codes gibt, die nicht der Code selbst sind
        const hasRealChildren = childCodes.some(childCode => {
          return childCode.toUpperCase() !== exactCode.toUpperCase();
        });
        
        results.push({
          kode: exactCode,
          beschreibung: codeData.beschreibung,
          gruppe: findICDGroup(exactCode, icdData.groups),
          kapitel: findICDChapter(exactCode, icdData.codes, icdData.chapters),
          isParent: hasRealChildren, // Dies als Parent markieren, wenn es echte Kind-Codes hat
          hasChildCodes: hasRealChildren, // Explizit markieren, ob es Kind-Codes hat
          isDirectInput: true,
          isEndstellig: !codeData.isNonTerminal && !formattedCode.endsWith('-'),
          usage295: codeData.usage295 || '-',
          usage301: codeData.usage301 || '-',
          genderRestriction: codeData.genderRestriction || '-',
          minAge: codeData.minAge || '-',
          maxAge: codeData.maxAge || '-',
          ageError: codeData.ageError || '-',
          ifsgReporting: codeData.ifsgReporting || '-',
          ifsgLab: codeData.ifsgLab || '-'
        });
        
        // Wenn es ein übergeordneter Code ist und showChildCodes aktiviert ist,
        // finde und füge alle Kindcodes hinzu
        if (showChildCodes && hasRealChildren) {
          console.log(`${exactCode} hat ${childCodes.length} zugehörige Codes`);
          
          // Füge alle gefundenen Kinder hinzu
          childCodes.forEach(childCode => {
            // Überspringe den übergeordneten Code selbst in der Kindliste
            if (childCode.toUpperCase() === exactCode.toUpperCase()) return;
            
            const childData = icdData.codes[childCode];
            if (!childData) return; // Überspringe nicht vorhandene Codes
            
            results.push({
              kode: childCode,
              beschreibung: childData.beschreibung,
              gruppe: findICDGroup(childCode, icdData.groups),
              kapitel: findICDChapter(childCode, icdData.codes, icdData.chapters),
              parentCode: exactCode,
              isDirectInput: false,
              isExpandedChild: true,
              isEndstellig: !childData.isNonTerminal && !childCode.endsWith('-'),
              usage295: childData.usage295 || '-',
              usage301: childData.usage301 || '-',
              genderRestriction: childData.genderRestriction || '-',
              minAge: childData.minAge || '-',
              maxAge: childData.maxAge || '-',
              ageError: childData.ageError || '-',
              ifsgReporting: childData.ifsgReporting || '-',
              ifsgLab: childData.ifsgLab || '-'
            });
          });
        }
      } else {
        // Code nicht direkt gefunden, prüfe ob es ein übergeordneter Code ist
        const childCodes = findChildICDCodes(formattedCode, icdData.codes);
        
        if (childCodes.length > 0) {
          console.log(`${formattedCode} wurde nicht direkt gefunden, aber ${childCodes.length} zugehörige Codes`);
          
          // Nur Kinder hinzufügen, wenn showChildCodes aktiviert ist
          if (showChildCodes) {
            // Füge alle gefundenen Kinder hinzu
            childCodes.forEach(childCode => {
              const childData = icdData.codes[childCode];
              if (!childData) return; // Überspringe nicht vorhandene Codes
              
              results.push({
                kode: childCode,
                beschreibung: childData.beschreibung,
                gruppe: findICDGroup(childCode, icdData.groups),
                kapitel: findICDChapter(childCode, icdData.codes, icdData.chapters),
                fromParent: formattedCode,
                isDirectInput: false,
                isExpandedChild: true,
                isEndstellig: !childData.isNonTerminal && !childCode.endsWith('-'),
                usage295: childData.usage295 || '-',
                usage301: childData.usage301 || '-',
                genderRestriction: childData.genderRestriction || '-',
                minAge: childData.minAge || '-',
                maxAge: childData.maxAge || '-',
                ageError: childData.ageError || '-',
                ifsgReporting: childData.ifsgReporting || '-',
                ifsgLab: childData.ifsgLab || '-'
              });
            });
          } else {
            // Wenn showChildCodes nicht aktiviert ist, füge den "virtuellen" Elterneintrag hinzu
            results.push({
              kode: formattedCode,
              beschreibung: `Übergeordneter Code mit ${childCodes.length} Subcodes`,
              isParent: true,
              virtualParent: true,
              isDirectInput: false,
              isEndstellig: true,
              usage295: '-',
              usage301: '-',
              genderRestriction: '-',
              minAge: '-',
              maxAge: '-',
              ageError: '-',
              ifsgReporting: '-',
              ifsgLab: '-'
            });
          }
        } else {
          errors.push(`ICD-Code nicht im Jahr ${year} vorhanden: ${rawCode}`);
        }
      }
    }
    
    console.log(`ICD search complete, found ${results.length} results`);
    for (const result of results) {
      // Setze isEndstellig basierend auf verschiedenen Kriterien
      result.isEndstellig = !result.isNonTerminal && 
                            !result.isParent && 
                            !result.kode.endsWith('-') &&
                            !result.parentCode;
    }
    return {
      results,
      duplicatesRemoved,
      errors
    };
  } catch (error) {
    console.error('Error searching ICD codes:', error);
    errors.push(`Fehler bei der Suche: ${error.message}`);
    return { results, duplicatesRemoved: 0, errors };
  }
};

/**
 * Search for OPS codes
 * @param {string} input - User input
 * @param {string} year - The year to search in
 * @param {boolean} showChildCodes - Whether to include child codes in results (default: false)
 * @returns {Promise<SearchResult>} - Promise resolving to search results
 */
export const searchOPSCodes = async (input, year, showChildCodes = false) => {
  const results = [];
  const errors = [];
  
  try {
    // Load or get cached data
    const opsData = await loadOPSData(year);
    console.log(`OPS Data loaded, ${Object.keys(opsData.codes).length} codes available`);
    
    // Parse user input
    const { codes, duplicatesRemoved } = parseUserInput(input);
    console.log(`Parsed input "${input}" into codes for OPS search:`, codes);
    
    // Process each code
    for (const rawCode of codes) {
      // Verwende die erweiterte Normalisierung für OPS-Codes
      let code = normalizeCode(rawCode);
      
      // Skip non-OPS codes
      if (detectCodeType(code) !== 'ops') {
        console.log(`Skipping non-OPS code: ${code}`);
        continue;
      }
      
      // Formatieren des OPS-Codes mit der erweiterten Funktion
      const formattedCode = normalizeOPSCode(code);
      
      console.log(`Processing OPS code "${rawCode}" (normalized: "${code}", formatted: "${formattedCode}")`);
      
      // Handle wildcard search
      if (isWildcardSearch(formattedCode)) {
        const matchedCodes = findWildcardMatches(formattedCode, opsData.codes);
        
        if (matchedCodes.length === 0) {
          errors.push(`Keine passenden OPS-Codes für Muster: ${rawCode}`);
        } else {
          matchedCodes.forEach(matchedCode => {
            const codeData = opsData.codes[matchedCode];
            results.push({
              kode: matchedCode,
              beschreibung: codeData.beschreibung,
              gruppe: findOPSGroup(matchedCode, opsData.groups),
              kapitel: findOPSChapter(matchedCode, opsData.chapters),
              dreisteller: findDreistellerRange(formattedCode, opsData.dreisteller)?.description || '',
              isParent: codeData.isNonTerminal,
              isDirectInput: true,
              isEndstellig: !codeData.isNonTerminal && !formattedCode.endsWith('-'),
            });
          });
        }
        continue;
      }
      
      // Validate code format
      if (!isValidOPSFormat(formattedCode)) {
        errors.push(`Formatfehler: OPS-Codes müssen im Format 1-20, 1-202.00 oder ähnlich eingegeben werden. Ungültig: ${rawCode}`);
        continue;
      }
      
      // Find code case-insensitively
      const { found, codeData, exactCode } = findCodeCaseInsensitive(
        formattedCode, 
        opsData.codeMap, 
        opsData.codes
      );
      
      // Check if code exists directly
      if (found) {
        // Finde den Dreisteller-Bereich
        const dreistellerInfo = findDreistellerRange(exactCode, opsData.dreisteller);
        
        // Check if the code has child codes
        const childCodes = findChildOPSCodes(exactCode, opsData.codes);
        const hasChildren = childCodes.length > 0 && 
                          childCodes.some(c => c.toUpperCase() !== exactCode.toUpperCase());
        
        // Füge den Hauptcode immer zu den Ergebnissen hinzu
        results.push({
          kode: exactCode,
          beschreibung: codeData.beschreibung,
          gruppe: findOPSGroup(exactCode, opsData.groups),
          kapitel: findOPSChapter(exactCode, opsData.chapters),
          dreisteller: dreistellerInfo ? dreistellerInfo.description : '',
          isParent: codeData.isNonTerminal || hasChildren,
          hasChildCodes: hasChildren, // Explicitly mark if it has children
          isDirectInput: true,
          isEndstellig: !codeData.isNonTerminal && !exactCode.endsWith('-'),
          terminalCode: codeData.terminalCode || '-',
          sideRequired: codeData.sideRequired || '-',
          validityKHG: codeData.validityKHG || '-',
          isAdditionalCode: codeData.isAdditionalCode || '-',
          isOneTimeCode: codeData.isOneTimeCode || '-'
        });
        
        // Wenn es ein übergeordneter Code ist und showChildCodes aktiviert ist,
        // finde und füge alle Kindcodes hinzu
        if (showChildCodes && (codeData.isNonTerminal || hasChildren)) {
          console.log(`${exactCode} ist ein nicht-endstelliger OPS-Code, suche nach allen zugehörigen Codes...`);
          
          if (childCodes.length > 0) {
            // Füge alle endstelligen Codes hinzu
            childCodes.forEach(childCode => {
              // Überspringe den übergeordneten Code selbst in der Kindliste (case-insensitive)
              if (childCode.toUpperCase() === exactCode.toUpperCase()) return;
              
              const childData = opsData.codes[childCode];
              if (!childData) return; // Überspringe nicht vorhandene Codes
              
              const childDreistellerInfo = findDreistellerRange(childCode, opsData.dreisteller);
              
              results.push({
                kode: childCode,
                beschreibung: childData.beschreibung,
                gruppe: findOPSGroup(childCode, opsData.groups),
                kapitel: findOPSChapter(childCode, opsData.chapters),
                dreisteller: childDreistellerInfo ? childDreistellerInfo.description : '',
                parentCode: exactCode,
                isDirectInput: false,
                isExpandedChild: true,
                isEndstellig: !childData.isNonTerminal && !childCode.endsWith('-'),
                terminalCode: childData.terminalCode || '-',
                sideRequired: childData.sideRequired || '-',
                validityKHG: childData.validityKHG || '-',
                isAdditionalCode: childData.isAdditionalCode || '-',
                isOneTimeCode: childData.isOneTimeCode || '-',
                usage295: childData.usage295 || '-',
                usage301: childData.usage301 || '-',
                genderRestriction: childData.genderRestriction || '-',
                minAge: childData.minAge || '-',
                maxAge: childData.maxAge || '-',
                ageError: childData.ageError || '-',
                ifsgReporting: childData.ifsgReporting || '-',
                ifsgLab: childData.ifsgLab || '-'
              });
            });
          }
        }
      } else {
        // Wenn der Code nicht direkt gefunden wurde, prüfe auf Dreisteller
        const dreistellerMatch = formattedCode.match(/^(\d-\d{2})$/);
        
        if (dreistellerMatch) {
          const dreistellerCode = dreistellerMatch[1];
          
          // Find dreisteller case-insensitively
          let dreistellerInfo = null;
          const upperDreistellerCode = dreistellerCode.toUpperCase();
          const exactDreistellerCode = opsData.dreistellerMap[upperDreistellerCode];
          
          if (exactDreistellerCode) {
            dreistellerInfo = opsData.dreisteller[exactDreistellerCode];
          }
          
          if (dreistellerInfo) {
            // Füge den Dreisteller selbst hinzu
            results.push({
              kode: exactDreistellerCode || dreistellerCode,
              beschreibung: dreistellerInfo.description,
              gruppe: dreistellerInfo.description,
              kapitel: findOPSChapter(dreistellerCode, opsData.chapters),
              dreisteller: dreistellerInfo.description,
              isParent: true,
              isDirectInput: true,
              isEndstellig: false,
              usage295: '-',
              usage301: '-',
              genderRestriction: '-',
              minAge: '-',
              maxAge: '-',
              ageError: '-',
              ifsgReporting: '-',
              ifsgLab: '-'
            });
            
            // Finde alle Kindcodes dieses Dreistellercodes, aber nur wenn showChildCodes aktiviert ist
            if (showChildCodes) {
              // Create a case-insensitive regex for finding child codes
              const childPattern = new RegExp(`^${dreistellerCode.replace(/[-]/g, '[-]')}\\d`, 'i');
              
              const childCodes = Object.keys(opsData.codes).filter(code => 
                childPattern.test(code)
              );
              
              if (childCodes.length > 0) {
                childCodes.forEach(childCode => {
                  const childData = opsData.codes[childCode];
                  results.push({
                    kode: childCode,
                    beschreibung: childData.beschreibung,
                    gruppe: dreistellerInfo.description,
                    kapitel: findOPSChapter(childCode, opsData.chapters),
                    dreisteller: dreistellerInfo.description,
                    parentCode: exactDreistellerCode || dreistellerCode,
                    isDirectInput: false,
                    isExpandedChild: true,
                    isEndstellig: !childData.isNonTerminal && !childCode.endsWith('-'),
                    usage295: childData.usage295 || '-',
                    usage301: childData.usage301 || '-',
                    genderRestriction: childData.genderRestriction || '-',
                    minAge: childData.minAge || '-',
                    maxAge: childData.maxAge || '-',
                    ageError: childData.ageError || '-',
                    ifsgReporting: childData.ifsgReporting || '-',
                    ifsgLab: childData.ifsgLab || '-'
                  });
                });
              }
            }
          } else {
            errors.push(`OPS-Code nicht im Jahr ${year} vorhanden: ${rawCode}`);
          }
        } else {
          errors.push(`OPS-Code nicht im Jahr ${year} vorhanden: ${rawCode}`);
        }
      }
    }
    
    console.log(`OPS search complete, found ${results.length} results`);
    console.log('OPS search results with showChildCodes=' + showChildCodes, results);
    for (const result of results) {
      // Setze isEndstellig basierend auf verschiedenen Kriterien
      result.isEndstellig = !result.isNonTerminal && 
                            !result.isParent && 
                            !result.parentCode;
    }
    return {
      results,
      duplicatesRemoved,
      errors
    };
  } catch (error) {
    console.error('Error searching OPS codes:', error);
    errors.push(`Fehler bei der Suche: ${error.message}`);
    return { results, duplicatesRemoved: 0, errors };
  }
};

/**
 * Lädt die OPS-Umsteiger-Daten für den Vergleich zwischen zwei Jahren
 * Format: alter_kode;flag;neuer_kode;flag;flag1;flag2
 * @param {string} oldYear - Das alte Jahr (Ausgangsversion)
 * @param {string} newYear - Das neue Jahr (Zielversion)
 * @returns {Promise<Object>} - Ein Objekt mit den Umsteiger-Mappings
 */
export async function loadOPSMigrationData(oldYear, newYear) {
  try {
    // Baue Pfad zur Umsteiger-Datei, die im Format "ops[newYear]syst_umsteiger_[oldYear]_[newYear].txt" vorliegt
    const fileName = `ops${newYear}syst_umsteiger_${oldYear}_${newYear}.txt`;
    const filePath = `/data/${newYear}/ops/${fileName}`;
    
    // Lade die Umsteiger-Datei
    const response = await fetch(filePath);
    if (!response.ok) {
      console.warn(`Umsteiger-Datei nicht gefunden: ${filePath}`);
      return { fromOld: {}, toNew: {}, hasMigrationData: false };
    }
    
    const text = await response.text();
    
    // Prüfe, ob die Datei tatsächlich Inhalt hat
    console.log(`Umsteiger-Datei Inhalt (erste 500 Zeichen): "${text.substring(0, 500)}..."`);
    
    // Prüfe, ob die Datei HTML ist (was auf einen Fehler hindeuten würde)
    if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
      console.warn('Geladene Datei scheint HTML zu sein, keine Umsteiger-Datei!');
      return { fromOld: {}, toNew: {}, hasMigrationData: false };
    }
    
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    console.log(`Anzahl Zeilen in der Umsteiger-Datei: ${lines.length}`);
    
    // Initialisiere Mappings in beide Richtungen
    const fromOld = {}; // altes -> neues Mapping
    const toNew = {};   // neues -> altes Mapping
    
    // Verarbeite jede Zeile
    lines.forEach(line => {
      const parts = line.split(';');
      if (parts.length >= 4) {
        const oldCode = parts[0].trim();
        const newCode = parts[2].trim();
        
        // Ignoriere Einträge, bei denen alter und neuer Code identisch sind
        if (oldCode !== newCode) {
          fromOld[oldCode] = newCode;
          
          // Für den umgekehrten Fall müssen wir aufpassen, da mehrere alte Codes
          // auf denselben neuen Code umsteigen können
          if (!toNew[newCode]) {
            toNew[newCode] = [];
          }
          toNew[newCode].push(oldCode);
        }
      }
    });
    
    return { 
      fromOld, 
      toNew,
      hasMigrationData: Object.keys(fromOld).length > 0
    };
  } catch (error) {
    console.error("Fehler beim Laden der OPS-Umsteiger-Daten:", error);
    return { fromOld: {}, toNew: {}, hasMigrationData: false };
  }
}

/**
 * Lädt die ICD-Umsteiger-Daten für den Vergleich zwischen zwei Jahren
 * Format: alter_kode;flag;neuer_kode;flag;flag1;flag2
 * @param {string} oldYear - Das alte Jahr (Ausgangsversion)
 * @param {string} newYear - Das neue Jahr (Zielversion)
 * @returns {Promise<Object>} - Ein Objekt mit den Umsteiger-Mappings
 */
export async function loadICDMigrationData(oldYear, newYear) {
  try {
    console.log(`STARTE loadICDMigrationData für oldYear=${oldYear}, newYear=${newYear}`);
    
    // TEMPORÄRE FIX: Direkte Zuweisung für 2023, um zu testen, ob es mit dem exakten Namen funktioniert
    if (newYear === '2023') {
      const baseDir = `/data/${newYear}/icd10/`;
      const exactFileName = `icd10gm${newYear}syst_umsteiger_${oldYear}_${newYear}_20221206.txt`;
      const exactFilePath = baseDir + exactFileName;
      
      console.log(`Versuche DIREKT die exakte Datei zu laden: ${exactFilePath}`);
      const response = await fetch(exactFilePath);
      console.log(`Exakter Name: Status=${response.status}, OK=${response.ok}`);
      
      if (response.ok) {
        const text = await response.text();
        console.log(`Datei erfolgreich geladen! Erste 100 Zeichen: ${text.substring(0, 100)}...`);
        
        // ... Rest des Codes zur Verarbeitung ...
        const lines = text.split('\n').filter(line => line.trim().length > 0);
        console.log(`Anzahl Zeilen in der Umsteiger-Datei: ${lines.length}`);
        
        // Debug: Zeige die ersten 10 Zeilen und deren Parts
        lines.slice(0, 10).forEach((line, idx) => {
          const parts = line.split(';').map(p => p.trim());
          console.log(`[ICD-Umsteiger] Zeile ${idx + 1}:`, line, '->', parts);
        });

        const fromOld = {};
        const toNew = {};
        let skipped = 0;

        lines.forEach(line => {
          const parts = line.split(';').map(p => p.trim());
          const oldCode = parts[0] || '';
          const newCode = parts[1] || '';
          const forwardAutomaticFlag = parts[2] === 'A';  // Von alt nach neu
          const backwardAutomaticFlag = parts[3] === 'A'; // Von neu nach alt
          
          // Normalisiere die Keys wie im Diff
          const normOld = normalizeCodeKey({ kode: oldCode }, 'icd');
          const normNew = newCode ? normalizeCodeKey({ kode: newCode }, 'icd') : '';
          
          if (normOld) {
            if (normNew && normOld !== normNew) {
              fromOld[normOld] = {
                code: normNew,
                autoForward: forwardAutomaticFlag,
                autoBackward: backwardAutomaticFlag
              };
              
              if (!toNew[normNew]) {
                toNew[normNew] = [];
              }
              toNew[normNew].push({
                code: normOld,
                autoForward: forwardAutomaticFlag,
                autoBackward: backwardAutomaticFlag
              });
            } else if (!normNew) {
              fromOld[normOld] = null;
            }
          } else {
            skipped++;
          }
        });

        console.log(`ICD-Umsteiger-Daten geladen: ${Object.keys(fromOld).length} Einträge, übersprungene Zeilen: ${skipped}`);
        return {
          fromOld,
          toNew,
          hasMigrationData: Object.keys(fromOld).length > 0
        };
      }
    } else if (newYear === '2024') {
      const baseDir = `/data/${newYear}/icd10/`;
      const exactFileName = `icd10gm${newYear}syst_umsteiger_${oldYear}_20221206_${newYear}.txt`;
      const exactFilePath = baseDir + exactFileName;
      
      console.log(`Versuche DIREKT die exakte 2024-Datei zu laden: ${exactFilePath}`);
      const response = await fetch(exactFilePath);
      console.log(`Exakter Name 2024: Status=${response.status}, OK=${response.ok}`);
      
      if (response.ok) {
        const text = await response.text();
        console.log(`2024-Datei erfolgreich geladen! Erste 100 Zeichen: ${text.substring(0, 100)}...`);
        
        // ... Rest des Codes zur Verarbeitung (wie bei 2023) ...
        const lines = text.split('\n').filter(line => line.trim().length > 0);
        console.log(`Anzahl Zeilen in der Umsteiger-Datei: ${lines.length}`);
        
        // Debug: Zeige die ersten 10 Zeilen und deren Parts
        lines.slice(0, 10).forEach((line, idx) => {
          const parts = line.split(';').map(p => p.trim());
          console.log(`[ICD-Umsteiger] Zeile ${idx + 1}:`, line, '->', parts);
        });

        const fromOld = {};
        const toNew = {};
        let skipped = 0;

        lines.forEach(line => {
          const parts = line.split(';').map(p => p.trim());
          const oldCode = parts[0] || '';
          const newCode = parts[1] || '';
          const forwardAutomaticFlag = parts[2] === 'A';  // Von alt nach neu
          const backwardAutomaticFlag = parts[3] === 'A'; // Von neu nach alt
          
          // Normalisiere die Keys wie im Diff
          const normOld = normalizeCodeKey({ kode: oldCode }, 'icd');
          const normNew = newCode ? normalizeCodeKey({ kode: newCode }, 'icd') : '';
          
          if (normOld) {
            if (normNew && normOld !== normNew) {
              fromOld[normOld] = {
                code: normNew,
                autoForward: forwardAutomaticFlag,
                autoBackward: backwardAutomaticFlag
              };
              
              if (!toNew[normNew]) {
                toNew[normNew] = [];
              }
              toNew[normNew].push({
                code: normOld,
                autoForward: forwardAutomaticFlag,
                autoBackward: backwardAutomaticFlag
              });
            } else if (!normNew) {
              fromOld[normOld] = null;
            }
          } else {
            skipped++;
          }
        });

        console.log(`ICD-Umsteiger-Daten geladen: ${Object.keys(fromOld).length} Einträge, übersprungene Zeilen: ${skipped}`);
        return {
          fromOld,
          toNew,
          hasMigrationData: Object.keys(fromOld).length > 0
        };
      }
    }
    
    // Wenn der direkte Weg für 2023 nicht funktioniert hat, weiter mit normalem Ablauf
    // Baue Pfad zur Umsteiger-Datei mit Standardnamen
    const baseDir = `/data/${newYear}/icd10/`;
    let fileName = `icd10gm${newYear}syst_umsteiger_${oldYear}_${newYear}.txt`;
    let filePath = baseDir + fileName;

    // 1. Versuch: Standardname
    console.log(`Versuche ICD-Umsteiger-Datei zu laden: ${filePath}`);
    let response = await fetch(filePath);
    console.log(`Standardname: Status=${response.status}, OK=${response.ok}`);
    
    // 2. Versuch: Aus der Frontend-Dateiliste (wenn verfügbar)
    if (!response.ok) {
      if (typeof window !== 'undefined' && window.__icdUmsteigerFiles && Array.isArray(window.__icdUmsteigerFiles[`${newYear}`])) {
        console.log('Verfügbare Umsteiger-Dateien für', newYear, window.__icdUmsteigerFiles[`${newYear}`]);
        const prefix = `icd10gm${newYear}syst_umsteiger`;
        const candidates = window.__icdUmsteigerFiles[`${newYear}`].filter(f => 
          typeof f === 'string' && f.startsWith(prefix) && f.endsWith('.txt') && f.length < 100
        );
        
        if (candidates.length > 0) {
          fileName = candidates[0];
          filePath = baseDir + fileName;
          console.log(`Alternative ICD-Umsteiger-Datei aus Liste verwendet: ${fileName}`);
          response = await fetch(filePath);
          console.log(`Aus Liste: Status=${response.status}, OK=${response.ok}`);
        }
      }
    }
    
    // 3. Versuch: Suche nach allen Dateien, die mit dem umsteiger-prefix beginnen
    if (!response.ok) {
      // Direkte Dateisuche im Verzeichnis: Lade alle möglichen Dateinamen, die passen könnten
      console.log(`Universelle Suche nach Umsteiger-Dateien für ${newYear}`);
      
      try {
        // Muster für alle möglichen gültigen Umsteiger-Dateinamen
        const basePrefix = `icd10gm${newYear}syst_umsteiger_`;
        
        // Versuche einen Dateilisting-Request, um alle Dateien im Verzeichnis zu erhalten
        const dirResponse = await fetch(`/data/${newYear}/icd10/`);
        if (dirResponse.ok) {
          try {
            // Bei manchen Servern kann eine Verzeichnisauflistung als JSON vorliegen
            const dirContent = await dirResponse.json();
            console.log('Verzeichnisinhalt:', dirContent);
            // Suche nach passenden Dateien
            if (Array.isArray(dirContent)) {
              const candidates = dirContent.filter(item => 
                typeof item === 'string' && item.startsWith(basePrefix) && item.endsWith('.txt')
              );
              if (candidates.length > 0) {
                fileName = candidates[0];
                filePath = baseDir + fileName;
                console.log(`Gefundene Umsteiger-Datei im Verzeichnis: ${fileName}`);
                response = await fetch(filePath);
              }
            }
          } catch (e) {
            console.log('Verzeichnisauflistung als JSON nicht möglich:', e);
          }
        }
      } catch (dirError) {
        console.log('Verzeichnissuche nicht möglich:', dirError);
      }
      
      // Fallback: Probiere bekannte Namensmuster aus
      if (!response.ok) {
        // Generische Liste möglicher Dateinamen-Muster für verschiedene Jahre
        // WICHTIG: Diese Liste kann erweitert werden, wenn neue Muster bekannt werden
        const possiblePatterns = [
          // Standard-Pattern
          `${baseDir}icd10gm${newYear}syst_umsteiger_${oldYear}_${newYear}.txt`,
          
          // 2023-Pattern mit Datum am Ende
          `${baseDir}icd10gm${newYear}syst_umsteiger_${oldYear}_${newYear}_20221206.txt`,
          
          // 2024-Pattern mit Datum in der Mitte - BESONDERS WICHTIG
          `${baseDir}icd10gm${newYear}syst_umsteiger_${oldYear}_20221206_${newYear}.txt`,
          
          // Generische Pattern-Variationen
          `${baseDir}icd10gm${newYear}syst_umsteiger_${oldYear}.txt`,
          `${baseDir}icd10gm${newYear}syst_umsteiger.txt`
        ];
        
        console.log(`Versuche ${possiblePatterns.length} mögliche Dateinamen-Muster:`, possiblePatterns);
        
        // Versuche jedes Muster der Reihe nach
        for (const pattern of possiblePatterns) {
          console.log(`Versuche Muster: ${pattern}`);
          response = await fetch(pattern);
          console.log(`Muster ${pattern}: Status=${response.status}, OK=${response.ok}`);
          
          if (response.ok) {
            fileName = pattern.replace(baseDir, '');
            console.log(`Erfolgreiche Umsteiger-Datei gefunden: ${fileName}`);
            break;
          }
        }
      }
    }
    
    if (!response.ok) {
      console.warn(`ICD-Umsteiger-Datei nicht gefunden: ${filePath}`);
      return { fromOld: {}, toNew: {}, hasMigrationData: false };
    }

    const text = await response.text();
    
    // Prüfe, ob die Datei tatsächlich Inhalt hat
    console.log(`Umsteiger-Datei Inhalt (erste 500 Zeichen): "${text.substring(0, 500)}..."`);
    
    // Prüfe, ob die Datei HTML ist (was auf einen Fehler hindeuten würde)
    if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
      console.warn('Geladene Datei scheint HTML zu sein, keine Umsteiger-Datei!');
      return { fromOld: {}, toNew: {}, hasMigrationData: false };
    }
    
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    console.log(`Anzahl Zeilen in der Umsteiger-Datei: ${lines.length}`);

    // Debug: Zeige die ersten 10 Zeilen und deren Parts
    lines.slice(0, 10).forEach((line, idx) => {
      const parts = line.split(';').map(p => p.trim());
      console.log(`[ICD-Umsteiger] Zeile ${idx + 1}:`, line, '->', parts);
    });

    const fromOld = {};
    const toNew = {};
    let skipped = 0;

    lines.forEach(line => {
      const parts = line.split(';').map(p => p.trim());
      const oldCode = parts[0] || '';
      const newCode = parts[1] || '';
      const forwardAutomaticFlag = parts[2] === 'A';  // Von alt nach neu
      const backwardAutomaticFlag = parts[3] === 'A'; // Von neu nach alt
      
      // Normalisiere die Keys wie im Diff
      const normOld = normalizeCodeKey({ kode: oldCode }, 'icd');
      const normNew = newCode ? normalizeCodeKey({ kode: newCode }, 'icd') : '';
      
      if (normOld) {
        if (normNew && normOld !== normNew) {
          fromOld[normOld] = {
            code: normNew,
            autoForward: forwardAutomaticFlag,
            autoBackward: backwardAutomaticFlag
          };
          
          if (!toNew[normNew]) {
            toNew[normNew] = [];
          }
          toNew[normNew].push({
            code: normOld,
            autoForward: forwardAutomaticFlag,
            autoBackward: backwardAutomaticFlag
          });
        } else if (!normNew) {
          fromOld[normOld] = null;
        }
      } else {
        skipped++;
      }
    });

    console.log(`ICD-Umsteiger-Daten geladen: ${Object.keys(fromOld).length} Einträge, übersprungene Zeilen: ${skipped}`);
    return {
      fromOld,
      toNew,
      hasMigrationData: Object.keys(fromOld).length > 0
    };
  } catch (error) {
    console.error("Fehler beim Laden der ICD-Umsteiger-Daten:", error);
    return { fromOld: {}, toNew: {}, hasMigrationData: false };
  }
} 