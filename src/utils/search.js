/**
 * Validate an ICD-10 code format
 * @param {string} code - The code to validate
 * @returns {boolean} - True if valid format, false otherwise
 */
export const isValidICDFormat = (code) => {
  // Format: A00 or A00.0
  return /^[A-Z]\d{2}(\.\d+)?$/.test(code);
};

/**
 * Validate an OPS code format
 * @param {string} code - The code to validate
 * @returns {boolean} - True if valid format, false otherwise
 */
export const isValidOPSFormat = (code) => {
  // Format: 1-20 or 1-202.00
  return /^\d-\d{2,3}(\.\d{1,2})?$/.test(code);
};

/**
 * Normalize a code by removing non-alphanumeric characters
 * @param {string} code - The code to normalize
 * @returns {string} - Normalized code
 */
export const normalizeCode = (code) => {
  // Keep only alphanumeric characters and dots
  return code.replace(/[^A-Za-z0-9.-]/g, '');
};

/**
 * Parse user input into an array of codes
 * @param {string} input - User input
 * @returns {string[]} - Array of individual codes
 */
export const parseUserInput = (input) => {
  // Split by comma, semicolon, newline, or space
  const codes = input.split(/[,;\n\s]+/)
    .map(code => code.trim())
    .filter(code => code.length > 0);
  
  // Remove duplicates
  const uniqueCodes = [...new Set(codes)];
  const duplicatesRemoved = codes.length - uniqueCodes.length;
  
  return {
    codes: uniqueCodes,
    duplicatesRemoved
  };
};

/**
 * Check if a code is a wildcard search
 * @param {string} code - The code to check
 * @returns {boolean} - True if wildcard, false otherwise
 */
export const isWildcardSearch = (code) => {
  return code.includes('*');
};

/**
 * Convert wildcard pattern to regex
 * @param {string} pattern - Wildcard pattern
 * @returns {RegExp} - Regular expression
 */
export const wildcardToRegex = (pattern) => {
  // Replace * with regex .*
  const regexPattern = pattern.replace(/\*/g, '.*');
  return new RegExp(`^${regexPattern}$`);
};

/**
 * Find all codes matching a wildcard pattern
 * @param {string} pattern - Wildcard pattern
 * @param {Object} codeMap - Map of all codes
 * @returns {string[]} - Array of matching codes
 */
export const findWildcardMatches = (pattern, codeMap) => {
  const regex = wildcardToRegex(pattern);
  
  return Object.keys(codeMap).filter(code => {
    return regex.test(code);
  });
};

/**
 * Find all child codes for a non-terminal ICD code
 * @param {string} parentCode - The parent code
 * @param {Object} codeMap - Map of all codes
 * @returns {string[]} - Array of child codes
 */
export const findChildICDCodes = (parentCode, codeMap) => {
  // For a code like A00, find all codes that start with A00.
  const childPattern = `${parentCode}.`;
  
  return Object.keys(codeMap).filter(code => {
    return code.startsWith(childPattern);
  });
};

/**
 * Find all child codes for a non-terminal OPS code
 * @param {string} parentCode - The parent code
 * @param {Object} codeMap - Map of all codes
 * @returns {string[]} - Array of child codes
 */
export const findChildOPSCodes = (parentCode, codeMap) => {
  // For a code like 1-20, find all codes that start with 1-20.
  // This could be 1-200, 1-201, 1-202, etc. or 1-20.00, 1-20.01, etc.
  
  return Object.keys(codeMap).filter(code => {
    return code === parentCode || 
           code.startsWith(`${parentCode}.`) || 
           (code.startsWith(parentCode) && code.length > parentCode.length && !code.includes('.'));
  });
};

/**
 * Find the chapter for an ICD code
 * @param {string} code - The ICD code
 * @param {Object} codeMap - Map of all ICD codes
 * @param {Object} chaptersMap - Map of chapters
 * @returns {string} - Chapter description or empty string if not found
 */
export const findICDChapter = (code, codeMap, chaptersMap) => {
  if (!codeMap[code]) return '';
  
  // Extract chapter ID from the code metadata
  // In ICD files, the chapter ID is typically in format "01"
  // We'd need to extract this from the actual data structure based on your file format
  // This is a placeholder implementation
  const chapterId = code.startsWith('A') || code.startsWith('B') ? '01' : 
                    code.startsWith('C') || code.startsWith('D') ? '02' : '';
  
  return chaptersMap[chapterId] ? chaptersMap[chapterId].description : '';
};

/**
 * Find the group for an ICD code
 * @param {string} code - The ICD code
 * @param {Object} groupsMap - Map of groups
 * @returns {string} - Group description or empty string if not found
 */
export const findICDGroup = (code, groupsMap) => {
  // Extract the base code (A00 from A00.1)
  const baseCode = code.split('.')[0];
  
  // Find the group where the code falls between start and end
  for (const groupKey in groupsMap) {
    const group = groupsMap[groupKey];
    if (baseCode >= group.start && baseCode <= group.end) {
      return group.description;
    }
  }
  
  return '';
};

/**
 * Find the chapter for an OPS code
 * @param {string} code - The OPS code
 * @param {Object} chaptersMap - Map of chapters
 * @returns {string} - Chapter description or empty string if not found
 */
export const findOPSChapter = (code, chaptersMap) => {
  // OPS codes start with the chapter number, e.g., "1-20" is in chapter "1"
  const chapterId = code.split('-')[0];
  
  return chaptersMap[chapterId] ? chaptersMap[chapterId].description : '';
};

/**
 * Find the group for an OPS code
 * @param {string} code - The OPS code
 * @param {Object} groupsMap - Map of groups
 * @returns {string} - Group description or empty string if not found
 */
export const findOPSGroup = (code, groupsMap) => {
  // Extract base code (1-20 from 1-202.00)
  const parts = code.split('.');
  let baseCode = parts[0];
  
  // If it's a detailed code like 1-202, we need the base group like 1-20
  if (baseCode.match(/\d-\d{3}/)) {
    baseCode = baseCode.substring(0, 4); // Get 1-20 from 1-202
  }
  
  // Find the exact group or a parent group
  if (groupsMap[baseCode]) {
    return groupsMap[baseCode].description;
  }
  
  // If not found, try to find a parent group
  for (const groupKey in groupsMap) {
    if (baseCode.startsWith(groupKey)) {
      return groupsMap[groupKey].description;
    }
  }
  
  return '';
};

/**
 * Find the three-digit code for an OPS code
 * @param {string} code - The OPS code
 * @param {Object} dreistellerMap - Map of three-digit codes
 * @returns {string} - Three-digit code description or empty string if not found
 */
export const findOPSDreisteller = (code, dreistellerMap) => {
  // Extract the three-digit part from codes like 1-202.00 -> 1-202
  const dreistellerCode = code.split('.')[0];
  
  if (dreistellerMap[dreistellerCode]) {
    return dreistellerMap[dreistellerCode].description;
  }
  
  // If not found, it might be a parent code itself
  if (dreistellerCode.match(/\d-\d{2}$/)) {
    return dreistellerMap[dreistellerCode] ? dreistellerMap[dreistellerCode].description : '';
  }
  
  return '';
}; 