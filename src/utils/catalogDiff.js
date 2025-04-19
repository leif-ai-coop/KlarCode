// Katalog-Diff-Modul für ICD/OPS
// Vergleicht zwei Kataloge (alte und neue Version) und gibt eine Baumstruktur mit Diffs zurück

/**
 * Vergleicht zwei Kataloge (ICD oder OPS) und gibt eine Baumstruktur mit Diffs zurück.
 * @param {Object} params
 * @param {Object} params.oldCatalog - Katalogdaten des alten Jahres (aus dataService)
 * @param {Object} params.newCatalog - Katalogdaten des neuen Jahres (aus dataService)
 * @param {string} params.type - 'icd' oder 'ops'
 * @param {Object} [params.migrationData] - Optional: Umsteiger-Daten für OPS
 * @param {string} [params.oldYear] - Jahr des alten Katalogs
 * @param {string} [params.newYear] - Jahr des neuen Katalogs
 * @returns {Object[]} Baumstruktur mit Diffs (Kapitel → Gruppen → Einzelcodes)
 */
export function diffCatalogs({ oldCatalog, newCatalog, type, migrationData = null, oldYear, newYear }) {
  console.log('diffCatalogs Start - type:', type);
  
  // Gemeinsame Variablen für beide Katalogtypen
  let oldCodes, newCodes;
  let oldDreisteller, newDreisteller;
  
  if (type === 'icd') {
    oldCodes = oldCatalog.codes || {};
    newCodes = newCatalog.codes || {};
  } else {
    // OPS-Daten: Je nach Struktur der verfügbaren Daten
    // Detaillierte Prüfung aller Eigenschaften im OPS-Katalog
    console.log('OPS Katalog-Struktur (Alt):', Object.keys(oldCatalog));
    console.log('OPS Katalog-Struktur (Neu):', Object.keys(newCatalog));
    
    // Dreisteller-Daten für OPS extrahieren
    oldDreisteller = oldCatalog.dreisteller || {};
    newDreisteller = newCatalog.dreisteller || {};
    
    console.log('OPS Dreisteller Anzahl (Alt):', Object.keys(oldDreisteller).length);
    console.log('OPS Dreisteller Anzahl (Neu):', Object.keys(newDreisteller).length);
    
    // Dreisteller-Beispiele ausgeben
    if (Object.keys(oldDreisteller).length > 0) {
      const dreistellerBeispiel = Object.entries(oldDreisteller)[0];
      console.log('OPS Dreisteller Beispiel (Alt):', dreistellerBeispiel);
    }
    
    // Prüfe erst dreisteller/dreitellerMap
    if (oldCatalog.dreisteller) {
      console.log('OPS dreisteller Anzahl (Alt):', Object.keys(oldCatalog.dreisteller || {}).length);
      // Beispiele für dreisteller-Struktur
      const dreistelBeispiele = Object.entries(oldCatalog.dreisteller || {}).slice(0, 2);
      console.log('OPS dreisteller Beispiel Format (Alt):', dreistelBeispiele);
    }
    
    if (oldCatalog.dreitellerMap) {
      console.log('OPS dreitellerMap Anzahl (Alt):', Object.keys(oldCatalog.dreitellerMap || {}).length);
      // Beispiele für dreitellerMap-Struktur 
      const mapBeispiele = Object.entries(oldCatalog.dreitellerMap || {}).slice(0, 2);
      console.log('OPS dreitellerMap Beispiel Format (Alt):', mapBeispiele);
    }
    
    // Direkte Inspektion der Codes
    if (oldCatalog.codes) {
      console.log('OPS codes Anzahl (Alt):', Object.keys(oldCatalog.codes || {}).length);
      const codeBeispiele = Object.entries(oldCatalog.codes || {}).slice(0, 2);
      console.log('OPS codes Beispiel Format (Alt):', codeBeispiele);
    }
    
    // Strategische Auswahl der OPS-Datenquelle
    // Wir wollen die Datenquelle mit den meisten Einträgen verwenden
    const dreisSize = Object.keys(oldCatalog.dreisteller || {}).length;
    const dreisMapSize = Object.keys(oldCatalog.dreitellerMap || {}).length;
    const codesSize = Object.keys(oldCatalog.codes || {}).length;
    
    console.log(`OPS Datengrößen (Alt): dreisteller=${dreisSize}, dreitellerMap=${dreisMapSize}, codes=${codesSize}`);
    
    // Wähle die größte Datenquelle
    if (dreisSize > dreisMapSize && dreisSize > codesSize) {
      oldCodes = oldCatalog.dreisteller || {};
      console.log('Verwende dreisteller für Alt-Jahr (größte Quelle)');
    } else if (dreisMapSize > codesSize) {
      oldCodes = oldCatalog.dreitellerMap || {};
      console.log('Verwende dreitellerMap für Alt-Jahr (größte Quelle)');
    } else {
      oldCodes = oldCatalog.codes || {};
      console.log('Verwende codes für Alt-Jahr (größte Quelle)');
    }
    
    // Gleiches für Neu-Jahr
    const newDreisSize = Object.keys(newCatalog.dreisteller || {}).length;
    const newDreisMapSize = Object.keys(newCatalog.dreitellerMap || {}).length;
    const newCodesSize = Object.keys(newCatalog.codes || {}).length;
    
    console.log(`OPS Datengrößen (Neu): dreisteller=${newDreisSize}, dreitellerMap=${newDreisMapSize}, codes=${newCodesSize}`);
    
    if (newDreisSize > newDreisMapSize && newDreisSize > newCodesSize) {
      newCodes = newCatalog.dreisteller || {};
      console.log('Verwende dreisteller für Neu-Jahr (größte Quelle)');
    } else if (newDreisMapSize > newCodesSize) {
      newCodes = newCatalog.dreitellerMap || {};
      console.log('Verwende dreitellerMap für Neu-Jahr (größte Quelle)');
    } else {
      newCodes = newCatalog.codes || {};
      console.log('Verwende codes für Neu-Jahr (größte Quelle)');
    }
  }
  
  const oldChapters = oldCatalog.chapters || {};
  const newChapters = newCatalog.chapters || {};
  const oldGroups = oldCatalog.groups || {};
  const newGroups = newCatalog.groups || {};
  
  // Debug: Anzahl der Codes in beiden Jahren
  console.log(`Code-Anzahl (${type}): Alt=${Object.keys(oldCodes).length}, Neu=${Object.keys(newCodes).length}`);
  
  // Wenn keine Codes gefunden wurden, kann kein Diff erstellt werden
  if (Object.keys(oldCodes).length === 0 && Object.keys(newCodes).length === 0) {
    console.warn('Keine Codes in beiden Katalogen gefunden. Diff nicht möglich.');
    return [];
  }
  
  // Überprüfe, ob Umsteiger-Daten vorhanden sind
  const hasMigrationData = migrationData && migrationData.hasMigrationData;
  if (hasMigrationData) {
    console.log(`Umsteiger-Daten geladen: ${Object.keys(migrationData.fromOld).length} Einträge`);
  }
  
  // Sammle alle einzigartigen Code-Keys aus beiden Jahren
  // Für OPS müssen wir besonders vorsichtig mit der Normalisierung sein
  const normalizeFunc = (code) => normalizeCodeKey(code, type);
  
  // Erstelle eine vollständige Liste aller Code-Objekte
  const oldCodeValues = Object.values(oldCodes);
  const newCodeValues = Object.values(newCodes);
  
  console.log(`Code-Objekte: Alt=${oldCodeValues.length}, Neu=${newCodeValues.length}`);
  
  // Überprüfe die Formate der Code-Objekte
  if (oldCodeValues.length > 0) {
    console.log('Format Alt-Code (Beispiel):', oldCodeValues[0]);
    console.log('Normalisierter Key für Alt-Code:', normalizeFunc(oldCodeValues[0]));
  }
  if (newCodeValues.length > 0) {
    console.log('Format Neu-Code (Beispiel):', newCodeValues[0]);
    console.log('Normalisierter Key für Neu-Code:', normalizeFunc(newCodeValues[0]));
  }
  
  const oldCodeKeys = new Set(oldCodeValues.map(normalizeFunc));
  const newCodeKeys = new Set(newCodeValues.map(normalizeFunc));
  
  // Debug: Anzahl einzigartiger Codes
  console.log(`Unique Codes: Alt=${oldCodeKeys.size}, Neu=${newCodeKeys.size}`);
  
  // Voranalyse für hinzugefügte/entfernte Codes
  const onlyInOld = [...oldCodeKeys].filter(key => !newCodeKeys.has(key));
  const onlyInNew = [...newCodeKeys].filter(key => !oldCodeKeys.has(key));
  
  console.log(`Nur in Alt: ${onlyInOld.length} Codes`);
  console.log(`Nur in Neu: ${onlyInNew.length} Codes`);
  if (onlyInOld.length > 0) console.log('Beispiele nur in Alt:', onlyInOld.slice(0, 5));
  if (onlyInNew.length > 0) console.log('Beispiele nur in Neu:', onlyInNew.slice(0, 5));

  // Alle Codes beider Jahre als Set (vereinheitlicht)
  const allCodeKeys = Array.from(new Set([
    ...oldCodeValues.map(normalizeFunc),
    ...newCodeValues.map(normalizeFunc)
  ]));
  
  console.log(`Gesamtzahl unique Code-Keys: ${allCodeKeys.length}`);

  // Map für schnellen Zugriff
  const oldCodeMap = {};
  oldCodeValues.forEach(c => { 
    const key = normalizeFunc(c);
    oldCodeMap[key] = c; 
  });
  
  const newCodeMap = {};
  newCodeValues.forEach(c => { 
    const key = normalizeFunc(c);
    newCodeMap[key] = c; 
  });

  // Überprüfe die Maps
  console.log(`Map-Größen: Alt=${Object.keys(oldCodeMap).length}, Neu=${Object.keys(newCodeMap).length}`);

  // Hilfsfunktion: Finde den Dreisteller für einen Code
  const findDreistellerForCode = (code, dreistellerMap) => {
    if (!code || !dreistellerMap || Object.keys(dreistellerMap).length === 0) return null;
    
    // Extrahiere den Dreisteller-Teil (z.B. "1-20" aus "1-202")
    const match = code.match(/^(\d-\d{2})/);
    if (!match) return null;
    
    const dreistellerCode = match[1];
    
    console.log(`Suche Dreisteller für Code ${code}, Extrahierter Dreisteller-Code: ${dreistellerCode}`);
    
    // Dreisteller direkt aus der Map holen
    if (dreistellerMap[dreistellerCode]) {
      console.log(`  ✓ Dreisteller gefunden für ${dreistellerCode}:`, dreistellerMap[dreistellerCode]);
      return {
        code: dreistellerCode,
        description: dreistellerMap[dreistellerCode].description || ''
      };
    }
    
    // Fallback: Suche auch mit Großbuchstaben
    const upperDreistellerCode = dreistellerCode.toUpperCase();
    if (dreistellerMap[upperDreistellerCode]) {
      console.log(`  ✓ Dreisteller gefunden (Großbuchstaben) für ${upperDreistellerCode}:`, dreistellerMap[upperDreistellerCode]);
      return {
        code: upperDreistellerCode,
        description: dreistellerMap[upperDreistellerCode].description || ''
      };
    }
    
    // Zusätzlicher Fallback: Durchsuche die Map nach dem Code
    for (const key in dreistellerMap) {
      if (key === dreistellerCode || key.toUpperCase() === upperDreistellerCode) {
        console.log(`  ✓ Dreisteller durch Durchsuchen gefunden für ${dreistellerCode}:`, dreistellerMap[key]);
        return {
          code: key,
          description: dreistellerMap[key].description || ''
        };
      }
    }
    
    console.log(`  ✗ Kein Dreisteller gefunden für ${dreistellerCode}`);
    return null;
  };

  // Diff auf Code-Ebene (mit Berücksichtigung der Umsteiger)
  const codeDiffs = allCodeKeys.map(codeKey => {
    const oldCode = oldCodeMap[codeKey];
    const newCode = newCodeMap[codeKey];
    let codeStatus = 'unchanged';
    let subStatus = null;
    let diffDetails = null;
    let migrationTarget = null;
    let migrationSource = null;
    
    // OPS-spezifische Umsteiger-Informationen
    let sourceRequiresAdditionalCode = null;
    let targetRequiresAdditionalCode = null;
    let forwardAutomaticMapping = null;
    let backwardAutomaticMapping = null;
    
    // ICD-spezifische Umsteiger-Informationen
    let autoForward = undefined;
    let autoBackward = undefined;
    
    // Dreisteller-Informationen hinzufügen
    let oldDreistellerInfo = null;
    let newDreistellerInfo = null;
    
    if (type === 'ops') {
      if (oldCode) {
        oldDreistellerInfo = findDreistellerForCode(codeKey, oldDreisteller);
      }
      if (newCode) {
        newDreistellerInfo = findDreistellerForCode(codeKey, newDreisteller);
      }
    }
    
    if (!oldCode) {
      codeStatus = 'added';
      
      // Prüfe, ob dieser neu hinzugefügte Code ein Ersatz für einen alten Code ist
      if (hasMigrationData && migrationData.toNew[codeKey]) {
        subStatus = 'replacement';
        const migrationsInfo = migrationData.toNew[codeKey];
        
        // Überprüfen ob es ein Array von Code-Objekten oder einfach ein Array von Strings ist
        if (Array.isArray(migrationsInfo)) {
          if (migrationsInfo.length > 0) {
            if (typeof migrationsInfo[0] === 'object') {
              // Format für ICD und neues OPS-Format
              if (type === 'ops') {
                // OPS-Format
                migrationSource = migrationsInfo.map(info => info.code);
                
                // OPS-spezifische Felder
                const firstInfo = migrationsInfo[0];
                sourceRequiresAdditionalCode = firstInfo.sourceRequiresAdditionalCode;
                targetRequiresAdditionalCode = firstInfo.targetRequiresAdditionalCode;
                forwardAutomaticMapping = firstInfo.forwardAutomaticMapping; 
                backwardAutomaticMapping = firstInfo.backwardAutomaticMapping;
              } else {
                // ICD-Format
                migrationSource = migrationsInfo.map(info => info.code);
                autoForward = migrationsInfo[0].autoForward;
                autoBackward = migrationsInfo[0].autoBackward;
              }
            } else {
              // Altes Format: Array von Strings (direkten Codes)
              migrationSource = migrationsInfo;
            }
          }
        } else {
          // Einzelner Wert (altes Format oder Direktzuweisung)
          migrationSource = [migrationsInfo];
        }
      } else {
        subStatus = 'new';
      }
    }
    else if (!newCode) {
      codeStatus = 'removed';
      
      // Prüfe, ob für diesen entfernten Code ein Umstieg existiert
      if (hasMigrationData && migrationData.fromOld[codeKey]) {
        subStatus = 'redirected';
        const migrationInfo = migrationData.fromOld[codeKey];
        
        // Überprüfe, ob migrationInfo ein Objekt oder ein String ist
        if (typeof migrationInfo === 'object' && migrationInfo !== null) {
          if (type === 'ops') {
            // OPS-Format
            migrationTarget = migrationInfo.code;
            
            // OPS-spezifische Felder
            sourceRequiresAdditionalCode = migrationInfo.sourceRequiresAdditionalCode;
            targetRequiresAdditionalCode = migrationInfo.targetRequiresAdditionalCode;
            forwardAutomaticMapping = migrationInfo.forwardAutomaticMapping;
            backwardAutomaticMapping = migrationInfo.backwardAutomaticMapping;
          } else {
            // ICD-Format
            migrationTarget = migrationInfo.code;
            autoForward = migrationInfo.autoForward;
            autoBackward = migrationInfo.autoBackward;
          }
        } else {
          // Älteres Format, wo migrationInfo direkt der Zielcode ist
          migrationTarget = migrationInfo;
        }
      } else {
        subStatus = 'deprecated';
      }
    }
    else {
      // Feldgenauer Vergleich
      const diff = diffCodeFields(oldCode, newCode);
      if (Object.keys(diff).length > 0) {
        codeStatus = 'changed';
        diffDetails = diff;
      }
    }
    
    // Dreisteller-Informationen ins oldCode/newCode Objekt einbetten, falls nicht schon vorhanden
    let oldCodeWithDreisteller = oldCode;
    let newCodeWithDreisteller = newCode;
    
    if (oldCode && type === 'ops' && oldDreistellerInfo) {
      oldCodeWithDreisteller = {
        ...oldCode,
        dreisteller: {
          code: oldDreistellerInfo.code || '',
          description: oldDreistellerInfo.description || ''
        }
      };
    }
    
    if (newCode && type === 'ops' && newDreistellerInfo) {
      newCodeWithDreisteller = {
        ...newCode,
        dreisteller: {
          code: newDreistellerInfo.code || '',
          description: newDreistellerInfo.description || ''
        }
      };
    }
    
    return {
      code: codeKey,
      type,
      status: codeStatus,
      subStatus,
      oldCode: oldCodeWithDreisteller,
      newCode: newCodeWithDreisteller,
      diffDetails,
      migrationTarget,
      migrationSource,
      autoForward,
      autoBackward,
      sourceRequiresAdditionalCode,
      targetRequiresAdditionalCode,
      forwardAutomaticMapping,
      backwardAutomaticMapping,
      oldYear,
      newYear
    };
  });

  // Zähle die verschiedenen Diff-Typen
  const counts = {
    added: {
      total: codeDiffs.filter(d => d.status === 'added').length,
      new: codeDiffs.filter(d => d.status === 'added' && d.subStatus === 'new').length,
      replacement: codeDiffs.filter(d => d.status === 'added' && d.subStatus === 'replacement').length
    },
    removed: {
      total: codeDiffs.filter(d => d.status === 'removed').length,
      deprecated: codeDiffs.filter(d => d.status === 'removed' && d.subStatus === 'deprecated').length,
      redirected: codeDiffs.filter(d => d.status === 'removed' && d.subStatus === 'redirected').length
    },
    changed: codeDiffs.filter(d => d.status === 'changed').length,
    unchanged: codeDiffs.filter(d => d.status === 'unchanged').length,
  };
  console.log('Diff-Statistik:', counts);
  
  // Beispiele für die verschiedenen Status-Typen anzeigen
  const examples = {
    added: {
      new: codeDiffs.filter(d => d.status === 'added' && d.subStatus === 'new').slice(0, 3),
      replacement: codeDiffs.filter(d => d.status === 'added' && d.subStatus === 'replacement').slice(0, 3)
    },
    removed: {
      deprecated: codeDiffs.filter(d => d.status === 'removed' && d.subStatus === 'deprecated').slice(0, 3),
      redirected: codeDiffs.filter(d => d.status === 'removed' && d.subStatus === 'redirected').slice(0, 3)
    },
    changed: codeDiffs.filter(d => d.status === 'changed').slice(0, 3)
  };
  console.log('Beispiele für Änderungen:', examples);

  // Für die Übersichtlichkeit: Flache Liste aller Code-Diffs
  return codeDiffs;
}

