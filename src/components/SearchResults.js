import React, { useState, useEffect } from 'react';
import './SearchResults.css';

/**
 * Komponente zur Anzeige der Suchergebnisse
 * @param {Object} props - Component props
 * @param {Array} props.results - Array mit Suchergebnissen
 * @param {string} props.searchType - Typ der Suche ('icd' oder 'ops')
 * @param {function} props.onCopyCode - Callback für Kopieren eines Codes
 * @param {Object} props.showMore - Objekt, das die Anzeigeoptionen verwaltet
 * @param {function} props.onToggleShowMore - Callback zum Ändern der Anzeigeoptionen
 */
const SearchResults = ({ results, searchType, onCopyCode, showMore, onToggleShowMore }) => {
  // Debug logging on component render
  console.log('SearchResults rendered with:', { 
    resultsLength: results?.length,
    searchType,
    showMore,
    onToggleShowMoreDefined: typeof onToggleShowMore === 'function'
  });
  
  // Keine lokalen States mehr für diese Optionen, da sie jetzt vom Hook verwaltet werden
  
  // Zurücksetzen der Anzeigeoptionen, wenn sich der Suchtyp ändert
  useEffect(() => {
    // No need to reset local states here, as they are managed by the hook
  }, [searchType]);
  
  // Wenn keine Ergebnisse vorhanden sind, zeige nichts an
  if (!results || results.length === 0) {
    return null;
  }
  
  // Funktion zum Kopieren eines Codes
  const handleCopy = (code) => {
    if (onCopyCode) {
      onCopyCode(code);
    }
  };
  
  // Funktion zum Exportieren als CSV
  const exportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Header-Zeile
    let headers = ["Kode", "Beschreibung"];
    if (showMore.kapitel) headers.push("Kapitel");
    if (showMore.gruppe) headers.push("Gruppe");
    if (showMore.dreisteller && searchType === 'ops') headers.push("Dreisteller");
    
    csvContent += headers.join(";") + "\r\n";
    
    // Datenzeilen
    results.forEach(result => {
      let row = [
        `"${result.kode}"`,
        `"${result.beschreibung}"`
      ];
      
      if (showMore.kapitel) row.push(`"${result.kapitel || ''}"`);
      if (showMore.gruppe) row.push(`"${result.gruppe || ''}"`);
      if (showMore.dreisteller && searchType === 'ops') row.push(`"${result.dreisteller || ''}"`);
      
      csvContent += row.join(";") + "\r\n";
    });
    
    // Download-Link erstellen und klicken
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${searchType}-codes-export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Add these console logs before the return statement
  console.log('SearchResults props:', {
    resultsLength: results.length,
    searchType,
    showMore,
    hasChildCodesToggle: showMore.hasOwnProperty('childCodes')
  });
  
  return (
    <div className="search-results">
      <h2>Suchergebnisse ({results.length})</h2>
      
      {/* DEBUGGING INFORMATION - ALWAYS VISIBLE */}
      <div style={{
        border: '3px solid red',
        padding: '10px',
        margin: '10px 0',
        backgroundColor: '#fff',
        color: '#000',
        fontSize: '14px',
        position: 'relative',
        zIndex: 9999
      }}>
        <h3 style={{margin: '0 0 10px 0'}}>DEBUG INFORMATION</h3>
        <div><strong>Results length:</strong> {results.length}</div>
        <div><strong>Search type:</strong> {searchType}</div>
        <div><strong>showMore object:</strong> {JSON.stringify(showMore)}</div>
        <div><strong>childCodes property exists:</strong> {showMore.hasOwnProperty('childCodes') ? 'YES' : 'NO'}</div>
        <div><strong>childCodes value:</strong> {showMore.childCodes ? 'TRUE' : 'FALSE'}</div>
        <div style={{marginTop: '10px'}}>
          <button 
            style={{
              backgroundColor: 'blue',
              color: 'white',
              border: 'none',
              padding: '8px 15px',
              cursor: 'pointer',
              marginRight: '10px'
            }}
            onClick={() => {
              console.log('Toggle childCodes clicked');
              onToggleShowMore('childCodes');
            }}
          >
            TOGGLE childCodes
          </button>
          <span style={{fontWeight: 'bold'}}>
            Current childCodes state: {showMore.childCodes ? 'ON' : 'OFF'}
          </span>
        </div>
      </div>
      
      <div className="export-buttons">
        <button onClick={() => navigator.clipboard.writeText(results.map(r => r.kode).join(', '))}>
          <i className="fas fa-copy"></i> KOPIEREN
        </button>
        <button onClick={exportCSV}>
          <i className="fas fa-file-csv"></i> CSV EXPORT
        </button>
      </div>
      
      <div className="display-options" style={{margin: '20px 0', display: 'flex', flexDirection: 'column', gap: '10px'}}>
        {/* Kapitel toggle */}
        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
          <label className="toggle-switch">
            <input 
              type="checkbox" 
              checked={showMore.kapitel} 
              onChange={() => onToggleShowMore('kapitel')} 
            />
            <span className="slider"></span>
          </label>
          <span>Kapitel anzeigen</span>
        </div>
        
        {/* Gruppe toggle */}
        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
          <label className="toggle-switch">
            <input 
              type="checkbox" 
              checked={showMore.gruppe} 
              onChange={() => onToggleShowMore('gruppe')} 
            />
            <span className="slider"></span>
          </label>
          <span>Gruppe anzeigen</span>
        </div>
        
        {/* Dreisteller toggle (only for OPS) */}
        {searchType === 'ops' && (
          <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={showMore.dreisteller} 
                onChange={() => onToggleShowMore('dreisteller')} 
              />
              <span className="slider"></span>
            </label>
            <span>Dreisteller anzeigen (nur OPS)</span>
          </div>
        )}
        
        {/* Child codes toggle - NO CONDITIONS, ALWAYS SHOW */}
        <div style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '5px', backgroundColor: '#ffff99'}}>
          <label className="toggle-switch">
            <input 
              type="checkbox" 
              checked={showMore.childCodes} 
              onChange={() => onToggleShowMore('childCodes')} 
            />
            <span className="slider"></span>
          </label>
          <span>Subcodes anzeigen</span>
        </div>
        
        {/* Neue Optionen - nur für OPS anzeigen */}
        {searchType === 'ops' && (
          <>
            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={showMore.terminalCode} 
                  onChange={() => onToggleShowMore('terminalCode')} 
                />
                <span className="slider"></span>
              </label>
              <span>Terminale Schlüsselnummer anzeigen</span>
            </div>
            
            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={showMore.sideRequired} 
                  onChange={() => onToggleShowMore('sideRequired')} 
                />
                <span className="slider"></span>
              </label>
              <span>Seitenangabe erforderlich anzeigen</span>
            </div>
            
            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={showMore.validityKHG} 
                  onChange={() => onToggleShowMore('validityKHG')} 
                />
                <span className="slider"></span>
              </label>
              <span>Gültigkeit § 17 KHG anzeigen</span>
            </div>
            
            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={showMore.isAdditionalCode} 
                  onChange={() => onToggleShowMore('isAdditionalCode')} 
                />
                <span className="slider"></span>
              </label>
              <span>Zusatzkode anzeigen</span>
            </div>
            
            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={showMore.isOneTimeCode} 
                  onChange={() => onToggleShowMore('isOneTimeCode')} 
                />
                <span className="slider"></span>
              </label>
              <span>Einmalkode anzeigen</span>
            </div>
          </>
        )}
      </div>
      
      <div className="results-table">
        <table>
          <thead>
            <tr>
              <th>Kode <i className="fas fa-sort-up"></i></th>
              <th>Beschreibung</th>
              {showMore.kapitel && <th>Kapitel</th>}
              {showMore.gruppe && <th>Gruppe</th>}
              {showMore.dreisteller && searchType === 'ops' && <th>Dreisteller</th>}
              
              {/* Neue Spalten */}
              {showMore.terminalCode && searchType === 'ops' && <th>Terminale Schlüsselnummer</th>}
              {showMore.sideRequired && searchType === 'ops' && <th>Seitenangabe erforderlich</th>}
              {showMore.validityKHG && searchType === 'ops' && <th>Gültigkeit § 17 KHG</th>}
              {showMore.isAdditionalCode && searchType === 'ops' && <th>Zusatzkode</th>}
              {showMore.isOneTimeCode && searchType === 'ops' && <th>Einmalkode</th>}
              
              <th>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result, index) => (
              <tr key={index} className={result.isParent ? 'parent-row' : result.parentCode ? 'child-row' : ''}>
                <td className="code-cell">
                  <span className={`code-badge ${searchType}`}>{result.kode}</span>
                </td>
                <td>{result.beschreibung}</td>
                {showMore.kapitel && <td>{result.kapitel || '-'}</td>}
                {showMore.gruppe && <td>{result.gruppe || '-'}</td>}
                {showMore.dreisteller && searchType === 'ops' && <td>{result.dreisteller || '-'}</td>}
                
                {/* Neue Zellen */}
                {showMore.terminalCode && searchType === 'ops' && <td>{result.terminalCode || '-'}</td>}
                {showMore.sideRequired && searchType === 'ops' && <td>{result.sideRequired || '-'}</td>}
                {showMore.validityKHG && searchType === 'ops' && <td>{result.validityKHG || '-'}</td>}
                {showMore.isAdditionalCode && searchType === 'ops' && <td>{result.isAdditionalCode || '-'}</td>}
                {showMore.isOneTimeCode && searchType === 'ops' && <td>{result.isOneTimeCode || '-'}</td>}
                
                <td>
                  <button className="icon-button" onClick={() => handleCopy(result.kode)}>
                    <i className="fas fa-copy"></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SearchResults; 