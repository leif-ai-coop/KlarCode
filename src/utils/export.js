import * as XLSX from 'xlsx';

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
 * @param {Array} data - The data to export (array of objects)
 * @param {Array} headers - The headers to include (array of {key: string, label: string})
 * @param {string} filename - The filename to use
 */
export const exportToExcel = (data, headers, filename = 'export.xlsx') => {
  // 1. Map the data to only include the columns defined in headers and use header labels
  const dataForSheet = data.map(row => {
    const newRow = {};
    headers.forEach(header => {
      newRow[header.label] = row[header.key] || ''; // Use label as key for the sheet
    });
    return newRow;
  });

  // 2. Create a worksheet from the mapped data
  // headers are automatically inferred from the keys of the first object in dataForSheet
  const worksheet = XLSX.utils.json_to_sheet(dataForSheet);

  // Optional: Adjust column widths (example)
  // const colWidths = headers.map(h => ({ wch: Math.max(h.label.length, 15) })); // Set min width
  // worksheet['!cols'] = colWidths;

  // 3. Create a new workbook
  const workbook = XLSX.utils.book_new();

  // 4. Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Daten'); // Sheet name 'Daten'

  // 5. Generate the Excel file binary data (type: buffer)
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

  // 6. Trigger the download using the helper function
  downloadFile(
    excelBuffer, 
    filename, 
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
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