function normalizeCodeKey(codeObj, type) {
  if (!codeObj) return '';
  
  if (type === 'icd') {
    // Für ICD: Nutze bevorzugt das Feld 'kode', sonst 'code', sonst ''
    return (codeObj?.kode || codeObj?.code || '').toUpperCase();
  } else {
    // Für OPS: Überprüfe alle möglichen Feldnamen
    // Überprüfe ob das Code-Objekt direkt ein String ist (bei manchen Formaten)
    if (typeof codeObj === 'string') return codeObj.toUpperCase();
    
    // Für OPS: Überprüfe alle möglichen Feldnamen in absteigender Priorität
    const opsKey = codeObj.ops_code || codeObj.kode || codeObj.code || codeObj.key;
    
    // Wenn ein direktes ID-Feld existiert, sollte es ein verlässlicher Identifier sein
    if (opsKey) return opsKey.toUpperCase();
    
    // Wenn kein direkter Schlüssel gefunden wird, suche nach einem passenden Feld 
    // In manchen OPS-Formaten ist der Schlüssel einfach das erste Feld im Objekt
    const firstKey = Object.keys(codeObj)[0];
    if (firstKey && /^\d[\-\.].+$/.test(firstKey)) {
      return firstKey.toUpperCase();
    }
    
    // Letzter Versuch: Wenn das Objekt einen "value" hat, der wie ein Code aussieht
    if (codeObj.value && /^\d[\-\.].+$/.test(codeObj.value)) {
      return codeObj.value.toUpperCase();
    }
    
    // Wenn wir immer noch keinen Schlüssel gefunden haben, gib einen leeren String zurück
    return '';
  }
}

