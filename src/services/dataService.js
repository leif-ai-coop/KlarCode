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
  findDreistellerRange
} from '../utils/search';

// Cache für geladene Daten
const dataCache = {
  icd: {},
  ops: {}
};

/**
 * Get the current year or fallback to 2025 if not available
 * @returns {string} - The current year
 */
export const getCurrentYear = () => {
  const currentYear = new Date().getFullYear();
  return currentYear >= 2025 && currentYear <= 2026 ? currentYear.toString() : '2025';
};

/**
 * Load all ICD-10 data for a specific year
 * @param {string} year - The year to load data for
 * @returns {Promise} - Promise resolving to the loaded data
 */
export const loadICDData = async (year) => {
  // Check if data is already cached
  if (dataCache.icd[year]) {
    return dataCache.icd[year];
  }
  
  try {
    // Verschiedene Pfadvarianten testen
    let baseUrl = `/data/${year}/icd10/`;
    
    // Logging hinzufügen, um das Problem besser zu verstehen
    console.log(`Attempting to load ICD data from: ${baseUrl}`);
    
    // Load all required files
    const codesResponse = await fetch(`${baseUrl}icd10gm${year}syst_kodes.txt`);
    
    if (!codesResponse.ok) {
      console.error(`Failed to load ICD-10 codes: ${codesResponse.status}, trying alternative path...`);
      
      // Alternative paths to try
      baseUrl = `/src/data/${year}/icd10/`;
      console.log(`Trying alternative path: ${baseUrl}`);
      
      const altCodesResponse = await fetch(`${baseUrl}icd10gm${year}syst_kodes.txt`);
      
      if (!altCodesResponse.ok) {
        console.error(`Failed to load ICD-10 codes from alternative path: ${altCodesResponse.status}`);
        throw new Error(`Failed to load ICD-10 data for ${year}`);
      }
      
      console.log("Successfully loaded ICD data from alternative path!");
      const codes = parseICDCodes(await altCodesResponse.text());
      
      // Load other files
      const groupsResponse = await fetch(`${baseUrl}icd10gm${year}syst_gruppen.txt`);
      const chaptersResponse = await fetch(`${baseUrl}icd10gm${year}syst_kapitel.txt`);
      
      if (!groupsResponse.ok || !chaptersResponse.ok) {
        throw new Error(`Failed to load ICD-10 groups or chapters for ${year}`);
      }
      
      const groups = parseICDGroups(await groupsResponse.text());
      const chapters = parseICDChapters(await chaptersResponse.text());
      
      // Cache the data
      dataCache.icd[year] = { codes, groups, chapters };
      
      return dataCache.icd[year];
    }
    
    // Ursprünglicher Code für den Fall, dass der erste Pfad funktioniert
    console.log("Successfully loaded ICD data from original path!");
    const codesText = await codesResponse.text();
    const codes = parseICDCodes(codesText);
    
    const groupsResponse = await fetch(`${baseUrl}icd10gm${year}syst_gruppen.txt`);
    const chaptersResponse = await fetch(`${baseUrl}icd10gm${year}syst_kapitel.txt`);
    
    if (!groupsResponse.ok || !chaptersResponse.ok) {
      throw new Error(`Failed to load ICD-10 groups or chapters for ${year}`);
    }
    
    const groupsText = await groupsResponse.text();
    const chaptersText = await chaptersResponse.text();
    
    // Parse the data
    const groups = parseICDGroups(groupsText);
    const chapters = parseICDChapters(chaptersText);
    
    // Cache the data
    dataCache.icd[year] = { codes, groups, chapters };
    
    // Datenzusammenfassung ausgeben
    console.log(`Loaded ${Object.keys(codes).length} ICD codes`);
    console.log(`Sample codes:`, Object.keys(codes).slice(0, 5));
    
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
  // Check if data is already cached
  if (dataCache.ops[year]) {
    return dataCache.ops[year];
  }
  
  try {
    // Load all required files
    const codesResponse = await fetch(`/data/${year}/ops/ops${year}syst_kodes.txt`);
    const groupsResponse = await fetch(`/data/${year}/ops/ops${year}syst_gruppen.txt`);
    const chaptersResponse = await fetch(`/data/${year}/ops/ops${year}syst_kapitel.txt`);
    const dreistellerResponse = await fetch(`/data/${year}/ops/ops${year}syst_dreisteller.txt`);
    
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
    
    // Cache the data with the integrated codes
    dataCache.ops[year] = { 
      codes: integratedCodes,
      groups, 
      chapters, 
      dreisteller 
    };
    
    return dataCache.ops[year];
  } catch (error) {
    console.error(`Error loading OPS data for ${year}:`, error);
    throw error;
  }
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
      
      console.log(`Processing ICD code "${rawCode}" (normalized: "${code}")`);
      
      // Handle wildcard search
      if (isWildcardSearch(code)) {
        const matchedCodes = findWildcardMatches(code, icdData.codes);
        
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
              isDirectInput: true,
              isEndstellig: !codeData.isNonTerminal && !code.endsWith('-'),
            });
          });
        }
        continue;
      }
      
      // Validate code format
      if (!isValidICDFormat(code)) {
        errors.push(`Formatfehler: ICD-Codes müssen im Format A00, A00.1 oder ähnlich eingegeben werden. Ungültig: ${rawCode}`);
        continue;
      }
      
      // Check if code exists directly
      if (icdData.codes[code]) {
        const codeData = icdData.codes[code];
        
        // Wenn es ein nicht-endstelliger Code ist oder explizit als solcher markiert ist
        if (codeData.isNonTerminal || !code.includes('.')) {
          // Suche nach zugehörigen endstelligen Codes
          console.log(`${code} ist ein nicht-endstelliger Code, suche nach allen zugehörigen Codes...`);
          const childCodes = findChildICDCodes(code, icdData.codes);
          
          if (childCodes.length > 0) {
            // Füge den übergeordneten Code hinzu
            results.push({
              kode: code,
              beschreibung: codeData.beschreibung,
              gruppe: findICDGroup(code, icdData.groups),
              kapitel: findICDChapter(code, icdData.codes, icdData.chapters),
              isParent: true,
              isDirectInput: true,
              isEndstellig: !codeData.isNonTerminal && !code.endsWith('-'),
            });
            
            // Füge alle endstelligen Codes hinzu, aber nur wenn showChildCodes aktiviert ist
            if (showChildCodes) {
              childCodes.forEach(childCode => {
                // Überspringe den übergeordneten Code selbst in der Kindliste
                if (childCode === code) return;
                
                results.push({
                  kode: childCode,
                  beschreibung: icdData.codes[childCode].beschreibung,
                  gruppe: findICDGroup(childCode, icdData.groups),
                  kapitel: findICDChapter(childCode, icdData.codes, icdData.chapters),
                  parentCode: code,
                  isDirectInput: false,
                  isExpandedChild: true,
                  isEndstellig: !icdData.codes[childCode].isNonTerminal && !childCode.endsWith('-'),
                });
              });
            }
          } else {
            // Wenn keine Kinder gefunden wurden, füge nur den Code selbst hinzu
            results.push({
              kode: code,
              beschreibung: codeData.beschreibung,
              gruppe: findICDGroup(code, icdData.groups),
              kapitel: findICDChapter(code, icdData.codes, icdData.chapters),
              isDirectInput: true,
              isEndstellig: !codeData.isNonTerminal && !code.endsWith('-'),
            });
          }
        } else {
          // Für endstellige Codes füge einfach den Code selbst hinzu
          results.push({
            kode: code,
            beschreibung: codeData.beschreibung,
            gruppe: findICDGroup(code, icdData.groups),
            kapitel: findICDChapter(code, icdData.codes, icdData.chapters),
            isDirectInput: true,
            isEndstellig: !codeData.isNonTerminal && !code.endsWith('-'),
          });
        }
      } else {
        // Code nicht direkt gefunden, prüfe ob es ein übergeordneter Code ist
        const childCodes = findChildICDCodes(code, icdData.codes);
        
        if (childCodes.length > 0) {
          console.log(`${code} wurde nicht direkt gefunden, aber ${childCodes.length} zugehörige Codes`);
          
          // Nur Kinder hinzufügen, wenn showChildCodes aktiviert ist
          if (showChildCodes) {
            // Füge alle gefundenen Kinder hinzu
            childCodes.forEach(childCode => {
              results.push({
                kode: childCode,
                beschreibung: icdData.codes[childCode].beschreibung,
                gruppe: findICDGroup(childCode, icdData.groups),
                kapitel: findICDChapter(childCode, icdData.codes, icdData.chapters),
                fromParent: code,
                isDirectInput: false,
                isExpandedChild: true,
                isEndstellig: !icdData.codes[childCode].isNonTerminal && !childCode.endsWith('-'),
              });
            });
          } else {
            // Wenn showChildCodes nicht aktiviert ist, füge den "virtuellen" Elterneintrag hinzu
            results.push({
              kode: code,
              beschreibung: `Übergeordneter Code mit ${childCodes.length} Untercodes`,
              isParent: true,
              virtualParent: true,
              isDirectInput: false,
              isEndstellig: true,
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
      const code = normalizeCode(rawCode);
      
      // Skip non-OPS codes
      if (detectCodeType(code) !== 'ops') {
        console.log(`Skipping non-OPS code: ${code}`);
        continue;
      }
      
      // Formatieren des OPS-Codes
      const formattedCode = formatOPSCode(code);
      
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
      
      // Check if code exists directly
      if (opsData.codes[formattedCode]) {
        const codeData = opsData.codes[formattedCode];
        
        // Finde den Dreisteller-Bereich
        const dreistellerInfo = findDreistellerRange(formattedCode, opsData.dreisteller);
        
        // Füge den Hauptcode immer zu den Ergebnissen hinzu
        results.push({
          kode: formattedCode,
          beschreibung: codeData.beschreibung,
          gruppe: findOPSGroup(formattedCode, opsData.groups),
          kapitel: findOPSChapter(formattedCode, opsData.chapters),
          dreisteller: dreistellerInfo ? dreistellerInfo.description : '',
          isParent: codeData.isNonTerminal,
          isDirectInput: true,
          isEndstellig: !codeData.isNonTerminal && !formattedCode.endsWith('-'),
        });
        
        // Wenn es ein übergeordneter Code ist und showChildCodes aktiviert ist,
        // finde und füge alle Kindcodes hinzu
        if (showChildCodes && codeData.isNonTerminal) {
          console.log(`${formattedCode} ist ein nicht-endstelliger OPS-Code, suche nach allen zugehörigen Codes...`);
          const childCodes = findChildOPSCodes(formattedCode, opsData.codes);
          
          if (childCodes.length > 0) {
            // Füge alle endstelligen Codes hinzu
            childCodes.forEach(childCode => {
              // Überspringe den übergeordneten Code selbst in der Kindliste
              if (childCode === formattedCode) return;
              
              const childDreistellerInfo = findDreistellerRange(childCode, opsData.dreisteller);
              
              results.push({
                kode: childCode,
                beschreibung: opsData.codes[childCode].beschreibung,
                gruppe: findOPSGroup(childCode, opsData.groups),
                kapitel: findOPSChapter(childCode, opsData.chapters),
                dreisteller: childDreistellerInfo ? childDreistellerInfo.description : '',
                parentCode: formattedCode,
                isDirectInput: false,
                isExpandedChild: true,
                isEndstellig: !opsData.codes[childCode].isNonTerminal && !childCode.endsWith('-'),
              });
            });
          }
        }
      } else {
        // Wenn der Code nicht direkt gefunden wurde, prüfe auf Dreisteller
        const dreistellerMatch = formattedCode.match(/^(\d-\d{2})$/);
        
        if (dreistellerMatch) {
          const dreistellerCode = dreistellerMatch[1];
          const dreistellerInfo = findDreistellerRange(dreistellerCode, opsData.dreisteller);
          
          if (dreistellerInfo) {
            // Füge den Dreisteller selbst hinzu
            results.push({
              kode: dreistellerCode,
              beschreibung: dreistellerInfo.description,
              gruppe: dreistellerInfo.description,
              kapitel: findOPSChapter(dreistellerCode, opsData.chapters),
              dreisteller: dreistellerInfo.description,
              isParent: true,
              isDirectInput: true,
              isEndstellig: !dreistellerInfo.isNonTerminal && !dreistellerCode.endsWith('-'),
            });
            
            // Finde alle Kindcodes dieses Dreistellercodes, aber nur wenn showChildCodes aktiviert ist
            if (showChildCodes) {
              const childPattern = new RegExp(`^${dreistellerCode}\\d`);
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
                    parentCode: dreistellerCode,
                    isDirectInput: false,
                    isExpandedChild: true,
                    isEndstellig: !childData.isNonTerminal && !childCode.endsWith('-'),
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