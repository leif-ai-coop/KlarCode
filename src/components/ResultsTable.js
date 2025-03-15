import React, { useState, useMemo } from 'react';
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
  useMediaQuery
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { exportToCSV, exportToExcel } from '../utils/export';

/**
 * Component to display search results in a sortable table
 */
const ResultsTable = ({ 
  results, 
  duplicatesRemoved, 
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
        <Alert severity="info" sx={{ mb: 2 }}>
          {duplicatesRemoved} Duplikat{duplicatesRemoved !== 1 ? 'e' : ''} wurde{duplicatesRemoved !== 1 ? 'n' : ''} automatisch entfernt
        </Alert>
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
          label="Untercodes anzeigen"
        />
      </Box>
      
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
              label="Automatisch ergänzter Untercode" 
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
            {sortedResults.map((row, index) => (
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
                    title={row.isExpandedChild ? "Automatisch ergänzter Untercode" : ""}
                    placement="top"
                  >
                    <Chip 
                      label={row.kode} 
                      color={
                        row.isExpandedChild ? 'info' :
                        'primary'
                      }
                      variant={row.isDirectInput ? "filled" : "outlined"}
                      size="small"
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
    </Paper>
  );
};

export default ResultsTable; 