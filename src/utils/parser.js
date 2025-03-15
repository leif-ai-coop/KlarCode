/**
 * Parse ICD-10 codes from a codes file
 * @param {string} content - Content of the ICD-10 codes file
 * @returns {Object} - Map of ICD-10 codes
 */
export const parseICDCodes = (content) => {
  const lines = content.split('\n').filter(line => line.trim() !== '');
  const codesMap = {};

  lines.forEach(line => {
    const parts = line.split(';');
    if (parts.length >= 8) {
      // Format: 3;N;X;01;A00;A00.-;A00;A00;Cholera;Cholera;;;V;V;1-002;2-001;3-003;4-002;001;9;9;9999;9999;9;J;J;J;J
      // Or for subcodes: 4;T;X;01;A00;A00.0;A00.0;A000;Cholera durch Vibrio cholerae O:1, Biovar cholerae;Cholera;...
      const kode = parts[6]; // A00.0 format
      const beschreibung = parts[8];

      codesMap[kode] = {
        kode,
        beschreibung
      };
    }
  });

  return codesMap;
};

/**
 * Parse ICD-10 groups from a group file
 * @param {string} content - Content of the ICD-10 groups file
 * @returns {Object} - Map of ICD-10 groups
 */
export const parseICDGroups = (content) => {
  const lines = content.split('\n').filter(line => line.trim() !== '');
  const groupsMap = {};

  lines.forEach(line => {
    const parts = line.split(';');
    if (parts.length >= 3) {
      // Format: A00;A09;01;Infektiöse Darmkrankheiten
      const startCode = parts[0];
      const endCode = parts[1];
      const description = parts[3];

      groupsMap[`${startCode}-${endCode}`] = {
        start: startCode,
        end: endCode,
        description
      };
    }
  });

  return groupsMap;
};

/**
 * Parse ICD-10 chapters from a chapter file
 * @param {string} content - Content of the ICD-10 chapters file
 * @returns {Object} - Map of ICD-10 chapters
 */
export const parseICDChapters = (content) => {
  const lines = content.split('\n').filter(line => line.trim() !== '');
  const chaptersMap = {};

  lines.forEach(line => {
    const parts = line.split(';');
    if (parts.length >= 2) {
      // Format: 01;Bestimmte infektiöse und parasitäre Krankheiten
      const id = parts[0];
      const description = parts[1];

      chaptersMap[id] = {
        id,
        description
      };
    }
  });

  return chaptersMap;
};

/**
 * Parse OPS codes from a codes file
 * @param {string} content - Content of the OPS codes file
 * @returns {Object} - Map of OPS codes
 */
export const parseOPSCodes = (content) => {
  const lines = content.split('\n').filter(line => line.trim() !== '');
  const codesMap = {};

  lines.forEach(line => {
    const parts = line.split(';');
    if (parts.length >= 7) {
      // Format: 4;T;N;1;1-10;1-10;1-100;N;Klinische Untersuchung in Allgemeinanästhesie;...
      const kode = parts[6]; // 1-100 format
      const beschreibung = parts[8];

      codesMap[kode] = {
        kode,
        beschreibung
      };
    }
  });

  return codesMap;
};

/**
 * Parse OPS groups from a group file
 * @param {string} content - Content of the OPS groups file
 * @returns {Object} - Map of OPS groups
 */
export const parseOPSGroups = (content) => {
  const lines = content.split('\n').filter(line => line.trim() !== '');
  const groupsMap = {};

  lines.forEach(line => {
    const parts = line.split(';');
    if (parts.length >= 4) {
      // Format: 1;1-10;1-10;Klinische Untersuchung
      const groupCode = parts[2];
      const description = parts[3];

      groupsMap[groupCode] = {
        code: groupCode,
        description
      };
    }
  });

  return groupsMap;
};

/**
 * Parse OPS chapters from a chapter file
 * @param {string} content - Content of the OPS chapters file
 * @returns {Object} - Map of OPS chapters
 */
export const parseOPSChapters = (content) => {
  const lines = content.split('\n').filter(line => line.trim() !== '');
  const chaptersMap = {};

  lines.forEach(line => {
    const parts = line.split(';');
    if (parts.length >= 2) {
      // Format: 1;DIAGNOSTISCHE MASSNAHMEN
      const id = parts[0];
      const description = parts[1];

      chaptersMap[id] = {
        id,
        description
      };
    }
  });

  return chaptersMap;
};

/**
 * Parse OPS three-digit codes from a file
 * @param {string} content - Content of the OPS three-digit codes file
 * @returns {Object} - Map of OPS three-digit codes
 */
export const parseOPSDreisteller = (content) => {
  const lines = content.split('\n').filter(line => line.trim() !== '');
  const dreistellerMap = {};

  lines.forEach(line => {
    const parts = line.split(';');
    if (parts.length >= 4) {
      // Format: 1;1-10;1-10;Klinische Untersuchung
      const code = parts[2];
      const description = parts[3];

      dreistellerMap[code] = {
        code,
        description
      };
    }
  });

  return dreistellerMap;
}; 