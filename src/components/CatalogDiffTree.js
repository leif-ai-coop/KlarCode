import React, { useState, useMemo } from 'react';
import { Box, Typography, Paper, Accordion, AccordionSummary, AccordionDetails, Chip, List, ListItem, ListItemText, Badge } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import ChangeCircleIcon from '@mui/icons-material/ChangeCircle';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import ArticleIcon from '@mui/icons-material/Article';

export default function CatalogDiffTree({ diffTree }) {
  // Expandierte Nodes verwalten
  const [expandedNodes, setExpandedNodes] = useState({});
  
  // Katalog-Typ aus dem ersten Diff-Element bestimmen
  const catalogType = useMemo(() => {
    if (!diffTree || diffTree.length === 0) return 'icd';
    return diffTree[0]?.type || 'icd';
  }, [diffTree]);

  // Filtere nur die Einträge mit Status != 'unchanged'
  const diffsOnly = useMemo(() => diffTree.filter(item => item.status !== 'unchanged'), [diffTree]);
  
  // Zähle die verschiedenen Diff-Typen für die Statistik
  const stats = useMemo(() => ({
    added: diffTree.filter(d => d.status === 'added').length,
    removed: diffTree.filter(d => d.status === 'removed').length,
    changed: diffTree.filter(d => d.status === 'changed').length,
    total: diffTree.length
  }), [diffTree]);

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
          stats: { added: 0, removed: 0, changed: 0, total: 0 }
        };
      }
      
      // Gruppe erstellen falls noch nicht vorhanden
      if (!groupMap[group]) {
        groupMap[group] = {
          id: `group-${group}`,
          title: `Gruppe ${group}`,
          children: [],
          stats: { added: 0, removed: 0, changed: 0, total: 0 }
        };
        
        // Gruppe zum Kapitel hinzufügen
        kapitelMap[kapitel].children[group] = groupMap[group];
      }
      
      // Code zur Gruppe hinzufügen
      groupMap[group].children.push(item);
      
      // Statistiken aktualisieren
      groupMap[group].stats[item.status]++;
      groupMap[group].stats.total++;
      kapitelMap[kapitel].stats[item.status]++;
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
  }, [diffsOnly, catalogType]);

  // Node expandieren/kollabieren
  const toggleNode = (nodeId) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  // Status-Zusammenfassung als Badges darstellen
  const renderStatusBadges = (stats) => (
    <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
      {stats.added > 0 && (
        <Badge badgeContent={stats.added} color="success" max={999} sx={{ '& .MuiBadge-badge': { fontSize: '0.7rem' } }}>
          <Chip size="small" label="Hinzugefügt" color="success" variant="outlined" />
        </Badge>
      )}
      {stats.removed > 0 && (
        <Badge badgeContent={stats.removed} color="error" max={999} sx={{ '& .MuiBadge-badge': { fontSize: '0.7rem' } }}>
          <Chip size="small" label="Entfernt" color="error" variant="outlined" />
        </Badge>
      )}
      {stats.changed > 0 && (
        <Badge badgeContent={stats.changed} color="warning" max={999} sx={{ '& .MuiBadge-badge': { fontSize: '0.7rem' } }}>
          <Chip size="small" label="Geändert" color="warning" variant="outlined" />
        </Badge>
      )}
    </Box>
  );

  // Stil für die verschiedenen Status
  const getStatusStyle = (status) => {
    switch (status) {
      case 'added': return { color: 'success.main', fontWeight: 'bold' };
      case 'removed': return { color: 'error.main', fontWeight: 'bold' };
      case 'changed': return { color: 'warning.main', fontWeight: 'bold' };
      default: return {};
    }
  };

  // Status-Icon für Codes
  const getStatusIcon = (status) => {
    switch (status) {
      case 'added': return <AddIcon fontSize="small" color="success" />;
      case 'removed': return <RemoveIcon fontSize="small" color="error" />;
      case 'changed': return <ChangeCircleIcon fontSize="small" color="warning" />;
      default: return null;
    }
  };

  // Render der Diff-Details für einen Code
  const renderDiffDetails = (item) => {
    if (item.status !== 'changed' || !item.diff) return null;
    
    return (
      <Box sx={{ pl: 4, pt: 1 }}>
        <Typography variant="subtitle2" gutterBottom>Feldänderungen:</Typography>
        <List dense>
          {Object.entries(item.diff).map(([field, values]) => (
            <ListItem key={field}>
              <ListItemText
                primary={field}
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

  // Beschreibung für einen Code je nach Katalogtyp
  const getCodeDescription = (item) => {
    const isICD = catalogType === 'icd';
    
    if (isICD) {
      return item.new?.beschreibung || item.old?.beschreibung || '';
    } else {
      // OPS verwendet oft 'titel' statt 'beschreibung'
      return item.new?.titel || item.old?.titel || 
             item.new?.beschreibung || item.old?.beschreibung || '';
    }
  };

  // Render eines Codes
  const renderCode = (item) => (
    <Accordion 
      key={item.code}
      expanded={!!expandedNodes[`code-${item.code}`]}
      onChange={() => toggleNode(`code-${item.code}`)}
      sx={{ 
        ...getStatusStyle(item.status), 
        ml: 4, 
        mb: 0.5,
        '&:before': { display: 'none' },
        boxShadow: 'none',
        border: '1px solid rgba(0, 0, 0, 0.12)'
      }}
    >
      <AccordionSummary 
        expandIcon={<ExpandMoreIcon />}
        sx={{ minHeight: 'unset', '& .MuiAccordionSummary-content': { margin: '8px 0' } }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <ArticleIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
          <Typography sx={{ flexGrow: 1 }}>
            {item.code}
            {getCodeDescription(item) && 
              <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                — {getCodeDescription(item)}
              </Typography>
            }
          </Typography>
          <Chip 
            label={item.status} 
            size="small" 
            color={
              item.status === 'added' ? 'success' :
              item.status === 'removed' ? 'error' : 'warning'
            } 
            sx={{ ml: 1 }}
          />
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ p: 1 }}>
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
              ({group.stats.total} {group.stats.total === 1 ? 'Code' : 'Codes'})
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
              ({kapitel.stats.total} {kapitel.stats.total === 1 ? 'Code' : 'Codes'})
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

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          {catalogType.toUpperCase()} Diff-Ergebnisse
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Insgesamt {stats.total} Codes verglichen, davon {stats.added + stats.removed + stats.changed} mit Unterschieden:
          {' '}<Chip size="small" label={`${stats.added} hinzugefügt`} color="success" sx={{ mr: 1 }} />
          {' '}<Chip size="small" label={`${stats.removed} entfernt`} color="error" sx={{ mr: 1 }} />
          {' '}<Chip size="small" label={`${stats.changed} geändert`} color="warning" />
        </Typography>
      </Box>
      
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