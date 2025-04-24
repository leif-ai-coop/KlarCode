import React from 'react';
import { Box, Button, FormControl, InputLabel, MenuItem, Select, Typography, CircularProgress, Alert } from '@mui/material';
import CatalogDiffTree from './CatalogDiffTree';

const CATALOG_TYPES = [
  { value: 'icd', label: 'ICD' },
  { value: 'ops', label: 'OPS' }
];

export default function CatalogDiffView({
  catalogType,
  yearOld,
  yearNew,
  years,
  loading,
  error,
  diffTree,
  icdChapters,
  icdGroups,
  onCompare,
  onCatalogChange,
  onYearOldChange,
  onYearNewChange,
  expandedNodes,
  onToggleNode
}) {
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
            onChange={onCatalogChange}
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
            onChange={onYearOldChange}
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
            onChange={onYearNewChange}
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
          onClick={onCompare}
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
          catalogType={catalogType}
          icdChapters={icdChapters}
          icdGroups={icdGroups}
          oldYear={yearOld}
          newYear={yearNew}
          expandedNodes={expandedNodes}
          onToggleNode={onToggleNode}
        />
      )}
    </Box>
  );
} 