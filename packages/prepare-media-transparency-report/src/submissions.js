/** @typedef {import('./types.js').Submission} Submission */
/** @typedef {import('./types.js').DataFeedElement} DataFeedElement */

/**
 * Parse the dataFeedElement JSON string from a submission object.
 * @param {Submission} submission
 * @returns {Partial<DataFeedElement>} - parsed dataFeedElement object or empty object if parsing fails
 */
export function parseSubmissionData(submission) {
    if (!submission?.dataFeedElement) {
        return {};
    }

    try {
        return JSON.parse(submission.dataFeedElement);
    } catch (error) {
        console.error('Failed to parse item data:', error);
        return {};
    }
}

/**
 * Filter submissions by the given category and reporting period.
 * @param {Submission[]} submissions
 * @param {string} category
 * @param {string} period
 * @returns {Submission[]}
 */
export function filterSubmissions(submissions, category, period) {
    return submissions.filter((submission) => {
        const dataFeedElement = parseSubmissionData(submission);
        return (
            (category === '_all' || dataFeedElement?.category === category) &&
            dataFeedElement?.reportingDeadline === period
        );
    });
}

/**
 * Deduplicate file names by appending the submission identifier to the base name of the file.
 * @param {string} fileName
 * @param {string} submissionIdentifier
 * @returns {string} - file name with submission identifier appended to avoid duplicate file names
 */
export function deduplicateFileName(fileName, submissionIdentifier) {
    if (/\.\w{2,4}$/.test(fileName)) {
        return fileName.replace(/^(.*)(\.\w{2,4})$/, (match, fileBaseName, extension) => {
            return `${fileBaseName}_${submissionIdentifier}${extension}`;
        });
    }
    return `${fileName}_${submissionIdentifier}`;
}
