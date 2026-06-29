/**
 * A row from the RTR CSV export file.
 * @typedef {{"Dateiname": string, "URL": string, "Dateityp": string, "Dateigröße (byte)": string, "Halbjahr": string, "Upload Zeitpunkt": string, "Reference Nummer": string}} RTRCsvRow
 */

/**
 * The parsed content of a submission's dataFeedElement JSON string.
 * @typedef {object} DataFeedElement
 * @property {string} category
 * @property {string} reportingDeadline
 * @property {string} mediaName
 * @property {string} [otherMediumName]
 * @property {string} [mediumOwnersName]
 * @property {string} [otherMediumOwnersName]
 * @property {string} [amountInEuro]
 * @property {string} [campaignTitle]
 */

/**
 * A file attached to a submission.
 * @typedef {object} SubmittedFile
 * @property {string} identifier
 * @property {string} fileAttributeName
 * @property {string} fileName
 * @property {number} fileSize
 * @property {string} mimeType
 * @property {string} downloadUrl
 */

/**
 * A submission returned by the formalize API.
 * @typedef {object} Submission
 * @property {string} identifier
 * @property {string} dataFeedElement - JSON string of submission data
 * @property {string} form
 * @property {string} creatorId
 * @property {string} dateCreated
 * @property {string} lastModifiedById
 * @property {string} dateLastModified
 * @property {string[]} tags
 * @property {number} submissionState
 * @property {SubmittedFile[]} submittedFiles
 * @property {string[]} grantedActions
 */

/**
 * A file reference for streamed downloads via the file-sink component.
 * @typedef {object} DownloadableFile
 * @property {string} name
 * @property {string} url
 */

export {};
