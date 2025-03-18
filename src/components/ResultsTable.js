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
        
        <FormControlLabel
          control={
            <Switch
              checked={showMore.dreisteller}
              onChange={() => toggleShowMore('dreisteller')}
            />
          }
          label="Dreisteller anzeigen (nur OPS)"
        />
        
        <FormControlLabel
          control={
            <Switch
              checked={showMore.childCodes}
              onChange={() => toggleShowMore('childCodes')}
            />
          }
          label="Subcodes anzeigen"
        />
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