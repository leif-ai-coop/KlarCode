import React, { useState, useMemo, useEffect } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
  Box,
  Button,
  Chip,
  FormControlLabel,
  Switch,
  Alert,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Collapse
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { exportToCSV, exportToExcel } from '../utils/export';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import InfoIcon from '@mui/icons-material/Info';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

/**
 * Component to display search results in a sortable table
 */
const ResultsTable = ({ 
  results, 
  duplicatesRemoved, 
  removedDuplicates,
  showMore, 
  toggleShowMore,
  searchType,
  onCopyCode
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [orderBy, setOrderBy] = useState('kode');
  const [order, setOrder] = useState('asc');
  const [filter, setFilter] = useState('');
  const [expandedCodes, setExpandedCodes] = useState({});
  const [openDuplicatesDialog, setOpenDuplicatesDialog] = useState(false);
  const [showDuplicatesCollapse, setShowDuplicatesCollapse] = useState(false);
  
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };
  
  const sortedResults = useMemo(() => {
    const filtered = filter
      ? results.filter(result => 
          result.kode.toLowerCase().includes(filter.toLowerCase()) ||
          result.beschreibung.toLowerCase().includes(filter.toLowerCase())
        )
      : results;
    
    return [...filtered].sort((a, b) => {
      const aValue = a[orderBy] || '';
      const bValue = b[orderBy] || '';
      
      if (order === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });
  }, [results, order, orderBy, filter]);
  
  const handleFilterChange = (e) => {
    setFilter(e.target.value);
  };
  
  const handleCopyToClipboard = () => {
    const headers = getExportHeaders();
    const text = sortedResults.map(row => {
      return headers.map(h => row[h.key] || '').join('\t');
    }).join('\n');
    
    navigator.clipboard.writeText(text)
      .then(() => {
        alert('Ergebnisse wurden in die Zwischenablage kopiert!');
      })
      .catch(err => {
        console.error('Fehler beim Kopieren:', err);
        alert('Fehler beim Kopieren in die Zwischenablage.');
      });
  };
  
  const getExportHeaders = () => {
    const headers = [
      { key: 'kode', label: 'Kode' },
      { key: 'beschreibung', label: 'Beschreibung' }
    ];
    
    if (showMore.gruppe) {
      headers.push({ key: 'gruppe', label: 'Gruppe' });
    }
    
    if (showMore.kapitel) {
      headers.push({ key: 'kapitel', label: 'Kapitel' });
    }
    
    if (showMore.dreisteller) {
      headers.push({ key: 'dreisteller', label: 'Dreisteller' });
    }
    
    // Neue Felder für den Export
    if (showMore.terminalCode && searchType === 'ops') {
      headers.push({ key: 'terminalCode', label: 'Terminale Schlüsselnummer' });
    }
    
    if (showMore.sideRequired && searchType === 'ops') {
      headers.push({ key: 'sideRequired', label: 'Seitenangabe erforderlich' });
    }
    
    if (showMore.validityKHG && searchType === 'ops') {
      headers.push({ key: 'validityKHG', label: 'Gültigkeit § 17 KHG' });
    }
    
    if (showMore.isAdditionalCode && searchType === 'ops') {
      headers.push({ key: 'isAdditionalCode', label: 'Zusatzkode' });
    }
    
    if (showMore.isOneTimeCode && searchType === 'ops') {
      headers.push({ key: 'isOneTimeCode', label: 'Einmalkode' });
    }
    
    // ICD-spezifische Felder
    if (showMore.usage295 && searchType === 'icd') {
      headers.push({ key: 'usage295', label: 'Verwendung §295' });
    }
    
    if (showMore.usage301 && searchType === 'icd') {
      headers.push({ key: 'usage301', label: 'Verwendung §301' });
    }
    
    if (showMore.genderRestriction && searchType === 'icd') {
      headers.push({ key: 'genderRestriction', label: 'Geschlechtsbezug' });
    }
    
    if (showMore.ageRestrictions && searchType === 'icd') {
      headers.push({ key: 'minAge', label: 'Untere Altersgrenze' });
      headers.push({ key: 'maxAge', label: 'Obere Altersgrenze' });
    }
    
    if (showMore.ageError && searchType === 'icd') {
      headers.push({ key: 'ageError', label: 'Fehlerart bei Altersbezug' });
    }
    
    if (showMore.ifsgInfo && searchType === 'icd') {
      headers.push({ key: 'ifsgReporting', label: 'IfSG-Meldung' });
      headers.push({ key: 'ifsgLab', label: 'IfSG-Labor' });
    }
    
    return headers;
  };
  
  const handleExportCSV = () => {
    exportToCSV(
      sortedResults,
      getExportHeaders(),
      `medizinische-codes-export-${new Date().toISOString().slice(0, 10)}.csv`
    );
  };
  
  const handleExportExcel = () => {
    exportToExcel(
      sortedResults,
      getExportHeaders(),
      `medizinische-codes-export-${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };
  
  useEffect(() => {
    if (results.length > 0) {
      const parentCodes = results
        .filter(row => row.isParent)
        .reduce((acc, row) => {
          acc[row.kode] = true;
          return acc;
        }, {});
      setExpandedCodes(parentCodes);
    }
  }, [results]);
  
  useEffect(() => {
    console.log("Current expanded codes:", expandedCodes);
    console.log("Showing child codes:", showMore.childCodes);
    
    // Log information about each row that should be clickable
    sortedResults.forEach(row => {
      if (row.isParent || row.hasChildCodes) {
        console.log(`Parent code ${row.kode}:`, {
          isParent: row.isParent,
          hasChildCodes: row.hasChildCodes,
          isDirectInput: row.isDirectInput
        });
      }
    });
  }, [expandedCodes, showMore.childCodes, sortedResults]);
  
  const toggleExpand = (code) => {
    setExpandedCodes(prev => ({
      ...prev,
      [code]: !prev[code]
    }));
  };
  
  const visibleResults = useMemo(() => {
    return sortedResults.filter(row => {
      // Always show directly entered codes and parent codes
      if (row.isDirectInput || row.isParent) return true;
      
      // For child codes, only show if parent is expanded and showMore.childCodes is true
      if (row.parentCode) {
        // Log for debugging
        console.log(`Checking visibility for child ${row.kode} of parent ${row.parentCode}:`, {
          showMoreChildCodes: showMore.childCodes,
          parentExpanded: expandedCodes[row.parentCode]
        });
        
        return showMore.childCodes && expandedCodes[row.parentCode];
      }
      
      return true;
    });
  }, [sortedResults, expandedCodes, showMore.childCodes]);
  
  const getTooltipText = (row) => {
    if (row.isExpandedChild) {
      return "Automatisch ergänzter Subcode";
    } else if (row.isParent && row.hasChildCodes && showMore.childCodes) {
      return expandedCodes[row.kode] ? 
        "Klicken um Subcodes auszublenden" : 
        "Klicken um Subcodes einzublenden";
    } else if (row.isDirectInput) {
      return "Direkt eingegebener Code";
    }
    return "";
  };
  
  const DuplicatesDisplay = () => {
    if (!removedDuplicates || removedDuplicates.length === 0) {
      return <Typography variant="body2">Keine Duplikate gefunden.</Typography>;
    }
    
    return (
      <List dense>
        {removedDuplicates.map((item, index) => (
          <ListItem key={index} divider>
            <ListItemText
              primary={
                <>
                  <Chip 
                    label={item.originalCode} 
                    color="primary" 
                    size="small" 
                    sx={{ mr: 1 }}
                  />
                  <Typography variant="body2" component="span">
                    wurde beibehalten
                  </Typography>
                </>
              }
              secondary={
                <>
                  <Typography variant="body2" component="span" color="text.secondary">
                    Entfernte Duplikate: 
                  </Typography>
                  {item.duplicates.map((dupe, i) => (
                    <Chip 
                      key={i} 
                      label={dupe} 
                      color="default" 
                      size="small" 
                      variant="outlined"
                      sx={{ ml: 1, mt: 0.5 }}
                    />
                  ))}
                </>
              }
            />
          </ListItem>
        ))}
      </List>
    );
  };
  
  if (!results.length) {
    return null;
  }
  
  return (
    <Paper 
      elevation={3} 
      sx={{ 
        p: 3, 
        borderRadius: 2,
        backgroundColor: theme => theme.palette.mode === 'dark' ? 'rgba(66, 66, 66, 0.9)' : 'white'
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h6">
          Suchergebnisse ({sortedResults.length})
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Tooltip title="In die Zwischenablage kopieren">
            <Button
              variant="outlined"
              startIcon={<ContentCopyIcon />}
              onClick={handleCopyToClipboard}
              size={isMobile ? 'small' : 'medium'}
            >
              {isMobile ? '' : 'Kopieren'}
            </Button>
          </Tooltip>
          
          <Tooltip title="Als CSV exportieren">
            <Button
              variant="outlined"
              startIcon={<FileDownloadIcon />}
              onClick={handleExportCSV}
              size={isMobile ? 'small' : 'medium'}
            >
              {isMobile ? 'CSV' : 'CSV Export'}
            </Button>
          </Tooltip>
          
          <Tooltip title="Als Excel exportieren">
            <Button
              variant="outlined"
              startIcon={<FileDownloadIcon />}
              onClick={handleExportExcel}
              size={isMobile ? 'small' : 'medium'}
            >
              {isMobile ? 'Excel' : 'Excel Export'}
            </Button>
          </Tooltip>
        </Box>
      </Box>
      
      {duplicatesRemoved > 0 && (
        <>
          <Alert 
            severity="info" 
            sx={{ mb: showDuplicatesCollapse ? 0 : 2 }}
            action={
              <IconButton
                aria-label="show duplicates"
                color="inherit"
                size="small"
                onClick={() => setShowDuplicatesCollapse(!showDuplicatesCollapse)}
              >
                {showDuplicatesCollapse ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
              </IconButton>
            }
          >
            {duplicatesRemoved} {duplicatesRemoved === 1 ? 'Code wurde' : 'Codes wurden'} als {duplicatesRemoved === 1 ? 'Duplikat' : 'Duplikate'}  entfernt
          </Alert>
          
          <Collapse in={showDuplicatesCollapse} timeout="auto" unmountOnExit>
            <Paper
              sx={{
                p: 2,
                mb: 2,
                backgroundColor: theme => theme.palette.mode === 'dark' ? 'rgba(50, 50, 50, 0.9)' : 'rgba(230, 230, 230, 0.9)'
              }}
            >
              <Typography variant="subtitle2" gutterBottom>
                Details zu entfernten Duplikaten:
              </Typography>
              <DuplicatesDisplay />
            </Paper>
          </Collapse>
        </>
      )}
      
      <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={showMore.kapitel}
              onChange={() => toggleShowMore('kapitel')}
            />
          }
          label="Kapitel anzeigen"
        />
        
        <FormControlLabel
          control={
            <Switch
              checked={showMore.gruppe}
              onChange={() => toggleShowMore('gruppe')}
            />
          }
          label="Gruppe anzeigen"
        />
        
        {/* Dreisteller-Toggle nur bei OPS-Suchen anzeigen */}
        {searchType === 'ops' && (
          <FormControlLabel
            control={
              <Switch
                checked={showMore.dreisteller}
                onChange={() => toggleShowMore('dreisteller')}
              />
            }
            label="Dreisteller anzeigen"
          />
        )}
        
        <FormControlLabel
          control={
            <Switch
              checked={showMore.childCodes}
              onChange={() => toggleShowMore('childCodes')}
            />
          }
          label="Subcodes anzeigen"
        />
        
        {/* Neue Optionen */}
        {searchType === 'ops' && (
          <>
            <FormControlLabel
              control={
                <Switch
                  checked={showMore.terminalCode}
                  onChange={() => toggleShowMore('terminalCode')}
                />
              }
              label="Terminale Schlüsselnummer"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={showMore.sideRequired}
                  onChange={() => toggleShowMore('sideRequired')}
                />
              }
              label="Seitenangabe erforderlich"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={showMore.validityKHG}
                  onChange={() => toggleShowMore('validityKHG')}
                />
              }
              label="Gültigkeit § 17 KHG"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={showMore.isAdditionalCode}
                  onChange={() => toggleShowMore('isAdditionalCode')}
                />
              }
              label="Zusatzkode"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={showMore.isOneTimeCode}
                  onChange={() => toggleShowMore('isOneTimeCode')}
                />
              }
              label="Einmalkode"
            />
          </>
        )}
        
        {/* ICD-spezifische Optionen */}
        {searchType === 'icd' && (
          <>
            <FormControlLabel
              control={
                <Switch
                  checked={showMore.usage295}
                  onChange={() => toggleShowMore('usage295')}
                />
              }
              label="Verwendung §295"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={showMore.usage301}
                  onChange={() => toggleShowMore('usage301')}
                />
              }
              label="Verwendung §301"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={showMore.genderRestriction}
                  onChange={() => toggleShowMore('genderRestriction')}
                />
              }
              label="Geschlechtsbezug"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={showMore.ageRestrictions}
                  onChange={() => toggleShowMore('ageRestrictions')}
                />
              }
              label="Altersgrenzen"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={showMore.ageError}
                  onChange={() => toggleShowMore('ageError')}
                />
              }
              label="Fehlerart bei Altersbezug"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={showMore.ifsgInfo}
                  onChange={() => toggleShowMore('ifsgInfo')}
                />
              }
              label="IfSG Informationen"
            />
          </>
        )}
      </Box>
      
      {showMore.childCodes && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Klicken Sie auf einen Code, um dessen Subcodes ein- oder auszublenden.
        </Alert>
      )}
      
      {showMore.childCodes && (
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, mb: 2, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Chip 
              color="primary" 
              variant="filled" 
              size="small" 
              sx={{ mr: 1 }} 
              label="Direkt eingegebener Code" 
            />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Chip 
              color="info" 
              variant="outlined" 
              size="small" 
              sx={{ mr: 1 }} 
              label="Automatisch ergänzter Subcode" 
            />
          </Box>
        </Box>
      )}
      
      <TableContainer sx={{ maxHeight: '60vh', overflowX: 'auto' }}>
        <Table stickyHeader aria-label="Ergebnistabelle" size={isMobile ? 'small' : 'medium'}>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'kode'}
                  direction={orderBy === 'kode' ? order : 'asc'}
                  onClick={() => handleRequestSort('kode')}
                >
                  Kode
                </TableSortLabel>
              </TableCell>
              
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'beschreibung'}
                  direction={orderBy === 'beschreibung' ? order : 'asc'}
                  onClick={() => handleRequestSort('beschreibung')}
                >
                  Beschreibung
                </TableSortLabel>
              </TableCell>
              
              {showMore.gruppe && (
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'gruppe'}
                    direction={orderBy === 'gruppe' ? order : 'asc'}
                    onClick={() => handleRequestSort('gruppe')}
                  >
                    Gruppe
                  </TableSortLabel>
                </TableCell>
              )}
              
              {showMore.kapitel && (
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'kapitel'}
                    direction={orderBy === 'kapitel' ? order : 'asc'}
                    onClick={() => handleRequestSort('kapitel')}
                  >
                    Kapitel
                  </TableSortLabel>
                </TableCell>
              )}
              
              {showMore.dreisteller && (
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'dreisteller'}
                    direction={orderBy === 'dreisteller' ? order : 'asc'}
                    onClick={() => handleRequestSort('dreisteller')}
                  >
                    Dreisteller
                  </TableSortLabel>
                </TableCell>
              )}
              
              {/* Neue Spalten */}
              {showMore.terminalCode && searchType === 'ops' && (
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'terminalCode'}
                    direction={orderBy === 'terminalCode' ? order : 'asc'}
                    onClick={() => handleRequestSort('terminalCode')}
                  >
                    Terminale Schlüsselnummer
                  </TableSortLabel>
                </TableCell>
              )}
              
              {showMore.sideRequired && searchType === 'ops' && (
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'sideRequired'}
                    direction={orderBy === 'sideRequired' ? order : 'asc'}
                    onClick={() => handleRequestSort('sideRequired')}
                  >
                    Seitenangabe erforderlich
                  </TableSortLabel>
                </TableCell>
              )}
              
              {showMore.validityKHG && searchType === 'ops' && (
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'validityKHG'}
                    direction={orderBy === 'validityKHG' ? order : 'asc'}
                    onClick={() => handleRequestSort('validityKHG')}
                  >
                    Gültigkeit § 17 KHG
                  </TableSortLabel>
                </TableCell>
              )}
              
              {showMore.isAdditionalCode && searchType === 'ops' && (
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'isAdditionalCode'}
                    direction={orderBy === 'isAdditionalCode' ? order : 'asc'}
                    onClick={() => handleRequestSort('isAdditionalCode')}
                  >
                    Zusatzkode
                  </TableSortLabel>
                </TableCell>
              )}
              
              {showMore.isOneTimeCode && searchType === 'ops' && (
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'isOneTimeCode'}
                    direction={orderBy === 'isOneTimeCode' ? order : 'asc'}
                    onClick={() => handleRequestSort('isOneTimeCode')}
                  >
                    Einmalkode
                  </TableSortLabel>
                </TableCell>
              )}
              
              {/* ICD-spezifische Spalten */}
              {showMore.usage295 && searchType === 'icd' && (
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'usage295'}
                    direction={orderBy === 'usage295' ? order : 'asc'}
                    onClick={() => handleRequestSort('usage295')}
                  >
                    Verwendung §295
                  </TableSortLabel>
                </TableCell>
              )}
              
              {showMore.usage301 && searchType === 'icd' && (
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'usage301'}
                    direction={orderBy === 'usage301' ? order : 'asc'}
                    onClick={() => handleRequestSort('usage301')}
                  >
                    Verwendung §301
                  </TableSortLabel>
                </TableCell>
              )}
              
              {showMore.genderRestriction && searchType === 'icd' && (
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'genderRestriction'}
                    direction={orderBy === 'genderRestriction' ? order : 'asc'}
                    onClick={() => handleRequestSort('genderRestriction')}
                  >
                    Geschlechtsbezug
                  </TableSortLabel>
                </TableCell>
              )}
              
              {showMore.ageRestrictions && searchType === 'icd' && (
                <>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'minAge'}
                      direction={orderBy === 'minAge' ? order : 'asc'}
                      onClick={() => handleRequestSort('minAge')}
                    >
                      Untere Altersgrenze
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'maxAge'}
                      direction={orderBy === 'maxAge' ? order : 'asc'}
                      onClick={() => handleRequestSort('maxAge')}
                    >
                      Obere Altersgrenze
                    </TableSortLabel>
                  </TableCell>
                </>
              )}
              
              {showMore.ageError && searchType === 'icd' && (
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'ageError'}
                    direction={orderBy === 'ageError' ? order : 'asc'}
                    onClick={() => handleRequestSort('ageError')}
                  >
                    Fehlerart bei Altersbezug
                  </TableSortLabel>
                </TableCell>
              )}
              
              {showMore.ifsgInfo && searchType === 'icd' && (
                <>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'ifsgReporting'}
                      direction={orderBy === 'ifsgReporting' ? order : 'asc'}
                      onClick={() => handleRequestSort('ifsgReporting')}
                    >
                      IfSG-Meldung
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'ifsgLab'}
                      direction={orderBy === 'ifsgLab' ? order : 'asc'}
                      onClick={() => handleRequestSort('ifsgLab')}
                    >
                      IfSG-Labor
                    </TableSortLabel>
                  </TableCell>
                </>
              )}
              
              <TableCell align="right">
                <Tooltip title="Kopieren">
                  <span>Aktionen</span>
                </Tooltip>
              </TableCell>
            </TableRow>
          </TableHead>
          
          <TableBody>
            {visibleResults.map((row, index) => (
              <TableRow 
                key={`${row.kode}-${index}`}
                hover
                sx={{ 
                  '&:last-child td, &:last-child th': { border: 0 },
                  backgroundColor: row.isExpandedChild ? 'rgba(0, 0, 255, 0.05)' : 'inherit'
                }}
              >
                <TableCell component="th" scope="row">
                  <Tooltip 
                    title={getTooltipText(row)}
                    placement="top"
                  >
                    <Chip 
                      label={row.kode} 
                      color={row.isExpandedChild ? 'info' : 'primary'}
                      variant={row.isDirectInput ? "filled" : "outlined"}
                      size="small"
                      onClick={(e) => {
                        if (showMore.childCodes && row.isParent && !row.isExpandedChild) {
                          e.stopPropagation();
                          toggleExpand(row.kode);
                        }
                      }}
                      sx={{
                        cursor: (showMore.childCodes && row.isParent && !row.isExpandedChild) 
                                ? 'pointer' : 'default',
                        '&:hover': {
                          boxShadow: (showMore.childCodes && row.isParent && !row.isExpandedChild) 
                                     ? 1 : 0
                        }
                      }}
                    />
                  </Tooltip>
                </TableCell>
                
                <TableCell>{row.beschreibung}</TableCell>
                
                {showMore.gruppe && (
                  <TableCell>{row.gruppe || '-'}</TableCell>
                )}
                
                {showMore.kapitel && (
                  <TableCell>{row.kapitel || '-'}</TableCell>
                )}
                
                {showMore.dreisteller && (
                  <TableCell>{row.dreisteller || '-'}</TableCell>
                )}
                
                {showMore.terminalCode && searchType === 'ops' && (
                  <TableCell>{row.terminalCode || '-'}</TableCell>
                )}
                
                {showMore.sideRequired && searchType === 'ops' && (
                  <TableCell>{row.sideRequired || '-'}</TableCell>
                )}
                
                {showMore.validityKHG && searchType === 'ops' && (
                  <TableCell>{row.validityKHG || '-'}</TableCell>
                )}
                
                {showMore.isAdditionalCode && searchType === 'ops' && (
                  <TableCell>{row.isAdditionalCode || '-'}</TableCell>
                )}
                
                {showMore.isOneTimeCode && searchType === 'ops' && (
                  <TableCell>{row.isOneTimeCode || '-'}</TableCell>
                )}
                
                {/* ICD-spezifische Zellen */}
                {showMore.usage295 && searchType === 'icd' && (
                  <TableCell>{row.usage295 || '-'}</TableCell>
                )}
                
                {showMore.usage301 && searchType === 'icd' && (
                  <TableCell>{row.usage301 || '-'}</TableCell>
                )}
                
                {showMore.genderRestriction && searchType === 'icd' && (
                  <TableCell>{row.genderRestriction || '-'}</TableCell>
                )}
                
                {showMore.ageRestrictions && searchType === 'icd' && (
                  <>
                    <TableCell>{row.minAge || '-'}</TableCell>
                    <TableCell>{row.maxAge || '-'}</TableCell>
                  </>
                )}
                
                {showMore.ageError && searchType === 'icd' && (
                  <TableCell>{row.ageError || '-'}</TableCell>
                )}
                
                {showMore.ifsgInfo && searchType === 'icd' && (
                  <>
                    <TableCell>{row.ifsgReporting || '-'}</TableCell>
                    <TableCell>{row.ifsgLab || '-'}</TableCell>
                  </>
                )}
                
                <TableCell align="right">
                  <Tooltip title="In die Zwischenablage kopieren">
                    <IconButton 
                      size="small"
                      onClick={() => {
                        const text = `${row.kode}: ${row.beschreibung}`;
                        navigator.clipboard.writeText(text);
                      }}
                    >
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      <Dialog open={openDuplicatesDialog} onClose={() => setOpenDuplicatesDialog(false)}>
        <DialogTitle>
          Entfernte Duplikate
        </DialogTitle>
        <DialogContent>
          <DuplicatesDisplay />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDuplicatesDialog(false)}>
            Schließen
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default ResultsTable; 