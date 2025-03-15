/**
 * @typedef {Object} ICDCode
 * @property {string} kode - The ICD-10 code
 * @property {string} beschreibung - The description of the code
 * @property {string} gruppe - The group the code belongs to
 * @property {string} kapitel - The chapter the code belongs to
 */

/**
 * @typedef {Object} OPSCode
 * @property {string} kode - The OPS code
 * @property {string} beschreibung - The description of the code
 * @property {string} gruppe - The group the code belongs to
 * @property {string} kapitel - The chapter the code belongs to
 * @property {string} dreisteller - The three-digit code (OPS only)
 */

/**
 * @typedef {Object} SearchResult
 * @property {Array<ICDCode|OPSCode>} results - The search results
 * @property {number} duplicatesRemoved - Number of duplicates removed
 * @property {Array<string>} errors - List of error messages
 */ 