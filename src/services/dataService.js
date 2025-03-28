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