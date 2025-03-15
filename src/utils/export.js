/**
 * Convert an array of objects to CSV string
 * @param {Array} data - The data to convert
 * @param {Array} headers - The headers to include
 * @returns {string} - CSV string
 */
export const convertToCSV = (data, headers) => {
  if (!data || !data.length) return '';
  
  // Create header row
  const headerRow = headers.map(h => `"${h.label}"`).join(',');
  
  // Create data rows
  const rows = data.map(item => {
    return headers.map(header => {
      const value = item[header.key] || '';
      // Escape quotes and wrap values in quotes
      return `"${String(value).replace(/"/g, '""')}"`;
    }).join(',');
  });
  
  // Combine header and data rows
  return [headerRow, ...rows].join('\n');
};

/**
 * Export data as CSV file
 * @param {Array} data - The data to export
 * @param {Array} headers - The headers to include
 * @param {string} filename - The filename to use
 */
export const exportToCSV = (data, headers, filename = 'export.csv') => {
  const csv = convertToCSV(data, headers);
  downloadFile(csv, filename, 'text/csv;charset=utf-8;');
};

/**
 * Export data as Excel file
 * Note: This is a basic implementation using CSV with .xlsx extension
 * For a more robust solution, libraries like xlsx could be used
 * @param {Array} data - The data to export
 * @param {Array} headers - The headers to include
 * @param {string} filename - The filename to use
 */
export const exportToExcel = (data, headers, filename = 'export.xlsx') => {
  // Convert to CSV as a simple approach
  const csv = convertToCSV(data, headers);
  
  // For Excel, use a BOM for UTF-8 encoding support
  const csvWithBOM = '\uFEFF' + csv;
  
  // Use .xlsx extension but it's still CSV content
  downloadFile(csvWithBOM, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8');
};

/**
 * Helper function to download a file
 * @param {string} content - The file content
 * @param {string} filename - The filename
 * @param {string} contentType - The content type
 */
const downloadFile = (content, filename, contentType) => {
  // Create a blob from the content
  const blob = new Blob([content], { type: contentType });
  
  // Create a URL for the blob
  const url = URL.createObjectURL(blob);
  
  // Create a temporary link element
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  
  // Append to body, click, and remove
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL
  URL.revokeObjectURL(url);
}; 