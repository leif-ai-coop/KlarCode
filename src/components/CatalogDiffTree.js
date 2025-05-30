import React, { useState, useMemo, useCallback } from 'react';
import { Box, Typography, Paper, Accordion, AccordionSummary, AccordionDetails, Chip, List, ListItem, ListItemText, Badge, Button } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import ChangeCircleIcon from '@mui/icons-material/ChangeCircle';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import ArticleIcon from '@mui/icons-material/Article';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CircularProgress from '@mui/material/CircularProgress';

// Status-Label-Map für menschenlesbare Beschreibungen
const STATUS_LABELS = {
  added: 'Hinzugefügt',
  removed: 'Entfernt',
  changed: 'Geändert',
  unchanged: 'Unverändert',
  
  // Sub-Status für hinzugefügte Codes
  new: 'Neu',
  replacement: 'Ersetzt',
  
  // Sub-Status für entfernte Codes
  deprecated: 'Ersatzlos entfernt',
  redirected: 'Umkodiert'
};

// Memoized CodeAccordion-Komponente für einzelne Codes
const CodeAccordion = React.memo(function CodeAccordion({ item, expanded, onToggle, areConsecutiveYears, renderMigrationInfo, renderDiffDetails, getStatusIcon, getStatusStyle, renderSubStatusChip, STATUS_LABELS, selectedCode, getCodeDescription }) {
  return (
    <Accordion 
      key={item.code}
      expanded={expanded}
      onChange={onToggle}
      sx={{ 
        ...getStatusStyle(item.status), 
        ml: 4, 
        mb: 0.5,
        '&:before': { display: 'none' },
        boxShadow: 'none',
        border: '1px solid rgba(0, 0, 0, 0.12)',
        backgroundColor: selectedCode === item.code ? 'rgba(0, 0, 0, 0.04)' : 'inherit'
      }}
      id={`code-${item.code}`}
    >
      <AccordionSummary 
        expandIcon={<ExpandMoreIcon />}
        sx={{ minHeight: 'unset', '& .MuiAccordionSummary-content': { margin: '8px 0' } }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          {getStatusIcon(item)}
          <Typography sx={{ ml: 1, flexGrow: 1 }}>
            {item.code}
            {areConsecutiveYears && getCodeDescription(item) && 
              <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                — {getCodeDescription(item)}
              </Typography>
            }
          </Typography>
          <Box>
            <Chip 
              label={STATUS_LABELS[item.status]} 
              size="small" 
              sx={{ 
                ml: 1,
                bgcolor: item.status === 'added' ? '#7D9692' :
                         item.status === 'removed' ? '#C1666B' : 
                         '#E3B23C',
                color: 'white'
              }}
            />
            {renderSubStatusChip(item)}
          </Box>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ p: 1 }}>
        {areConsecutiveYears && renderMigrationInfo(item)}
        {renderDiffDetails(item)}
      </AccordionDetails>
    </Accordion>
  );
});

