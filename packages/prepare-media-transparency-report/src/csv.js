import Papa from 'papaparse';

/** @typedef {import('./types.js').RTRCsvRow} RTRCsvRow */
/** @typedef {import('./types.js').DataFeedElement} DataFeedElement */

/**
 * Expected column headers of the CSV file imported from RTR.
 * @type {string[]}
 */
export const EXPECTED_CSV_HEADERS = [
    'Dateiname',
    'URL',
    'Dateityp',
    'Dateigröße (byte)',
    'Halbjahr',
    'Upload Zeitpunkt',
    'Reference Nummer',
];

/**
 * Sanitize a category name so it can safely be used in a file name.
 * Transliterates German umlauts, replaces spaces with hyphens and strips
 * any remaining characters that are not alphanumeric, hyphen or underscore.
 * @param {string} category
 * @returns {string}
 */
export function sanitizeCategoryForFilename(category) {
    return (category || '')
        .replace(/ö/g, 'oe')
        .replace(/Ö/g, 'Oe')
        .replace(/ä/g, 'ae')
        .replace(/Ä/g, 'Ae')
        .replace(/ü/g, 'ue')
        .replace(/Ü/g, 'Ue')
        .replace(/ß/g, 'ss')
        .replace(/\s+/g, '-')
        .replace(/[^a-zA-Z0-9_-]/g, '');
}

/**
 * Build the base name (without extension) for an exported file. The category is
 * rendered as "all" for the "_all" selection and sanitized otherwise, and the
 * period's "/" (e.g. "2026/2") is replaced with "_" so it is safe in a file
 * name and is not treated as a path separator inside a ZIP.
 * @param {string} prefix - The leading part of the name, e.g. "media-transparency-report".
 * @param {string} category - The selected category, or "_all".
 * @param {string} period - The selected period, e.g. "2026/2".
 * @returns {string} - The base name, e.g. "media-transparency-report-Online-2026_2".
 */
export function buildExportBaseName(prefix, category, period) {
    const safeCategory = category === '_all' ? 'all' : sanitizeCategoryForFilename(category);
    const safePeriod = period.replace(/\//g, '_');
    return `${prefix}-${safeCategory}-${safePeriod}`;
}

/**
 * Parse and validate the textual content of a CSV file imported from RTR.
 * Throws an Error with message `description-csv-parse-error` when parsing fails
 * and `description-csv-header-error` when the headers do not match the expected
 * ones. Callers map these messages to translated notifications.
 * @param {string} csvContent - raw CSV text
 * @returns {Array<RTRCsvRow>} - parsed CSV data as an array of objects
 */
export function parseCsvContent(csvContent) {
    const parsedData = Papa.parse(csvContent, {header: true, skipEmptyLines: true});

    // Check parsing errors
    if (parsedData.errors.length > 0) {
        console.error('Error parsing CSV:', parsedData.errors);
        throw new Error('description-csv-parse-error');
    }

    // Check if the parsed CSV headers match the expected headers
    const parsedHeaders = parsedData.meta.fields || [];

    if (
        !(
            parsedHeaders.length === EXPECTED_CSV_HEADERS.length &&
            parsedHeaders.every((val, i) => val === EXPECTED_CSV_HEADERS[i])
        )
    ) {
        throw new Error('description-csv-header-error');
    }

    return parsedData.data;
}

/**
 * Build a lookup Map of submissionId -> RTR sujet URL from the parsed RTR CSV.
 * The submission id is extracted from the file name (a trailing UUID).
 * @param {Array<RTRCsvRow>} parsedRTRCSV
 * @returns {Map<string, string>}
 */
export function buildSujetLinkLookup(parsedRTRCSV) {
    const rtrUrlBySubmissionId = new Map();
    for (const row of parsedRTRCSV) {
        const match = row.Dateiname?.match(
            /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.\w+$/i,
        );
        if (match) {
            rtrUrlBySubmissionId.set(match[1], row.URL);
        }
    }
    return rtrUrlBySubmissionId;
}

/**
 * Build a single CSV row object from a parsed submission data feed element and
 * its (already looked up) RTR sujet link.
 * @param {Partial<DataFeedElement>} dataFeedElement - parsed submission data
 * @param {string|undefined} rtrUrl - RTR sujet link for the submission, if any
 * @param {string} submissionIdentifier - the submission identifier
 * @returns {Record<string, string>}
 */
export function buildCsvRow(dataFeedElement, rtrUrl, submissionIdentifier) {
    return {
        Medium: dataFeedElement.mediaName,
        Medium_andere: dataFeedElement.otherMediumName || '',
        Medieninhaber: dataFeedElement.mediumOwnersName || '',
        Medieninhaber_andere: dataFeedElement.otherMediumOwnersName || '',
        Betrag: dataFeedElement.amountInEuro || '',
        Kampagnentitel: dataFeedElement.campaignTitle || '',
        Sujetlink: rtrUrl,
        Kategorie: dataFeedElement.category || '',
        ID: rtrUrl ? `${dataFeedElement.mediumOwnersName || ''}${rtrUrl}` : '',
        submissionIdentifier: submissionIdentifier || '',
        reportingDeadline: dataFeedElement.reportingDeadline || '',
    };
}
