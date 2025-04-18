import React, { useState, useMemo } from 'react';
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

export default function CatalogDiffTree({ diffTree }) {
  // Expandierte Nodes verwalten
  const [expandedNodes, setExpandedNodes] = useState({});
  
  // Falls ein Code angeklickt wird, um zu seinem Migrations-Ziel zu springen
  const [selectedCode, setSelectedCode] = useState(null);
  
  // Katalog-Typ aus dem ersten Diff-Element bestimmen
  const catalogType = useMemo(() => {
    if (!diffTree || diffTree.length === 0) return 'icd';
    return diffTree[0]?.type || 'icd';
  }, [diffTree]);

  // Überprüfen, ob es aufeinanderfolgende Jahre sind (für Umsteiger)
  const areConsecutiveYears = useMemo(() => {
    if (!diffTree || diffTree.length === 0) return false;
    
    // Wir schauen auf das erste Element und extrahieren die Jahre aus den oldYear/newYear
    const firstItem = diffTree[0];
    if (!firstItem || !firstItem.oldYear || !firstItem.newYear) return false;
    
    const oldYear = parseInt(firstItem.oldYear);
    const newYear = parseInt(firstItem.newYear);
    
    return !isNaN(oldYear) && !isNaN(newYear) && newYear - oldYear === 1;
  }, [diffTree]);

  // Filtere nur die Einträge mit Status != 'unchanged'
  const diffsOnly = useMemo(() => diffTree.filter(item => item.status !== 'unchanged'), [diffTree]);
  
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
      total: diffTree.length
    };
    return result;
  }, [diffTree]);

  // Hilfsfunktion: Finde ein Code-Element anhand seines Codes
  const findCodeElement = (code) => {
    const found = diffTree.find(item => item.code === code);
    return found ? found.code : null;
  };
  
  // Springe zu einem Code in der Ansicht (z.B. bei Umsteiger-Codes)
  const jumpToCode = (code) => {
    const targetCode = findCodeElement(code);
    if (targetCode) {
      setSelectedCode(targetCode);
      
      // Expandiere alle notwendigen Nodes (hierarchisch durch Kapitel/Gruppen)
      // In diesem Fall nur den Code selbst
      setExpandedNodes(prev => ({
        ...prev,
        [`code-${targetCode}`]: true
      }));
      
      // Scrolle zur Position
      const element = document.getElementById(`code-${targetCode}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  // Generiere Baumstruktur basierend auf Katalogtyp
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

    // Kapitel-Titel basierend auf dem Katalogtyp
    const getKapitelTitle = (key) => {
      if (isICD) {
        // ICD Kapitel-Konvention
        return `Kapitel ${key}`;
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
      const kapitel = extractKapitel(item.code);
      const group = extractGroup(item.code);
      
      if (!kapitel) return;

      // Kapitel erstellen falls noch nicht vorhanden
      if (!kapitelMap[kapitel]) {
        kapitelMap[kapitel] = {
          id: `kapitel-${kapitel}`,
          title: getKapitelTitle(kapitel),
          children: {},
          stats: { 
            added: { total: 0, new: 0, replacement: 0 },
            removed: { total: 0, deprecated: 0, redirected: 0 },
            changed: 0, 
            total: 0 
          }
        };
      }
      
      // Gruppe erstellen falls noch nicht vorhanden
      if (!groupMap[group]) {
        groupMap[group] = {
          id: `group-${group}`,
          title: `Gruppe ${group}`,
          children: [],
          stats: { 
            added: { total: 0, new: 0, replacement: 0 },
            removed: { total: 0, deprecated: 0, redirected: 0 },
            changed: 0, 
            total: 0 
          }
        };
        
        // Gruppe zum Kapitel hinzufügen
        kapitelMap[kapitel].children[group] = groupMap[group];
      }
      
      // Code zur Gruppe hinzufügen
      groupMap[group].children.push(item);
      
      // Statistiken aktualisieren
      if (item.status === 'added') {
        groupMap[group].stats.added.total++;
        kapitelMap[kapitel].stats.added.total++;
        
        if (item.subStatus === 'new') {
          groupMap[group].stats.added.new++;
          kapitelMap[kapitel].stats.added.new++;
        } else if (item.subStatus === 'replacement') {
          groupMap[group].stats.added.replacement++;
          kapitelMap[kapitel].stats.added.replacement++;
        }
      }
      else if (item.status === 'removed') {
        groupMap[group].stats.removed.total++;
        kapitelMap[kapitel].stats.removed.total++;
        
        if (item.subStatus === 'deprecated') {
          groupMap[group].stats.removed.deprecated++;
          kapitelMap[kapitel].stats.removed.deprecated++;
        } else if (item.subStatus === 'redirected') {
          groupMap[group].stats.removed.redirected++;
          kapitelMap[kapitel].stats.removed.redirected++;
        }
      }
      else if (item.status === 'changed') {
        groupMap[group].stats.changed++;
        kapitelMap[kapitel].stats.changed++;
      }
      
      groupMap[group].stats.total++;
      kapitelMap[kapitel].stats.total++;
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
      return a.title.localeCompare(b.title);
    });
  }, [diffsOnly, catalogType, selectedCode]);

  // Node expandieren/kollabieren
  const toggleNode = (nodeId) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

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
  const renderStatusBadges = (stats) => (
    <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
      {stats.added.total > 0 && (
        <Badge badgeContent={stats.added.total} sx={{ '& .MuiBadge-badge': { fontSize: '0.7rem', bgcolor: '#7D9692', color: 'white' } }}>
          <Chip size="small" label={STATUS_LABELS.added} sx={{ color: '#7D9692', borderColor: '#7D9692' }} variant="outlined" />
        </Badge>
      )}
      {stats.removed.total > 0 && (
        <Badge badgeContent={stats.removed.total} sx={{ '& .MuiBadge-badge': { fontSize: '0.7rem', bgcolor: '#C1666B', color: 'white' } }}>
          <Chip size="small" label={STATUS_LABELS.removed} sx={{ color: '#C1666B', borderColor: '#C1666B' }} variant="outlined" />
        </Badge>
      )}
      {stats.changed > 0 && (
        <Badge badgeContent={stats.changed} sx={{ '& .MuiBadge-badge': { fontSize: '0.7rem', bgcolor: '#E3B23C', color: 'white' } }}>
          <Chip size="small" label={STATUS_LABELS.changed} sx={{ color: '#E3B23C', borderColor: '#E3B23C' }} variant="outlined" />
        </Badge>
      )}
    </Box>
  );

  // Render der Diff-Details für einen Code
  const renderDiffDetails = (item) => {
    if (item.status !== 'changed' || !item.diffDetails || !areConsecutiveYears) return null;
    
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
    if (!item.migrationTarget && !item.migrationSource) return null;
    
    return (
      <Box sx={{ pl: 4, pt: 1, mb: 2 }}>
        {item.migrationTarget && (
          <Box sx={{ mb: 1 }}>
            <Typography variant="subtitle2" gutterBottom>Umsteiger-Information:</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <ArrowForwardIcon fontSize="small" color="primary" sx={{ mr: 1 }} />
              <Typography variant="body2">
                Dieser Code wurde ersetzt durch: 
                <Button 
                  variant="text" 
                  size="small" 
                  sx={{ ml: 1, textTransform: 'none' }}
                  onClick={() => jumpToCode(item.migrationTarget)}
                >
                  {item.migrationTarget}
                </Button>
              </Typography>
            </Box>
          </Box>
        )}
        
        {item.migrationSource && Array.isArray(item.migrationSource) && item.migrationSource.length > 0 && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>Umsteiger-Information:</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <ArrowBackIcon fontSize="small" color="primary" sx={{ mr: 1 }} />
              <Typography variant="body2">
                Dieser Code ersetzt:
                <Box component="span">
                  {item.migrationSource.map((source, index) => (
                    <Button 
                      key={source}
                      variant="text" 
                      size="small" 
                      sx={{ ml: 1, textTransform: 'none' }}
                      onClick={() => jumpToCode(source)}
                    >
                      {source}{index < item.migrationSource.length - 1 ? ',' : ''}
                    </Button>
                  ))}
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

  // Render eines Codes
  const renderCode = (item) => (
    <Accordion 
      key={item.code}
      expanded={!!expandedNodes[`code-${item.code}`] || selectedCode === item.code}
      onChange={() => toggleNode(`code-${item.code}`)}
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

  // Render einer Gruppe
  const renderGroup = (group) => (
    <Accordion 
      key={group.id}
      expanded={!!expandedNodes[group.id]}
      onChange={() => toggleNode(group.id)}
      sx={{ 
        ml: 2, 
        mb: 0.5,
        '&:before': { display: 'none' },
        boxShadow: 'none',
        border: '1px solid rgba(0, 0, 0, 0.12)'
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          {expandedNodes[group.id] ? 
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
        {group.children
          .sort((a, b) => a.code.localeCompare(b.code))
          .map(renderCode)}
      </AccordionDetails>
    </Accordion>
  );

  // Render eines Kapitels
  const renderKapitel = (kapitel) => (
    <Accordion 
      key={kapitel.id}
      expanded={!!expandedNodes[kapitel.id]}
      onChange={() => toggleNode(kapitel.id)}
      sx={{ mb: 1 }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          {expandedNodes[kapitel.id] ? 
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
        {Object.values(kapitel.children)
          .sort((a, b) => {
            // Sortieren je nach Katalogtyp
            if (catalogType === 'icd') {
              return a.title.localeCompare(b.title);
            } else {
              // Für OPS: Numerische Sortierung wenn möglich
              const numA = a.title.match(/\d+/)?.[0] || '0';
              const numB = b.title.match(/\d+/)?.[0] || '0';
              return parseInt(numA) - parseInt(numB);
            }
          })
          .map(renderGroup)}
      </AccordionDetails>
    </Accordion>
  );

  // Render der Statistik
  const renderStats = () => (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Diff-Statistik
      </Typography>
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
          {catalogType.toUpperCase()} Diff-Ergebnisse
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Insgesamt {stats.total} Codes verglichen, davon {stats.added.total + stats.removed.total + stats.changed} mit Unterschieden
        </Typography>
      </Box>
      
      {renderStats()}
      
      {diffsOnly.length === 0 ? (
        <Typography variant="body1" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
          Keine Unterschiede gefunden
        </Typography>
      ) : (
        <Box>
          {treeData.map(renderKapitel)}
        </Box>
      )}
    </Paper>
  );
} 