function getAllKapitelKeys(oldChapters, newChapters) {
  return Array.from(new Set([
    ...Object.keys(oldChapters),
    ...Object.keys(newChapters)
  ])).sort();
}

function getGroupsForKapitel(groupsMap, kapitelKey) {
  // Gruppen, deren drittes Feld (Kapitelnummer) === kapitelKey
  return Object.values(groupsMap).filter(g => g.chapter === kapitelKey);
}

function getCodesForGroup(codesMap, groupStart, groupEnd) {
  // Alle Codes, die im Bereich [groupStart, groupEnd] liegen
  return Object.values(codesMap).filter(c => codeInRange(c.kode || c.code, groupStart, groupEnd));
}

function codeInRange(code, start, end) {
  // Alphanumerischer Vergleich für ICD/OPS Codes
  return code >= start && code <= end;
}

// Hilfsfunktion: Feld-Diff für Einzelcodes
function diffCodeFields(oldCode, newCode) {
  // Wenn einer der Codes ein String ist, wandle ihn in ein Objekt um
  if (typeof oldCode === 'string') oldCode = { code: oldCode };
  if (typeof newCode === 'string') newCode = { code: newCode };
  
  const diffs = {};
  const allKeys = new Set([...Object.keys(oldCode || {}), ...Object.keys(newCode || {})]);
  
  for (const key of allKeys) {
    // String-Werte sollten getrimmt werden, um Whitespace-Unterschiede zu ignorieren
    const oldVal = typeof oldCode?.[key] === 'string' ? oldCode[key].trim() : oldCode?.[key];
    const newVal = typeof newCode?.[key] === 'string' ? newCode[key].trim() : newCode?.[key];
    
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      diffs[key] = { old: oldCode?.[key], new: newCode?.[key] };
    }
  }
  return diffs;
}

export { normalizeCodeKey }; 