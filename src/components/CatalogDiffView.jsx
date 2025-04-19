import React, { useState } from 'react';
import { Box, Button, FormControl, InputLabel, MenuItem, Select, Typography, CircularProgress, Alert } from '@mui/material';
import { loadICDData, loadOPSData, getAvailableYears, loadOPSMigrationData, loadICDMigrationData } from '../services/dataService';
import { diffCatalogs } from '../utils/catalogDiff';
// Platzhalter für die Baum-Komponente
// (später implementieren)
import CatalogDiffTree from './CatalogDiffTree';

const CATALOG_TYPES = [
  { value: 'icd', label: 'ICD' },
  { value: 'ops', label: 'OPS' }
];

export default function CatalogDiffView() {
  const [catalogType, setCatalogType] = useState('icd');
  const [yearOld, setYearOld] = useState('');
  const [yearNew, setYearNew] = useState('');
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [diffTree, setDiffTree] = useState(null);
  const [icdChapters, setIcdChapters] = useState(null); // Store chapter data
  const [icdGroups, setIcdGroups] = useState(null);     // Store group data

  // Lade verfügbare Jahre beim ersten Rendern
  React.useEffect(() => {
    getAvailableYears().then(setYears).catch(() => setYears([]));
  }, []);

  const handleCompare = async () => {
    setError(null);
    setDiffTree(null);
    setIcdChapters(null); // Reset chapter data
    setIcdGroups(null);   // Reset group data
    setLoading(true);
    try {
      let oldData, newData, migrationData = null;
      if (catalogType === 'icd') {
        oldData = await loadICDData(yearOld);
        newData = await loadICDData(yearNew);
        migrationData = await loadICDMigrationData(yearOld, yearNew);
        console.log('ICD-Umsteiger geladen:', migrationData);
        setIcdChapters(newData.chapters); // Store chapters from new data
        setIcdGroups(newData.groups);     // Store groups from new data
      } else {
        oldData = await loadOPSData(yearOld);
        newData = await loadOPSData(yearNew);
        
        // Lade OPS-Umsteiger-Daten (nur für OPS relevant)
        migrationData = await loadOPSMigrationData(yearOld, yearNew);
        console.log('OPS-Umsteiger geladen:', migrationData);
        // Reset ICD specific data if switching to OPS
        setIcdChapters(null);
        setIcdGroups(null);
      }
      
      // Logging hinzufügen
      console.log('Vergleich: alt', yearOld, 'neu', yearNew);
      console.log('oldData', oldData);
      console.log('newData', newData);
      
      // Zusätzliches Logging für OPS-Daten
      if (catalogType === 'ops') {
        console.log('OPS-Keys (alt):', Object.keys(oldData));
        if (oldData.dreisteller) {
          console.log('OPS dreisteller Beispiele (alt):', Object.entries(oldData.dreisteller).slice(0, 3));
        }
        if (oldData.dreitellerMap) {
          console.log('OPS dreitellerMap Beispiele (alt):', Object.entries(oldData.dreitellerMap).slice(0, 3));
        }
      }
      
      const diff = diffCatalogs({ 
        oldCatalog: oldData, 
        newCatalog: newData, 
        type: catalogType,
        migrationData,
        oldYear: yearOld,
        newYear: yearNew
      });
      setDiffTree(diff);
    } catch (e) {
      setError(e.message || 'Fehler beim Laden oder Vergleichen der Kataloge.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Katalog-Delta (ICD/OPS) zwischen zwei Jahren
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'flex-start' }}>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel id="catalog-type-label">Katalog</InputLabel>
          <Select
            labelId="catalog-type-label"
            value={catalogType}
            label="Katalog"
            onChange={e => setCatalogType(e.target.value)}
          >
            {CATALOG_TYPES.map(opt => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel id="year-old-label">Jahr (alt)</InputLabel>
          <Select
            labelId="year-old-label"
            value={yearOld}
            label="Jahr (alt)"
            onChange={e => setYearOld(e.target.value)}
          >
            {years.map(y => (
              <MenuItem key={y} value={y}>{y}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel id="year-new-label">Jahr (neu)</InputLabel>
          <Select
            labelId="year-new-label"
            value={yearNew}
            label="Jahr (neu)"
            onChange={e => setYearNew(e.target.value)}
          >
            {years.map(y => (
              <MenuItem key={y} value={y}>{y}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="contained"
          color="primary"
          disabled={!catalogType || !yearOld || !yearNew || yearOld === yearNew || loading}
          onClick={handleCompare}
          sx={{ minWidth: 120 }}
        >
          VERGLEICHEN
        </Button>
      </Box>
      {loading && <CircularProgress sx={{ my: 3 }} />}
      {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}
      {diffTree && (
        <CatalogDiffTree 
          diffTree={diffTree} 
          catalogType={catalogType} // Pass catalogType
          icdChapters={icdChapters}   // Pass chapters definitions
          icdGroups={icdGroups}     // Pass groups definitions
          // Pass years for context
          oldYear={yearOld}
          newYear={yearNew}
        />
      )}
    </Box>
  );
} 