export default function CatalogDiffTree({
  diffTree,
  catalogType,
  icdChapters,
  icdGroups,
  oldYear,
  newYear,
  expandedNodes,
  onToggleNode
}) {
  const [selectedCode, setSelectedCode] = useState(null);

  // Log props on render/update
  React.useEffect(() => {
    console.log("CatalogDiffTree Props Check:");
    console.log("  icdChapters:", icdChapters);
    console.log("  icdGroups:", icdGroups);
    console.log("  catalogType:", catalogType);
  }, [icdChapters, icdGroups, catalogType]);

  const areConsecutiveYears = useMemo(() => {
    // Check if the absolute difference is 1, allowing forward and backward
    return Math.abs(parseInt(newYear) - parseInt(oldYear)) === 1;
  }, [oldYear, newYear]);

  // Restore calculation of Dreisteller descriptions from diffTree (for OPS)
  const dreistellerDescriptions = useMemo(() => {
    if (!diffTree || diffTree.length === 0 || catalogType !== 'ops') return {};
    
    console.log('Suche nach Dreisteller-Daten im diffTree...');
    
    const descriptions = {};
    let foundCount = 0;
    
    diffTree.forEach(item => {
      // Check oldCode
      if (item.oldCode?.dreisteller?.description) {
          // Try to extract the dreisteller code key (e.g., 1-23) from the item's code
          const dreistellerCodeKey = item.code.match(/^(\d-\d{2})/)?.[0];
          if (dreistellerCodeKey && !descriptions[dreistellerCodeKey]) { // Prefer new if available
              descriptions[dreistellerCodeKey] = item.oldCode.dreisteller.description;
              foundCount++;
              // console.log(`Dreisteller found (Old): ${dreistellerCodeKey} -> "${item.oldCode.dreisteller.description}"`);
          }
      }
      // Check newCode (potentially overwriting old)
      if (item.newCode?.dreisteller?.description) {
          const dreistellerCodeKey = item.code.match(/^(\d-\d{2})/)?.[0];
          if (dreistellerCodeKey) {
              descriptions[dreistellerCodeKey] = item.newCode.dreisteller.description;
              foundCount++;
              // console.log(`Dreisteller found (New): ${dreistellerCodeKey} -> "${item.newCode.dreisteller.description}"`);
          }
      }
    });
    
    console.log(`Insgesamt ${Object.keys(descriptions).length} Dreisteller-Beschreibungen gefunden.`);
    return descriptions;
  }, [diffTree, catalogType]);

  // Restore calculation of ICD Group descriptions (e.g., A49 -> desc) from diffTree
  const icdGroupDescriptions = useMemo(() => {
    if (!diffTree || diffTree.length === 0 || catalogType !== 'icd') return {};
    
    console.log('Suche nach ICD-Gruppenbeschreibungen im diffTree...');
    const descriptions = {};
    let foundCount = 0;

    diffTree.forEach(item => {
      // Check if the code is a potential ICD group code (e.g., A49)
      const groupCodeMatch = item.code.match(/^([A-Z]\d{2})$/);
      if (groupCodeMatch) {
        const groupCode = groupCodeMatch[1];
        // Prefer new description, fallback to old
        const description = item.newCode?.beschreibung || item.oldCode?.beschreibung;
        if (description && !descriptions[groupCode]) { // Take the first one found
          descriptions[groupCode] = description;
          foundCount++;
          // console.log(`ICD Gruppe gefunden: ${groupCode} -> "${description}"`);
        }
      }
    });

    console.log(`Insgesamt ${Object.keys(descriptions).length} ICD-Gruppenbeschreibungen gefunden.`);
    return descriptions;
  }, [diffTree, catalogType]);

  // Filtere nur die Einträge mit Status != 'unchanged'
  const diffsOnly = useMemo(() => {
    // Nur geänderte, hinzugefügte und entfernte Codes - keine unveränderten
    return diffTree.filter(item => item.status !== 'unchanged');
  }, [diffTree]);
  
  // Zähle die verschiedenen Diff-Typen für die Statistik
  const stats = useMemo(() => {
    const result = {
      added: {
        total: diffTree.filter(d => d.status === 'added').length,
        new: diffTree.filter(d => d.status === 'added' && d.subStatus === 'new').length,
        replacement: diffTree.filter(d => d.status === 'added' && d.subStatus === 'replacement').length
      },
      removed: {
        total: diffTree.filter(d => d.status === 'removed').length,
        deprecated: diffTree.filter(d => d.status === 'removed' && d.subStatus === 'deprecated').length,
        redirected: diffTree.filter(d => d.status === 'removed' && d.subStatus === 'redirected').length
      },
      changed: diffTree.filter(d => d.status === 'changed').length,
      total: diffTree.length,
      // Count only changes, not unchanged items
      totalChanges: diffTree.filter(d => d.status !== 'unchanged').length
    };
    return result;
  }, [diffTree]);

  // Hilfsfunktion: Finde ein Code-Element anhand seines Codes
  const findCodeElement = (code) => {
    if (!code) return null;
    
    // Case-insensitive search for the code
    const lowerCode = code.toLowerCase();
    const found = diffTree.find(item => item.code && item.code.toLowerCase() === lowerCode);
    
    return found ? found.code : null;
  };
  
  // Springe zu einem Code in der Ansicht (z.B. bei Umsteiger-Codes)
  const jumpToCode = (code) => {
    if (!code) {
      console.error("Tried to jump to a code, but no code was provided");
      return;
    }
    
    console.log(`Attempting to jump to code: ${code}`);
    const targetCode = findCodeElement(code);
    
    if (targetCode) {
      console.log(`Found code ${targetCode}, scrolling to it`);
      setSelectedCode(targetCode);
      
      // Expandiere alle notwendigen Nodes (hierarchisch durch Kapitel/Gruppen)
      // In diesem Fall nur den Code selbst
      onToggleNode(`code-${targetCode}`);
      
      // Scrolle zur Position
      const element = document.getElementById(`code-${targetCode}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        console.error(`Element with ID code-${targetCode} not found in DOM`);
      }
    } else {
      console.error(`Code ${code} could not be found in the diff tree`);
      // Show an alert to the user
      alert(`Der Code ${code} konnte nicht gefunden werden. Möglicherweise ist er unverändert und daher in der Diff-Ansicht nicht sichtbar.`);
    }
  };

  // Baumstruktur aufbereiten
  const treeData = useMemo(() => {
    // Die Kapitel- und Gruppeneinteilung ist je nach Katalogtyp unterschiedlich
    const isICD = catalogType === 'icd';
    
    // Code-Pattern-Funktionen je nach Katalogtyp
    const extractKapitel = (code) => {
      if (isICD) {
        // ICD: Kapitel ist typischerweise der Buchstabe am Anfang
        const match = code.match(/^([A-Z])/);
        return match ? match[1] : null;
      } else {
        // OPS: Kapitel ist typischerweise die erste Zahl
        // OPS-Codes können verschiedene Formate haben: 1-234, 1-23.45, 1-23, etc.
        const match = code.match(/^(\d)[\-\.]/);
        // Wenn ein Bindestrich oder Punkt gefunden wurde, nimm die erste Ziffer
        if (match) return match[1];
        
        // Fallback: Erste Ziffer allein
        const simpleMatch = code.match(/^(\d)/);
        return simpleMatch ? simpleMatch[1] : null;
      }
    };

    // Gruppe aus dem Code extrahieren
    const extractGroup = (code) => {
      if (isICD) {
        // ICD: Gruppe ist typischerweise Buchstabe plus erste zwei Zahlen
        const match = code.match(/^([A-Z]\d{2})/);
        return match ? match[1] : null;
      } else {
        // OPS: Gruppe ist typischerweise Hauptziffer-Bindestrich-erste zwei Stellen
        // Beispiel: 1-20, 5-83, etc.
        const dashMatch = code.match(/^(\d-\d{2})/);
        if (dashMatch) return dashMatch[1];
        
        // Alternative 1: Format mit Punkt (eher selten)
        const dotMatch = code.match(/^(\d\.\d{2})/);
        if (dotMatch) return dotMatch[1];
        
        // Alternative 2: Nur Ziffern (wie 500, 510, etc.)
        const digitMatch = code.match(/^(\d)(\d{1,2})/);
        if (digitMatch) {
          // Formatiere als [Hauptziffer]-[Reste]
          // z.B. 500 -> 5-00, 12 -> 1-02
          return `${digitMatch[1]}-${digitMatch[2].padEnd(2, '0')}`;
        }
        
        // Wenn gar nichts passt: Erste Ziffer + "-00"
        const simpleMatch = code.match(/^(\d)/);
        return simpleMatch ? `${simpleMatch[1]}-00` : null;
      }
    };

    // Funktion zum Abrufen der Dreisteller-Beschreibung
    const getDreistellerDescription = (group) => {
      // Use the internally calculated dreistellerDescriptions map
      if (!isICD && dreistellerDescriptions[group]) { 
        return dreistellerDescriptions[group];
      }
      
      // Fallback: Suche nach der Beschreibung in den Codes (Keep this? Seems redundant now)
      // Let's comment out the fallback search for now, rely on the calculated map.
      // for (const item of diffsOnly) {
      //   if (item.code.startsWith(group)) {
      //     if (item.oldCode?.dreisteller?.description) {
      //       console.log(`Dreisteller-Beschreibung gefunden für ${group}:`, item.oldCode.dreisteller.description);
      //       return item.oldCode.dreisteller.description;
      //     }
      //     if (item.newCode?.dreisteller?.description) {
      //       console.log(`Dreisteller-Beschreibung gefunden für ${group}:`, item.newCode.dreisteller.description);
      //       return item.newCode.dreisteller.description;
      //     }
      //   }
      // }
      
      return ''; // Return empty if not in the map
    };

    // Helper function to find chapter number for an ICD letter key
    const getIcdChapterNumberFromLetter = (letterKey) => {
      // Each entry looks like { start: "A00", end: "A09", chapter: "01", ... }
      // We treat start / rangeStart aliases equally and do a case‑insensitive match on the first letter.
      const groupValue = Object.values(icdGroups).find(groupData => {
        if (typeof groupData !== 'object' || !groupData) return false;
        const rangeStart = groupData.rangeStart || groupData.start;
        return typeof rangeStart === 'string' && rangeStart.toUpperCase().startsWith(letterKey.toUpperCase());
      });
      
      // If a matching group object is found, return its chapter property
      if (groupValue && typeof groupValue.chapter === 'string') {
        const chapterNumber = groupValue.chapter;
        return chapterNumber;
      } else {
        // console.warn(`  No matching group object or chapter property found for letter: ${letterKey}`);
      }
      return null; // Not found or invalid structure
    };

    // Kapitel-Titel basierend auf dem Katalogtyp
    const getKapitelTitle = (key) => {
      if (isICD) { // Use prop catalogType via isICD
        // ICD Kapitel-Konvention - Revised
        if (!icdChapters || !icdGroups) {
          // console.warn(`Missing icdChapters or icdGroups for key ${key}`);
          return `Kapitel ${key} (Daten fehlen)`; // More specific fallback
        }
        const chapterNumber = getIcdChapterNumberFromLetter(key);
        if (chapterNumber && icdChapters[chapterNumber]) {
          const chapterEntry = icdChapters[chapterNumber];
          const chapterDescription = typeof chapterEntry === 'string' ? chapterEntry : chapterEntry?.description || '';
          // Remove possible leading zeros from chapter number for nicer display ("01" -> "1")
          const chapterDisplayNum = String(parseInt(chapterNumber, 10));
          return `Kapitel ${chapterDisplayNum} - ${chapterDescription}`;
        } else {
          // console.warn(`  Chapter number (${chapterNumber}) or description not found in icdChapters for key ${key}. Available chapter keys:`, Object.keys(icdChapters)); // Log failure and available keys
          return `Kapitel ${key} (Unbekanntes Kapitel)`;
        }
      } else {
        // OPS Kapitel-Konvention
        const opsKapitelTitles = {
          '1': 'Diagnostische Maßnahmen',
          '3': 'Bildgebende Diagnostik',
          '5': 'Operationen',
          '6': 'Medikamente',
          '8': 'Nichtoperative therapeutische Maßnahmen',
          '9': 'Ergänzende Maßnahmen'
        };
        return `${key} - ${opsKapitelTitles[key] || 'Kapitel ' + key}`;
      }
    };

    // Struktur aufbauen: Kapitel → Gruppen → Codes
    const kapitelMap = {};
    const groupMap = {};

    // Erst alle Codes nach Kapitel und Gruppe strukturieren
    diffsOnly.forEach(item => {
      const kapitelKey = extractKapitel(item.code);
      const group = extractGroup(item.code);
      
      if (!kapitelKey) return;

      // Kapitel erstellen falls noch nicht vorhanden
      if (!kapitelMap[kapitelKey]) {
        const title = getKapitelTitle(kapitelKey);
        kapitelMap[kapitelKey] = {
          id: `kapitel-${kapitelKey}`,
          title: title,
          children: {},
          stats: { 
            added: { total: 0, new: 0, replacement: 0 },
            removed: { total: 0, deprecated: 0, redirected: 0 },
            changed: 0, 
            total: 0,
            itemCount: 0  // Total count including unchanged items
          }
        };
      }
      
      // Gruppe erstellen falls noch nicht vorhanden
      if (!groupMap[group]) {
        // Dreisteller-Beschreibung holen wenn verfügbar (nur für OPS)
        const dreistellerDesc = !isICD ? getDreistellerDescription(group) : '';
        
        let groupTitle;
        // Für ICD und OPS unterschiedlich formatieren
        if (isICD) {
          // Bei ICD die Beschreibung aus der internen Map holen
          const icdDesc = icdGroupDescriptions[group] || ''; // Use internal icdGroupDescriptions
          groupTitle = icdDesc ? `${group} - ${icdDesc}` : `Gruppe ${group}`; 
        } else {
          // Bei OPS mit Dreisteller-Beschreibung oder nur dem Code
          groupTitle = dreistellerDesc ? `${group} ${dreistellerDesc}` : `${group}`;
        }

        groupMap[group] = {
          id: `group-${group}`,
          title: groupTitle,
          children: [],
          stats: { 
            added: { total: 0, new: 0, replacement: 0 },
            removed: { total: 0, deprecated: 0, redirected: 0 },
            changed: 0, 
            total: 0,
            itemCount: 0  // Total count including unchanged items
          }
        };
        
        // Gruppe zum Kapitel hinzufügen
        kapitelMap[kapitelKey].children[group] = groupMap[group];
      }
      
      // Code zur Gruppe hinzufügen
      groupMap[group].children.push(item);
      
      // Statistiken aktualisieren
      groupMap[group].stats.itemCount++;
      kapitelMap[kapitelKey].stats.itemCount++;
      
      // Only count as changes if the status is not 'unchanged'
      if (item.status === 'unchanged') {
        // Don't increment change counters for unchanged items
        return;
      }
      
      if (item.status === 'added') {
        groupMap[group].stats.added.total++;
        kapitelMap[kapitelKey].stats.added.total++;
        
        if (item.subStatus === 'new') {
          groupMap[group].stats.added.new++;
          kapitelMap[kapitelKey].stats.added.new++;
        } else if (item.subStatus === 'replacement') {
          groupMap[group].stats.added.replacement++;
          kapitelMap[kapitelKey].stats.added.replacement++;
        }
      }
      else if (item.status === 'removed') {
        groupMap[group].stats.removed.total++;
        kapitelMap[kapitelKey].stats.removed.total++;
        
        if (item.subStatus === 'deprecated') {
          groupMap[group].stats.removed.deprecated++;
          kapitelMap[kapitelKey].stats.removed.deprecated++;
        } else if (item.subStatus === 'redirected') {
          groupMap[group].stats.removed.redirected++;
          kapitelMap[kapitelKey].stats.removed.redirected++;
        }
      }
      else if (item.status === 'changed') {
        groupMap[group].stats.changed++;
        kapitelMap[kapitelKey].stats.changed++;
      }
      
      // Only increment total for non-unchanged items
      groupMap[group].stats.total++;
      kapitelMap[kapitelKey].stats.total++;
    });

    // Sortierte Kapitel-Liste erzeugen
    return Object.values(kapitelMap).sort((a, b) => {
      // Für OPS: Numerische Sortierung (1, 3, 5, ...)
      if (!isICD) {
        const numA = a.title.match(/^(\d)/)?.[1] || '0';
        const numB = b.title.match(/^(\d)/)?.[1] || '0';
        return parseInt(numA) - parseInt(numB);
      }
      // Für ICD: Alphabetische Sortierung (A, B, C, ...)
      const keyA = a.id.split('-')[1]; // Extract 'A' from 'kapitel-A'
      const keyB = b.id.split('-')[1]; // Extract 'B' from 'kapitel-B'
      return keyA.localeCompare(keyB);
    });
  }, [diffsOnly, catalogType, dreistellerDescriptions, icdGroupDescriptions, selectedCode, icdChapters, icdGroups]);

  // Stil für die verschiedenen Status
  const getStatusStyle = (status) => {
    switch (status) {
      case 'added': return { color: '#7D9692', fontWeight: 'bold' };
      case 'removed': return { color: '#C1666B', fontWeight: 'bold' };
      case 'changed': return { color: '#E3B23C', fontWeight: 'bold' };
      default: return {};
    }
  };

  // Status-Icon für Codes
  const getStatusIcon = (item) => {
    const { status, subStatus } = item;
    
    switch (status) {
      case 'added':
        if (subStatus === 'replacement') return <CompareArrowsIcon fontSize="small" sx={{ color: '#7D9692' }} />;
        return <AddIcon fontSize="small" sx={{ color: '#7D9692' }} />;
      case 'removed':
        if (subStatus === 'redirected') return <ArrowForwardIcon fontSize="small" sx={{ color: '#C1666B' }} />;
        return <RemoveIcon fontSize="small" sx={{ color: '#C1666B' }} />;
      case 'changed':
        return <ChangeCircleIcon fontSize="small" sx={{ color: '#E3B23C' }} />;
      default:
        return null;
    }
  };

  // Status-Zusammenfassung als Badges darstellen
  const renderStatusBadges = useCallback((stats) => (
    <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
      {stats.added.total > 0 && (
        <Badge badgeContent={stats.added.total} max={999} sx={{ '& .MuiBadge-badge': { fontSize: '0.7rem', bgcolor: '#7D9692', color: 'white' } }}>
          <Chip size="small" label={STATUS_LABELS.added} sx={{ color: '#7D9692', borderColor: '#7D9692' }} variant="outlined" />
        </Badge>
      )}
      {stats.removed.total > 0 && (
        <Badge badgeContent={stats.removed.total} max={999} sx={{ '& .MuiBadge-badge': { fontSize: '0.7rem', bgcolor: '#C1666B', color: 'white' } }}>
          <Chip size="small" label={STATUS_LABELS.removed} sx={{ color: '#C1666B', borderColor: '#C1666B' }} variant="outlined" />
        </Badge>
      )}
      {stats.changed > 0 && (
        <Badge badgeContent={stats.changed} max={999} sx={{ '& .MuiBadge-badge': { fontSize: '0.7rem', bgcolor: '#E3B23C', color: 'white' } }}>
          <Chip size="small" label={STATUS_LABELS.changed} sx={{ color: '#E3B23C', borderColor: '#E3B23C' }} variant="outlined" />
        </Badge>
      )}
    </Box>
  ), [STATUS_LABELS]);

  // Render der Diff-Details für einen Code
  const renderDiffDetails = (item) => {
    // Wenn es keine Änderungen gibt, nichts anzeigen
    if (item.status !== 'changed') return null;
    
    // Wenn keine Detail-Diffs vorhanden sind (sollte bei 'changed' nicht passieren, aber sicher ist sicher)
    if (!item.diffDetails) return null;
    
    // Mapping für nutzerfreundliche Feldbezeichnungen
    const fieldLabels = {
      // ICD-spezifische Felder
      usage295: 'Verwendung §295',
      usage301: 'Verwendung §301',
      genderRestriction: 'Geschlechtsbezug',
      minAge: 'Untere Altersgrenze',
      maxAge: 'Obere Altersgrenze',
      ageError: 'Fehlerart bei Altersbezug',
      ifsgReporting: 'IfSG-Meldung',
      ifsgLab: 'IfSG-Labor',
      
      // OPS-spezifische Felder
      terminalCode: 'Terminale Schlüsselnummer',
      sideRequired: 'Seitenangabe erforderlich',
      validityKHG: 'Gültigkeit § 17 KHG',
      isAdditionalCode: 'Zusatzkode',
      isOneTimeCode: 'Einmalkode',
      
      // Allgemeine strukturelle Felder
      gruppe: 'Gruppe',
      kapitel: 'Kapitel',
      dreisteller: 'Dreisteller',
      beschreibung: 'Beschreibung',
      kode: 'Kode',
      code: 'Kode'
    };
    
    return (
      <Box sx={{ pl: 4, pt: 1 }}>
        <Typography variant="subtitle2" gutterBottom>Feldänderungen:</Typography>
        <List dense>
          {Object.entries(item.diffDetails).map(([field, values]) => (
            <ListItem key={field}>
              <ListItemText
                primary={fieldLabels[field] || field}
                secondary={
                  <React.Fragment>
                    <Typography component="span" variant="body2" color="error.main" sx={{ display: 'block' }}>
                      Alt: {values.old !== null && values.old !== undefined ? String(values.old) : '(nicht gesetzt)'}
                    </Typography>
                    <Typography component="span" variant="body2" color="success.main" sx={{ display: 'block' }}>
                      Neu: {values.new !== null && values.new !== undefined ? String(values.new) : '(nicht gesetzt)'}
                    </Typography>
                  </React.Fragment>
                }
              />
            </ListItem>
          ))}
        </List>
      </Box>
    );
  };

  // Migrationsinformationen für einen Code darstellen (Umsteiger-Info)
  const renderMigrationInfo = (item) => {
    // Migration info only makes sense for consecutive years
    const isConsecutiveComparison = Math.abs(parseInt(newYear) - parseInt(oldYear)) === 1;
    if (!isConsecutiveComparison) return null;

    const isReverseComparison = parseInt(oldYear) > parseInt(newYear);

    // Determine which migration info block(s) to show based on status
    // Forward block (->) shows where a removed code went (uses migrationTarget)
    const showForwardBlock = item.status === 'removed';
    // Backward block (<-) shows where an added code came from (uses migrationSource)
    const showBackwardBlock = item.status === 'added';

    const forwardMigrationTarget = item.migrationTarget;
    const backwardMigrationSource = item.migrationSource;

    // Return early if no relevant migration data exists for the conditions determined above
    if ((showForwardBlock && !forwardMigrationTarget) && (showBackwardBlock && (!backwardMigrationSource || backwardMigrationSource.length === 0))) {
        return null;
    }

    // Helper to get the status label of a code
    const getCodeStatusLabel = (code) => {
      const targetItem = diffTree.find(item => item.code && item.code.toLowerCase() === code.toLowerCase());
      if (!targetItem) return "Nicht im Diff vorhanden";
      
      let statusLabel = STATUS_LABELS[targetItem.status] || "Unbekannter Status";
      
      // Spezifischere Status-Information basierend auf subStatus (nur bei konsekutiven Jahren sinnvoll)
      if (isConsecutiveComparison && targetItem.status === 'added' && targetItem.subStatus) {
        statusLabel += ` (${targetItem.subStatus === 'new' ? STATUS_LABELS.new : STATUS_LABELS.replacement})`;
      } else if (isConsecutiveComparison && targetItem.status === 'removed' && targetItem.subStatus) {
        statusLabel += ` (${targetItem.subStatus === 'deprecated' ? STATUS_LABELS.deprecated : STATUS_LABELS.redirected})`;
      }
      
      return statusLabel;
    };
    
    // Helper to get the description of a code
    const getCodeDescriptionByCode = (code) => {
      const targetItem = diffTree.find(item => item.code && item.code.toLowerCase() === code.toLowerCase());
      if (!targetItem) return "Keine Beschreibung verfügbar";
      
      const isICD = catalogType === 'icd';
      
      if (isICD) {
        return targetItem.newCode?.beschreibung || targetItem.oldCode?.beschreibung || 'Keine Beschreibung verfügbar';
      } else {
        // OPS verwendet oft 'titel' statt 'beschreibung'
        return targetItem.newCode?.titel || targetItem.oldCode?.titel || 
               targetItem.newCode?.beschreibung || targetItem.oldCode?.beschreibung || 'Keine Beschreibung verfügbar';
      }
    };
    
    // Check if an item needs an additional code marker (OPS specific logic might exist here)
    const needsAdditionalCode = (codeData) => {
      if (!codeData) return false;
      // Existing logic for checking additional code requirement...
      if (catalogType === 'ops') {
        if (codeData.requiresAdditionalCode === 'J') return true; // From migration data
        return codeData.isAdditionalCode === true; // From code details
      }
      return false;
    };
    
    // Helper to get tooltip info for code
    const getCodeTooltip = (code, isTargetContext = false) =>
    {
      const description = getCodeDescriptionByCode(code);
      const status = getCodeStatusLabel(code);
      let tooltip = `${description} (${status})`;

      // Add OPS specific info like Zusatzkennzeichen
      if (catalogType === 'ops') {
        const targetItem = diffTree.find(item => item.code && item.code.toLowerCase() === code.toLowerCase());
        if (targetItem) {
           // Determine if Zusatzkennzeichen applies based on the context (forward/backward)
           // Note: The original item holds the flags like targetRequiresAdditionalCode / sourceRequiresAdditionalCode
           const needsAdditional = isTargetContext
             ? item.targetRequiresAdditionalCode === 'J'
             : item.sourceRequiresAdditionalCode === 'J' || needsAdditionalCode(targetItem.oldCode || targetItem.newCode);

           if (needsAdditional) {
            tooltip += "\nErfordert Zusatzkennzeichen";
          }
        }
      }
      return tooltip;
    };
    
    return (
      <Box sx={{ pl: 4, pt: 1, mb: 2 }}>
        {/* Forward Migration Block (Original Transition: Source -> Target) */}
        {showForwardBlock && forwardMigrationTarget && (
          <Box sx={{ mb: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              {/* Adjust title based on comparison direction */}
              {isReverseComparison ? `Umsteiger-Info (${newYear} → ${oldYear})` : `Umsteiger-Info (${oldYear} → ${newYear})`}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <ArrowForwardIcon fontSize="small" color="primary" sx={{ mr: 1 }} />
              <Typography variant="body2" component="div">
                {/* Adjust descriptive text based on comparison direction */}
                {isReverseComparison
                  ? `Code wurde im Folgejahr (${oldYear}) ersetzt durch:`
                  : `Code wurde ersetzt durch:`
                }
                <Chip
                  label={forwardMigrationTarget}
                  size="small"
                  sx={{ ml: 1, '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.08)', cursor: 'help' } }}
                  title={getCodeTooltip(forwardMigrationTarget, true)} // Use true for target context
                />
                {/* Zusatzkennzeichen Badge (OPS) */}
                {catalogType === 'ops' && item.targetRequiresAdditionalCode === 'J' && (
                  <Chip 
                    label="Zusatzkennzeichen erforderlich" 
                    size="small" 
                    color="info"
                    sx={{ ml: 1, fontSize: '0.7rem' }}
                  />
                )}
                {/* Überleitbarkeit Vorwärts Badge */}
                {(typeof item.autoForward !== 'undefined' || catalogType === 'ops') && (
                   <Chip 
                    label={
                      catalogType === 'ops'
                        ? (item.forwardAutomaticMapping === 'A' ? "Automatisch überleitbar" : "Manuell überleiten")
                        : (item.autoForward ? "Automatisch überleitbar" : "Manuell überleiten")
                    } 
                    size="small" 
                    color="default"
                    sx={{ 
                      ml: 1, 
                      fontSize: '0.7rem',
                      bgcolor: (catalogType === 'ops' && item.forwardAutomaticMapping === 'A') || 
                        (catalogType !== 'ops' && item.autoForward) 
                          ? '#7D9692' 
                          : '#C1666B',
                      color: 'white'
                    }}
                  />
                )}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Backward Migration Block (Original Transition: Target <- Source) */}
        {showBackwardBlock && backwardMigrationSource && Array.isArray(backwardMigrationSource) && backwardMigrationSource.length > 0 && (
          // Add margin top if the forward block is also shown
          <Box sx={{ mt: showForwardBlock && forwardMigrationTarget ? 2 : 0 }}> 
            <Typography variant="subtitle2" gutterBottom>
              {/* Adjust title based on comparison direction */}
              {isReverseComparison ? `Umsteiger-Info (${newYear} → ${oldYear})` : `Umsteiger-Info (${oldYear} → ${newYear})`}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <ArrowBackIcon fontSize="small" color="primary" sx={{ mr: 1 }} />
              <Typography variant="body2" component="div">
                {/* Adjust descriptive text based on comparison direction */}
                {isReverseComparison
                  ? `Code ersetzt:`
                  : `Dieser Code ersetzt folgenden Code aus dem Vorjahr (${oldYear}):`
                }
                <Box component="span">
                  {backwardMigrationSource.map((source, index) => (
                    <Chip
                      key={source}
                      label={source}
                      size="small"
                      sx={{ 
                        ml: 1,
                        mr: index < backwardMigrationSource.length - 1 ? 0.5 : 0,
                        '&:hover': { 
                          backgroundColor: 'rgba(0, 0, 0, 0.08)',
                          cursor: 'help'
                        } 
                      }}
                      title={getCodeTooltip(source, false)} // Use false for source context
                    />
                  ))}
                  {/* Zusatzkennzeichen Badge (OPS) */}
                  {catalogType === 'ops' && item.sourceRequiresAdditionalCode === 'J' && (
                    <Chip 
                      label="Zusatzkennzeichen erforderlich" 
                      size="small" 
                      color="info"
                      sx={{ ml: 1, fontSize: '0.7rem' }}
                    />
                  )}
                  {/* Überleitbarkeit Rückwärts Badge */}
                  {(typeof item.autoBackward !== 'undefined' || catalogType === 'ops') && (
                    <Chip 
                      label={
                        catalogType === 'ops'
                          ? (item.backwardAutomaticMapping === 'A' ? "Automatisch rücküberleitbar" : "Manuell rücküberleiten")
                          : (item.autoBackward ? "Automatisch rücküberleitbar" : "Manuell rücküberleiten")
                      } 
                      size="small" 
                      color="default"
                      sx={{ 
                        ml: 1, 
                        fontSize: '0.7rem',
                        bgcolor: (catalogType === 'ops' && item.backwardAutomaticMapping === 'A') || 
                          (catalogType !== 'ops' && item.autoBackward) 
                            ? '#7D9692' 
                            : '#C1666B',
                        color: 'white'
                      }}
                    />
                  )}
                </Box>
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    );
  };

  // Beschreibung für einen Code je nach Katalogtyp
  const getCodeDescription = (item) => {
    const isICD = catalogType === 'icd';
    
    if (isICD) {
      return item.newCode?.beschreibung || item.oldCode?.beschreibung || '';
    } else {
      // OPS verwendet oft 'titel' statt 'beschreibung'
      return item.newCode?.titel || item.oldCode?.titel || 
             item.newCode?.beschreibung || item.oldCode?.beschreibung || '';
    }
  };

  // Sub-Status Chip rendern mit spezifischerem Label
  const renderSubStatusChip = (item) => {
    // Nur anzeigen, wenn die Jahre aufeinanderfolgen
    if (!areConsecutiveYears) return null;
    
    const { status, subStatus } = item;
    
    if (!subStatus) return null;
    
    let color, label, chipColor;
    
    if (status === 'added') {
      color = '#7D9692';
      chipColor = { color: '#7D9692', borderColor: '#7D9692' };
      label = subStatus === 'new' ? STATUS_LABELS.new : STATUS_LABELS.replacement;
    } else if (status === 'removed') {
      color = '#C1666B';
      chipColor = { color: '#C1666B', borderColor: '#C1666B' };
      label = subStatus === 'deprecated' ? STATUS_LABELS.deprecated : STATUS_LABELS.redirected;
    } else {
      return null;
    }
    
    return (
      <Chip 
        label={label} 
        size="small" 
        sx={{ ...chipColor, ml: 0.5, fontSize: '0.7rem' }}
        variant="outlined"
      />
    );
  };

  // Memoized renderCode
  const renderCode = useCallback((item) => (
    <CodeAccordion
      item={item}
      expanded={!!expandedNodes[`code-${item.code}`] || selectedCode === item.code}
      onToggle={() => onToggleNode(`code-${item.code}`)}
      areConsecutiveYears={areConsecutiveYears}
      renderMigrationInfo={renderMigrationInfo}
      renderDiffDetails={renderDiffDetails}
      getStatusIcon={getStatusIcon}
      getStatusStyle={getStatusStyle}
      renderSubStatusChip={renderSubStatusChip}
      STATUS_LABELS={STATUS_LABELS}
      selectedCode={selectedCode}
      getCodeDescription={getCodeDescription}
    />
  ), [expandedNodes, selectedCode, areConsecutiveYears, renderMigrationInfo, renderDiffDetails, getStatusIcon, getStatusStyle, renderSubStatusChip, getCodeDescription, onToggleNode]);

  // State für Lazy Loading
  const [loadedKapitel, setLoadedKapitel] = useState({}); // { kapitelId: { ...gruppen } }
  const [loadedGroups, setLoadedGroups] = useState({});   // { groupId: [codes] }
  const [loadingKapitel, setLoadingKapitel] = useState({}); // { kapitelId: true/false }
  const [loadingGroup, setLoadingGroup] = useState({});     // { groupId: true/false }

  // Hilfsfunktion: Extrahiere Gruppen für ein Kapitel
  const extractGroupsForKapitel = useCallback((kapitel) => {
    // Nutze die Logik aus treeData, aber nur für das gewünschte Kapitel
    const isICD = catalogType === 'icd';
    const extractGroup = (code) => {
      if (isICD) {
        const match = code.match(/^([A-Z]\d{2})/);
        return match ? match[1] : null;
      } else {
        const dashMatch = code.match(/^(\d-\d{2})/);
        if (dashMatch) return dashMatch[1];
        const dotMatch = code.match(/^(\d\.\d{2})/);
        if (dotMatch) return dotMatch[1];
        const digitMatch = code.match(/^(\d)(\d{1,2})/);
        if (digitMatch) {
          return `${digitMatch[1]}-${digitMatch[2].padEnd(2, '0')}`;
        }
        const simpleMatch = code.match(/^(\d)/);
        return simpleMatch ? `${simpleMatch[1]}-00` : null;
      }
    };

    // Funktion zum Abrufen der Dreisteller-Beschreibung (nur für OPS relevant hier)
    const getDreistellerDescription = (group) => {
      if (isICD) return ''; 
      
      // Use the internally calculated map
      if (dreistellerDescriptions[group]) { 
        return dreistellerDescriptions[group];
      }
      
      // Fallback: Suche in Codes (commented out as above)
      // for (const item of diffsOnly) {
      //   ...
      // }
      return '';
    };
    
    // Lokale Hilfsfunktion: Kapitel-Schlüssel aus einem Code extrahieren
    const extractKapitelFromCode = (code) => {
      if (isICD) {
        const match = code.match(/^([A-Z])/);
        return match ? match[1] : null;
      } else {
        const match = code.match(/^(\d)[\-.]?/);
        return match ? match[1] : null;
      }
    };
    
    // Bestimme den Kapitel-Schlüssel direkt aus der ID ("kapitel-A", "kapitel-5", ...)
    const kapitelKey = kapitel.id.split('-')[1];
    if (!kapitelKey) {
      console.error(`Konnte kapitelKey nicht aus kapitel.id extrahieren: ${kapitel.id}`);
      return {};
    }
    console.log(`Kapitel-Key für Gruppenextraktion: ${kapitelKey}`);

    // Filtere alle Codes, deren Kapitel-Schlüssel mit extractKapitel übereinstimmt
    const codesForKapitel = diffsOnly.filter(item => {
      const itemKapitelKey = extractKapitelFromCode(item.code);
      return itemKapitelKey === kapitelKey;
    });
    
    console.log(`Gefundene Codes für Kapitel ${kapitelKey}: ${codesForKapitel.length}`);
    
    // Baue Gruppenstruktur
    const groupMap = {};
    codesForKapitel.forEach(item => {
      const group = extractGroup(item.code);
      if (!group) {
        console.warn(`Konnte keine Gruppe für Code ${item.code} extrahieren`);
        return;
      }
      
      if (!groupMap[group]) {
        // Dreisteller-Beschreibung holen wenn verfügbar (nur für OPS)
        const dreistellerDesc = !isICD ? getDreistellerDescription(group) : '';
        
        let groupTitle;
        // Für ICD und OPS unterschiedlich formatieren
        if (isICD) { 
          // Bei ICD die Beschreibung aus der internen Map holen
          const icdDesc = icdGroupDescriptions[group] || ''; // Use internal icdGroupDescriptions
          groupTitle = icdDesc ? `${group} - ${icdDesc}` : `Gruppe ${group}`; 
        } else {
          // Bei OPS mit Dreisteller-Beschreibung oder nur dem Code
          groupTitle = dreistellerDesc ? `${group} ${dreistellerDesc}` : `${group}`;
        }
        
        groupMap[group] = {
          id: `group-${group}`,
          title: groupTitle,
          children: [],
          stats: { added: { total: 0, new: 0, replacement: 0 }, removed: { total: 0, deprecated: 0, redirected: 0 }, changed: 0, total: 0, itemCount: 0 }
        };
      }
      groupMap[group].children.push(item);
      groupMap[group].stats.itemCount++;
      if (item.status === 'added') {
        groupMap[group].stats.added.total++;
        if (item.subStatus === 'new') groupMap[group].stats.added.new++;
        if (item.subStatus === 'replacement') groupMap[group].stats.added.replacement++;
      } else if (item.status === 'removed') {
        groupMap[group].stats.removed.total++;
        if (item.subStatus === 'deprecated') groupMap[group].stats.removed.deprecated++;
        if (item.subStatus === 'redirected') groupMap[group].stats.removed.redirected++;
      } else if (item.status === 'changed') {
        groupMap[group].stats.changed++;
      }
      groupMap[group].stats.total++;
    });
    return groupMap;
  }, [diffsOnly, catalogType, dreistellerDescriptions, icdGroupDescriptions]);

  // Hilfsfunktion: Extrahiere Codes für eine Gruppe
  const extractCodesForGroup = useCallback((group) => {
    // group.children ist bereits die Liste der Codes
    return group.children.sort((a, b) => a.code.localeCompare(b.code));
  }, []);

  // Lazy Loading für Kapitel
  const handleKapitelExpand = useCallback((kapitel) => {
    if (loadedKapitel[kapitel.id] || loadingKapitel[kapitel.id]) return;
    
    console.log(`Kapitel wird expandiert: ${kapitel.id}, Titel: ${kapitel.title}`);
    setLoadingKapitel(prev => ({ ...prev, [kapitel.id]: true }));
    
    // Wir führen den Code synchron aus, um Timing-Probleme zu vermeiden
    try {
      const groups = extractGroupsForKapitel(kapitel);
      console.log(`Kapitel ${kapitel.id}: ${Object.keys(groups).length} Gruppen gefunden`);
      
      // Log einige Beispielgruppen für Debug-Zwecke
      if (Object.keys(groups).length > 0) {
        console.log('Beispiel-Gruppen:', Object.entries(groups).slice(0, 2));
      } else {
        console.log('Keine Gruppen für dieses Kapitel gefunden!');
      }
      
      setLoadedKapitel(prev => ({ ...prev, [kapitel.id]: groups }));
      setLoadingKapitel(prev => ({ ...prev, [kapitel.id]: false }));
    } catch (error) {
      console.error(`Fehler beim Expandieren des Kapitels ${kapitel.id}:`, error);
      setLoadingKapitel(prev => ({ ...prev, [kapitel.id]: false }));
    }
  }, [extractGroupsForKapitel, loadedKapitel, loadingKapitel]);

  // Lazy Loading für Gruppen
  const handleGroupExpand = useCallback((group, kapitelId) => {
    if (loadedGroups[group.id] || loadingGroup[group.id]) return;
    
    console.log(`Gruppe wird expandiert: ${group.id}, Titel: ${group.title}`);
    setLoadingGroup(prev => ({ ...prev, [group.id]: true }));
    
    // Synchron ausführen statt mit setTimeout
    try {
      const codes = extractCodesForGroup(group);
      console.log(`Gruppe ${group.id}: ${codes.length} Codes geladen`);
      
      // Log einige Beispiel-Codes für Debug-Zwecke
      if (codes.length > 0) {
        console.log('Beispiel-Codes:', codes.slice(0, 2).map(c => c.code));
      } else {
        console.log('Keine Codes für diese Gruppe gefunden!');
      }
      
      setLoadedGroups(prev => ({ ...prev, [group.id]: codes }));
      setLoadingGroup(prev => ({ ...prev, [group.id]: false }));
    } catch (error) {
      console.error(`Fehler beim Expandieren der Gruppe ${group.id}:`, error);
      setLoadingGroup(prev => ({ ...prev, [group.id]: false }));
    }
  }, [extractCodesForGroup, loadedGroups, loadingGroup]);

  // Group Accordion Component
  const GroupAccordion = React.memo(function GroupAccordion({ group, kapitelId }) {
    const isExpanded = !!expandedNodes[group.id];
    const isLoading = loadingGroup[group.id];
    const codes = loadedGroups[group.id];

    // Effect to trigger lazy loading
    React.useEffect(() => {
      if (isExpanded && !codes && !isLoading) {
        console.log(`Effect: Laden der Codes für expandierte Gruppe ${group.id}`);
        handleGroupExpand(group, kapitelId);
      }
    }, [isExpanded, codes, isLoading, group, kapitelId]); // Removed handleGroupExpand dependency if it causes issues, re-add if needed

    console.log(`Render GroupAccordion: ${group.id}, Expanded: ${isExpanded}, Loading: ${isLoading}, Codes: ${codes ? codes.length : 'none'}`);

    return (
      <Accordion 
        key={group.id}
        expanded={isExpanded}
        onChange={() => onToggleNode(group.id)}
        sx={{ ml: 2, mb: 0.5, '&:before': { display: 'none' }, boxShadow: 'none', border: '1px solid rgba(0, 0, 0, 0.12)' }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            {isExpanded ? 
              <FolderOpenIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} /> : 
              <FolderIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
            }
            <Typography sx={{ flexGrow: 1 }}>
              {group.title}
              <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                ({group.stats.total} {group.stats.total === 1 ? 'Änderung' : 'Änderungen'})
              </Typography>
            </Typography>
            {renderStatusBadges(group.stats)}
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0 }}>
          {isLoading && (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <CircularProgress size={24} />
              <Typography variant="body2" sx={{ mt: 1 }}>Lade Codes...</Typography>
            </Box>
          )}
          {codes && codes.length === 0 && (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">Keine Codes gefunden</Typography>
            </Box>
          )}
          {codes && codes.map(renderCode)}
        </AccordionDetails>
      </Accordion>
    );
  });

  // Kapitel Accordion Component
  const KapitelAccordion = React.memo(function KapitelAccordion({ kapitel }) {
    const isExpanded = !!expandedNodes[kapitel.id];
    const isLoading = loadingKapitel[kapitel.id];
    const groups = loadedKapitel[kapitel.id];

    // Effect to trigger lazy loading
    React.useEffect(() => {
      if (isExpanded && !groups && !isLoading) {
        console.log(`Effect: Laden der Gruppen für expandiertes Kapitel ${kapitel.id}`);
        handleKapitelExpand(kapitel);
      }
    }, [isExpanded, groups, isLoading, kapitel]); // Removed handleKapitelExpand dependency if it causes issues

    console.log(`Render KapitelAccordion: ${kapitel.id}, Expanded: ${isExpanded}, Loading: ${isLoading}, Groups: ${groups ? Object.keys(groups).length : 'none'}`);

    return (
      <Accordion 
        key={kapitel.id}
        expanded={isExpanded}
        onChange={() => onToggleNode(kapitel.id)}
        sx={{ mb: 1 }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            {isExpanded ? 
              <FolderOpenIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} /> : 
              <FolderIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
            }
            <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
              {kapitel.title}
              <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                ({kapitel.stats.total} {kapitel.stats.total === 1 ? 'Änderung' : 'Änderungen'})
              </Typography>
            </Typography>
            {renderStatusBadges(kapitel.stats)}
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0 }}>
          {isLoading && (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <CircularProgress size={24} />
              <Typography variant="body2" sx={{ mt: 1 }}>Lade Gruppen...</Typography>
            </Box>
          )}
          {groups && Object.keys(groups).length === 0 && (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">Keine Gruppen gefunden</Typography>
            </Box>
          )}
          {groups && Object.values(groups)
            .sort((a, b) => {
              if (catalogType === 'icd') { // Use catalogType from parent scope
                return a.title.localeCompare(b.title);
              } else {
                const numA = a.title.match(/\d+/)?.[0] || '0';
                const numB = b.title.match(/\d+/)?.[0] || '0';
                return parseInt(numA) - parseInt(numB);
              }
            })
            .map(group => <GroupAccordion key={group.id} group={group} kapitelId={kapitel.id} />)}
        </AccordionDetails>
      </Accordion>
    );
  });

  // Kapitel-Liste vorbereiten (treeData nur Kapitel)
  const kapitelList = useMemo(() => treeData.map(k => ({ id: k.id, title: k.title, stats: k.stats })), [treeData]);

  // Render der Statistik
  const renderStats = () => (
    <Box sx={{ mb: 3 }}>
      {/* <Typography variant="h6" gutterBottom>
        Delta-Statistik
      </Typography> */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ minWidth: 150 }}>
          <Typography variant="subtitle2" sx={{ color: '#7D9692' }}>Hinzugefügt ({stats.added.total})</Typography>
          {areConsecutiveYears && (
            <Box sx={{ pl: 2 }}>
              <Typography variant="body2">Neu: {stats.added.new}</Typography>
              <Typography variant="body2">Ersatz für alte Codes: {stats.added.replacement}</Typography>
            </Box>
          )}
        </Box>
        
        <Box sx={{ minWidth: 150 }}>
          <Typography variant="subtitle2" sx={{ color: '#C1666B' }}>Entfernt ({stats.removed.total})</Typography>
          {areConsecutiveYears && (
            <Box sx={{ pl: 2 }}>
              <Typography variant="body2">Ersatzlos: {stats.removed.deprecated}</Typography>
              <Typography variant="body2">Umkodiert: {stats.removed.redirected}</Typography>
            </Box>
          )}
        </Box>
        
        <Box sx={{ minWidth: 150 }}>
          <Typography variant="subtitle2" sx={{ color: '#E3B23C' }}>Geändert: {stats.changed}</Typography>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          {catalogType.toUpperCase()} Delta-Ergebnisse
        </Typography>
        <Typography variant="body2">
          Insgesamt {stats.total} Codes verglichen, davon {stats.totalChanges} mit Unterschieden
        </Typography>
      </Box>
      
      {renderStats()}
      
      {diffsOnly.length === 0 ? (
        <Typography variant="body1" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
          Keine Unterschiede gefunden
        </Typography>
      ) : (
        <Box>
          {kapitelList.map(kapitel => (
            <KapitelAccordion key={kapitel.id} kapitel={kapitel} />
          ))}
        </Box>
      )}
    </Paper>
  );
} 