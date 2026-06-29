import * as commonUtils from '@dbp-toolkit/common/utils';
import {createInstance} from './i18n.js';
import {html, css} from 'lit';
import {createRef, ref} from 'lit/directives/ref.js';
import {classMap} from 'lit/directives/class-map.js';
import {ScopedElementsMixin} from '@dbp-toolkit/common';
import {AdapterLitElement, LangMixin, AuthMixin, sendNotification} from '@dbp-toolkit/common';
import * as commonStyles from '@dbp-toolkit/common/styles';
import {Translated} from '@dbp-toolkit/common/src/translated';
import {FileSource, FileSink} from '@dbp-toolkit/file-handling';
import {Button, Icon} from '@dbp-toolkit/common';
import Papa from 'papaparse';
import {
    getReportingPeriodItems,
    initialSelectedPeriod,
    getReportingCategoryItems,
} from './categories.js';
import {parseSubmissionData, filterSubmissions, deduplicateFileName} from './submissions.js';
import {buildExportBaseName, parseCsvContent, buildSujetLinkLookup, buildCsvRow} from './csv.js';
/** @typedef {import('./types.js').RTRCsvRow} RTRCsvRow */
/** @typedef {import('./types.js').Submission} Submission */
/** @typedef {import('./types.js').SubmittedFile} SubmittedFile */
/** @typedef {import('./types.js').DownloadableFile} DownloadableFile */
/** @typedef {import('./types.js').DataFeedElement} DataFeedElement */

export class DbpPrepareMediaTransparencyReport extends AuthMixin(
    LangMixin(ScopedElementsMixin(AdapterLitElement), createInstance),
) {
    constructor() {
        super();
        /** @type {string} */
        this.entryPointUrl = '';
        /** @type {string} */
        this.formIdentifier = '019bdb56-6fc7-760d-938a-b128a89958a8'; // Media-transparency form
        // Category/period selection for the "Download sujets" section.
        /** @type {string} */
        this.sujetCategory = '_all';
        /** @type {string} */
        this.sujetPeriod = initialSelectedPeriod();
        // Category/period selection for the "Generate report" section.
        /** @type {string} */
        this.reportCategory = '_all';
        /** @type {string} */
        this.reportPeriod = initialSelectedPeriod();
        /** @type {Array<Submission>} */
        this.submissions = [];
        /** @type {Array<DownloadableFile>} */
        this.sujetFilesToDownload = [];
        /** @type {boolean} */
        this.sujetFilesDownloadStarted = false;
        /** @type {string} */
        this.sujetStatusMessage = '';
        /** @type {boolean} */
        this.sujetStatusIsWarning = false;
        /** @type {Array<{category: string, csv: string}>} */
        this.csvFilesToExport = [];
        /** @type {boolean} */
        this.hasReportToExport = false;
        /** @type {number} */
        this.missingSujetLinksCount = 0;
        /** @type {number} */
        this.parsedCSVRowCount = 0;
        /** @type {number} */
        this.filteredSubmissionCount = 0;
        /** @type {boolean} */
        this.reportIsComplete = false;
        /** @type {File|null} */
        this.importedRTRCSVFile = null;
        this.downloadSujetButtonRef = createRef();
        this.exportCSVButtonRef = createRef();
        this.importCSVButtonRef = createRef();
        /** @type {import('lit/directives/ref.js').Ref<import('@dbp-toolkit/file-handling').FileSource>} */
        this.csvImportFileSourceRef = createRef();
        /** @type {import('lit/directives/ref.js').Ref<import('@dbp-toolkit/file-handling').FileSink>} */
        this.sujetExportFileSinkRef = createRef();
        /** @type {import('lit/directives/ref.js').Ref<import('@dbp-toolkit/file-handling').FileSink>} */
        this.csvExportSinkRef = createRef();
    }

    static get properties() {
        return {
            ...super.properties,
            entryPointUrl: {type: String, attribute: 'entry-point-url'},
            sujetCategory: {type: String, attribute: false},
            sujetPeriod: {type: String, attribute: false},
            reportCategory: {type: String, attribute: false},
            reportPeriod: {type: String, attribute: false},
            sujetFilesToDownload: {type: Array, attribute: false},
            sujetFilesDownloadStarted: {type: Boolean, attribute: false},
            sujetStatusMessage: {type: String, attribute: false},
            sujetStatusIsWarning: {type: Boolean, attribute: false},
            hasReportToExport: {type: Boolean, attribute: false},
            parsedCSVRowCount: {type: Number, attribute: false},
            filteredSubmissionCount: {type: Number, attribute: false},
            reportIsComplete: {type: Boolean, attribute: false},
            missingSujetLinksCount: {type: Number, attribute: false},
            importedRTRCSVFile: {type: Object, attribute: false},
        };
    }

    static get scopedElements() {
        return {
            'dbp-translated': Translated,
            'dbp-icon': Icon,
            'dbp-button': Button,
            'dbp-file-sink': FileSink,
            'dbp-file-source': FileSource,
        };
    }

    /* 1. DOWNLOAD SUJET FILES */

    /**
     * Handle the download of sujet files for the selected category and reporting period.
     */
    async handleSujetFilesDownload() {
        const downloadButton = this.downloadSujetButtonRef.value;
        if (downloadButton) {
            downloadButton.spinner = true;
        }

        // Hide the success status until the user actually starts the download
        // from the file-sink modal (see handleSujetDownloadStarted) and clear any
        // previous status message.
        this.sujetFilesDownloadStarted = false;
        this.sujetStatusMessage = '';
        this.sujetStatusIsWarning = false;

        try {
            this.sujetFilesToDownload = await this.processSujetFiles();

            if (this.sujetFilesToDownload.length > 0) {
                if (this.sujetExportFileSinkRef.value) {
                    this.sujetExportFileSinkRef.value.files = this.sujetFilesToDownload;
                }
            }
        } catch (error) {
            console.error('Error processing sujet files:', error);
        } finally {
            if (downloadButton) {
                downloadButton.spinner = false;
                downloadButton.stop();
            }
        }
    }

    /**
     * Show the sujet export status once the user starts the download from the
     * file-sink modal (dbp-file-sink-download-started).
     */
    handleSujetDownloadStarted() {
        this.sujetFilesDownloadStarted = true;
    }

    /**
     * Get submissions from the API and collect the sujet files for the selected category and period.
     * @returns {Promise<{ name: string; url: string; }[]>} - Array of objects containing the file name and download URL for each sujet file.
     */
    async processSujetFiles() {
        console.log(
            `Downloading sujet files for category: ${this.sujetCategory}, period: ${this.sujetPeriod}`,
        );

        // Get submissions from the API
        try {
            this.submissions = await this.getSubmissions();
        } catch (error) {
            console.error('Error fetching submissions:', error);
            // Reflect the failure inline (consistent with the no-submissions /
            // no-files branches below) in addition to the toast.
            this.sujetStatusIsWarning = true;
            this.sujetStatusMessage = this._i18n.t(
                'prepare-media-transparency-report.notifications.description-api-error',
            );
            sendNotification({
                summary: this._i18n.t(
                    'prepare-media-transparency-report.notifications.title-error',
                ),
                body: this._i18n.t(
                    'prepare-media-transparency-report.notifications.description-api-error',
                ),
                type: 'danger',
                timeout: 0,
            });
            return [];
        }
        if (this.submissions.length === 0) {
            this.sujetStatusIsWarning = true;
            this.sujetStatusMessage = this._i18n.t(
                'prepare-media-transparency-report.notifications.description-no-submissions-error',
            );
            return [];
        }

        const filteredSubmissions = filterSubmissions(
            this.submissions,
            this.sujetCategory,
            this.sujetPeriod,
        );

        /** @type {DownloadableFile[]} */
        const files = [];

        // Collect sujet files and add submission ID to the file name to avoid duplicate file names
        filteredSubmissions.forEach((submission) => {
            const submissionId = submission.identifier;
            if (submission.submittedFiles.length > 0) {
                submission.submittedFiles.forEach((file) => {
                    const fileUrl = file.downloadUrl;
                    const fileName = file.fileName;
                    const safeFileName = deduplicateFileName(fileName, submissionId);

                    files.push({name: safeFileName, url: fileUrl});
                });
            }
        });
        console.log(`Files to download:`, files);

        if (files.length === 0) {
            const categoryLabel =
                getReportingCategoryItems(this._i18n)[this.sujetCategory] || this.sujetCategory;
            this.sujetStatusIsWarning = true;
            this.sujetStatusMessage = this._i18n.t(
                'prepare-media-transparency-report.notifications.description-no-files-error',
                {
                    period: this.sujetPeriod,
                    category: categoryLabel,
                    interpolation: {escapeValue: false},
                },
            );
        }

        return files;
    }

    /**
     * Return all submissions for the specified formIdentifier from the API.
     * @returns {Promise<Submission[]>}
     */
    async getSubmissions() {
        const options = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/ld+json',
                Authorization: 'Bearer ' + this.auth.token,
            },
        };

        try {
            const response = await fetch(
                `${this.entryPointUrl}/formalize/submissions?formIdentifier=${this.formIdentifier}&perPage=100000`,
                options,
            );
            if (!response.ok) {
                throw new Error(
                    `Failed to fetch submissions: ${response.status} ${response.statusText}`,
                );
            }

            const responseBody = await response.json();
            if (
                responseBody !== undefined &&
                responseBody['hydra:member'] &&
                responseBody['hydra:member'].length > 0
            ) {
                return responseBody['hydra:member'];
            }

            return [];
        } catch (error) {
            console.error('Error fetching submissions:', error);
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to fetch submissions: ${message}`, {cause: error});
        }
    }

    /* 2. IMPORT RTR CSV FILE */

    /**
     * Open the file source dialog to allow the user to select a CSV file for import.
     */
    async openFileSourceToImportCSV() {
        const importButton = this.importCSVButtonRef.value;
        if (importButton) {
            importButton.spinner = true;
        }
        const fileSource = this.csvImportFileSourceRef.value;
        if (fileSource) {
            fileSource.setAttribute('dialog-open', '');
        }
    }

    _onFileSourceDialogClosed() {
        const importButton = this.importCSVButtonRef.value;
        if (importButton) {
            importButton.spinner = false;
            importButton.stop();
        }
    }

    /**
     * Handle the event when a CSV file is selected for import, and enrich the report with sujet links from the imported CSV.
     * @param {CustomEvent} event
     */
    async handleCSVImportFileSelected(event) {
        const importButton = this.importCSVButtonRef.value;

        this.importedRTRCSVFile = event.detail.file;

        await this.enrichReportWithSujetLinks(this.importedRTRCSVFile);

        if (importButton) {
            importButton.spinner = false;
            importButton.stop();
        }
    }

    /**
     * Parse the uploaded CSV file from RTR and return the parsed data as an array of objects.
     * @param {File} file - uploaded CSV file from RTR
     * @returns {Promise<Array<RTRCsvRow>>} - parsed CSV data as an array of objects
     */
    async parseCSVFile(file) {
        const csvContent = await file.text();
        return parseCsvContent(csvContent);
    }

    /**
     * Build a single CSV row object for a submission, looking up its RTR sujet
     * link. Increments missingSujetLinksCount when no link is found.
     * @param {Submission} submission
     * @param {Map<string, string>} rtrUrlBySubmissionId
     * @returns {Record<string, string>}
     */
    buildReportRow(submission, rtrUrlBySubmissionId) {
        const dataFeedElement = parseSubmissionData(submission);
        const rtrUrl = rtrUrlBySubmissionId.get(submission.identifier);
        if (!rtrUrl) {
            this.missingSujetLinksCount++;
            console.warn(
                `No RTR URL found for submission ID: ${submission.identifier}, skipping entry.`,
            );
        }
        return buildCsvRow(dataFeedElement, rtrUrl, submission.identifier);
    }

    /**
     * Reset the report status state used by the inline report status block.
     */
    resetReportStatus() {
        this.csvFilesToExport = [];
        this.hasReportToExport = false;
        this.reportIsComplete = false;
        this.parsedCSVRowCount = 0;
        this.filteredSubmissionCount = 0;
        this.missingSujetLinksCount = 0;
    }

    /**
     * Enrich the report with sujet links from the imported CSV file.
     * @param {File|null} file
     */
    async enrichReportWithSujetLinks(file) {
        // Reset the report status so stale results are not shown if this run fails
        // or yields no submissions for the current selection.
        this.resetReportStatus();

        if (!file) {
            this.importedRTRCSVFile = null;
            return;
        }

        // fileName, RTR_URL, fileType, fileSize, datePeriod, uploadDate, referenceNumber
        /** @type {Array<RTRCsvRow>} */
        let parsedRTRCSV;
        try {
            parsedRTRCSV = await this.parseCSVFile(file);
        } catch (error) {
            console.error('Error parsing CSV file:', error);
            let errorBody;
            if (error instanceof Error && error.message === 'description-csv-parse-error') {
                errorBody = this._i18n.t(
                    'prepare-media-transparency-report.notifications.description-csv-parse-error',
                );
            } else if (error instanceof Error && error.message === 'description-csv-header-error') {
                errorBody = this._i18n.t(
                    'prepare-media-transparency-report.notifications.description-csv-header-error',
                );
            } else {
                errorBody = this._i18n.t(
                    'prepare-media-transparency-report.notifications.description-api-error',
                );
            }
            sendNotification({
                summary: this._i18n.t(
                    'prepare-media-transparency-report.notifications.title-error',
                ),
                body: errorBody,
                type: 'danger',
                timeout: 0,
            });
            return;
        }
        this.parsedCSVRowCount = parsedRTRCSV.length;
        console.log(`Parsed ${this.parsedCSVRowCount} rows from the imported CSV file.`);

        // Build lookup Map: submissionId -> RTR URL from imported CSV.
        const rtrUrlBySubmissionId = buildSujetLinkLookup(parsedRTRCSV);

        // Get submissions from the API.
        this.submissions = [];
        try {
            this.submissions = await this.getSubmissions();
        } catch (error) {
            console.error('Error fetching submissions:', error);
            sendNotification({
                summary: this._i18n.t(
                    'prepare-media-transparency-report.notifications.title-error',
                ),
                body: this._i18n.t(
                    'prepare-media-transparency-report.notifications.description-api-error',
                ),
                type: 'danger',
                timeout: 0,
            });
            return;
        }

        // Filter submissions by the report section's category and period.
        const filteredSubmissions = filterSubmissions(
            this.submissions,
            this.reportCategory,
            this.reportPeriod,
        );
        this.filteredSubmissionCount = filteredSubmissions.length;

        if (this.filteredSubmissionCount === 0) {
            // No submissions for the current selection. Reflect this in the inline
            // report status only (no toast) and disable the export.
            this.csvFilesToExport = [];
            this.hasReportToExport = false;
            this.reportIsComplete = false;
            return;
        }

        // Group submissions by their category and build one CSV per category.
        // When a single category is selected there will be just one group; when
        // "_all" is selected there will be one group per category.
        /** @type {Map<string, Submission[]>} */
        const submissionsByCategory = new Map();
        for (const submission of filteredSubmissions) {
            const dataFeedElement = parseSubmissionData(submission);
            // category is a required field on the submission form, so it is always present.
            const category = dataFeedElement.category;
            if (!submissionsByCategory.has(category)) {
                submissionsByCategory.set(category, []);
            }
            submissionsByCategory.get(category).push(submission);
        }

        this.csvFilesToExport = [];
        for (const [category, submissions] of submissionsByCategory) {
            const csv = Papa.unparse(
                submissions.map((submission) =>
                    this.buildReportRow(submission, rtrUrlBySubmissionId),
                ),
            );
            this.csvFilesToExport.push({category, csv});
        }
        this.hasReportToExport = this.csvFilesToExport.length > 0;
        // The report is "complete" when every matching submission got a sujet link.
        this.reportIsComplete = this.hasReportToExport && this.missingSujetLinksCount === 0;
        console.log('CSV files to export:', this.csvFilesToExport);
    }

    /* 3. EXPORT REPORT CSV */

    handleExportReportAsCSV() {
        const button = this.exportCSVButtonRef.value;
        if (button) {
            button.spinner = true;
        }

        try {
            this.exportReportAsCSV();
        } finally {
            if (button) {
                button.spinner = false;
                button.stop();
            }
        }
    }

    /**
     * Exports the report as a CSV file
     * @returns {void}
     */
    exportReportAsCSV() {
        if (!this.hasReportToExport) {
            sendNotification({
                summary: this._i18n.t(
                    'prepare-media-transparency-report.notifications.title-warning',
                ),
                body: this._i18n.t(
                    'prepare-media-transparency-report.notifications.description-no-csv-to-export-error',
                ),
                type: 'warning',
                timeout: 0,
            });
            return;
        }

        // One CSV file per category. When there is more than one file the
        // file-sink auto-zips them into a single archive for download.
        /** @type {File[]} */
        const csvFiles = this.csvFilesToExport.map((entry) => {
            const baseName = buildExportBaseName(
                'media-transparency-report',
                entry.category,
                this.reportPeriod,
            );
            return new File([entry.csv], `${baseName}.csv`, {type: 'text/csv'});
        });

        // Assigning the files opens the file-sink modal.
        if (this.csvExportSinkRef.value) {
            this.csvExportSinkRef.value.files = csvFiles;
        } else {
            console.error('CSV export file-sink reference is not available.');
            sendNotification({
                summary: this._i18n.t(
                    'prepare-media-transparency-report.notifications.title-error',
                ),
                body: this._i18n.t(
                    'prepare-media-transparency-report.notifications.description-api-error',
                ),
                type: 'danger',
                timeout: 0,
            });
        }
    }

    /**
     * Notify the user about the export outcome. Fired when the user starts the
     * download from the file-sink modal (dbp-file-sink-download-started).
     */
    handleExportDownloadStarted() {
        if (this.missingSujetLinksCount === 0) {
            sendNotification({
                summary: this._i18n.t(
                    'prepare-media-transparency-report.notifications.title-success',
                ),
                body: this._i18n.t(
                    'prepare-media-transparency-report.notifications.description-export-success',
                    {
                        filteredSubmissionCount: this.filteredSubmissionCount,
                        interpolation: {escapeValue: false},
                    },
                ),
                type: 'success',
                timeout: 5,
            });
        } else {
            sendNotification({
                summary: this._i18n.t(
                    'prepare-media-transparency-report.notifications.title-warning',
                ),
                body: this._i18n.t(
                    'prepare-media-transparency-report.notifications.description-export-partial-success',
                    {
                        filteredSubmissionCount: this.filteredSubmissionCount,
                        missingSujetLinksCount: this.missingSujetLinksCount,
                        interpolation: {escapeValue: false},
                    },
                ),
                type: 'warning',
                timeout: 0,
            });
        }
    }

    /**
     * Handle the login click event
     * @param {Event} e
     */
    _onLoginClicked(e) {
        this.sendSetPropertyEvent('requested-login-status', 'logged-in');
        e.preventDefault();
    }

    static get styles() {
        // language=css
        return css`
            ${commonStyles.getThemeCSS()}
            ${commonStyles.getGeneralCSS(false)}
            ${commonStyles.getNotificationCSS()}

            * {
                box-sizing: border-box;
            }

            .hidden {
                display: none !important;
            }

            .login-warning-container {
                display: flex;
                align-items: center;
                gap: 0.5em;
                border: 1px solid var(--dbp-content);
                padding: 1.25rem 2.5rem 1.25rem 1.5rem;
            }

            .login-warning-container dbp-icon {
                font-size: 1.5em;
                color: var(--dbp-danger);
                top: initial;
            }

            section {
                margin-bottom: 1em;
            }

            label {
                font-weight: 400;
            }

            fieldset {
                margin-bottom: 4em;
                padding: 1em;
            }

            legend {
                margin: -0.25em 0 0 0;
            }

            legend .legend-title {
                font-size: 1.25em;
                margin: 0;
            }

            section p {
                margin-top: 0;
                margin-bottom: 0.75em;
            }

            .section-title {
                border-left: 3px solid var(--dbp-primary);
                padding-left: 0.5em;
                margin-bottom: 0.5em;
            }

            .login-warning-container a,
            .section-description a {
                text-decoration: underline;
                text-underline-offset: 2px;
                transition: text-underline-offset 0.1s ease-in;
            }

            .login-warning-container a:hover,
            .section-description a:hover {
                text-underline-offset: 1px;
            }

            .report-period-section {
                margin-bottom: 1.5em;
            }

            ul.instructions-list {
                margin: 1.5em 0;
                line-height: 1.5em;
            }

            .selector-container-wrapper {
                display: flex;
                gap: 2em;
                flex-wrap: wrap;
                margin-top: 1em;
            }

            .selector-container {
                display: flex;
                gap: 1em;
                justify-content: center;
                align-items: center;
            }

            select.category-selector {
                background-size: 0.75em;
                height: 2em;
                width: 7em;
                padding: 0 1.5em 0 0.5em;
            }

            .button-container {
                display: flex;
                gap: 1em;
            }

            .button-container--download-sujet {
                justify-content: flex-start;
                flex-wrap: wrap;
                align-items: flex-start;
                flex-direction: column;
            }

            .export-sujet-status {
                width: 100%;
                display: flex;
                justify-content: flex-start;
                align-items: center;
            }

            .button-container.button-container--export-csv {
                flex-direction: column;
                align-items: flex-start;
                justify-content: center;
            }

            .report-status {
                width: 100%;
                display: flex;
                flex-direction: column;
                justify-content: flex-start;
                align-items: flex-start;
                gap: 0.25em;
            }

            .report-status-line {
                display: flex;
                align-items: center;
                gap: 0.5em;
            }

            .report-status dbp-icon {
                top: initial;
            }

            /* buttons */
            dbp-button dbp-icon {
                margin-right: 0.5em;
                transition: transform 0.1s ease-in;
            }

            dbp-button:hover dbp-icon {
                transform: scale(1.2);
            }

            dbp-button[disabled]:hover dbp-icon {
                transform: none;
            }

            a[target='_blank']::after {
                content: '';
                display: inline-block;
                vertical-align: text-top;
                font-size: 1em;
                height: 0.75em;
                width: 0.75em;
                background-color: currentColor;
                mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' version='1.1' viewBox='0 0 512 512' width='16' height='16'%3E%3Cpath d='M 304.5,-0.5 C 366.5,-0.5 428.5,-0.5 490.5,-0.5C 501.167,2.83333 508.167,9.83333 511.5,20.5C 511.5,82.5 511.5,144.5 511.5,206.5C 501.584,227.306 486.251,232.472 465.5,222C 460.347,217.523 456.847,212.023 455,205.5C 454.667,169.833 454.333,134.167 454,98.5C 375.5,177 297,255.5 218.5,334C 206.598,343.031 194.265,343.697 181.5,336C 167.479,322.809 165.979,308.309 177,292.5C 255.5,214 334,135.5 412.5,57C 376.833,56.6667 341.167,56.3333 305.5,56C 288.961,50.441 281.795,38.941 284,21.5C 287.259,10.7444 294.092,3.41106 304.5,-0.5 Z'/%3E%3Cpath d='M 382.5,511.5 C 278.833,511.5 175.167,511.5 71.5,511.5C 32.4961,502.496 8.49613,478.496 -0.5,439.5C -0.5,335.833 -0.5,232.167 -0.5,128.5C 6.92037,93.5765 27.587,70.4099 61.5,59C 68.0469,57.2228 74.7136,56.2228 81.5,56C 121.167,55.3333 160.833,55.3333 200.5,56C 216.888,58.5531 225.888,68.0531 227.5,84.5C 227.125,99.3742 219.792,108.874 205.5,113C 164.167,113.333 122.833,113.667 81.5,114C 67.559,116.941 59.3923,125.441 57,139.5C 56.3333,235.833 56.3333,332.167 57,428.5C 59.5,443 68,451.5 82.5,454C 178.833,454.667 275.167,454.667 371.5,454C 385.559,451.608 394.059,443.441 397,429.5C 397.333,388.167 397.667,346.833 398,305.5C 403.567,288.95 415.067,281.783 432.5,284C 445.306,287.806 452.806,296.306 455,309.5C 455.667,349.833 455.667,390.167 455,430.5C 451.897,466.246 434.064,491.413 401.5,506C 395.165,508.289 388.831,510.123 382.5,511.5 Z'/%3E%3C/svg%3E%0A");
                mask-repeat: no-repeat;
                mask-size: contain;
            }

            @media screen and (max-width: 480px) {
                .selector-container-wrapper {
                    flex-wrap: wrap;
                }

                .selector-container label {
                    width: 4em;
                }

                ul.instructions-list {
                    padding-left: 1.25em;
                }
            }
        `;
    }

    /**
     * Handle a category change for the given section. Each section keeps its own
     * selected category, so changing one section's selector does not affect the
     * other.
     * @param {'download'|'report'} section
     * @param {string} value
     */
    async onCategoryChange(section, value) {
        if (section === 'report') {
            this.reportCategory = value;
            if (this.importedRTRCSVFile) {
                await this.enrichReportWithSujetLinks(this.importedRTRCSVFile);
            }
        } else {
            this.sujetCategory = value;
        }
    }

    /**
     * Handle a period change for the given section.
     * @param {'download'|'report'} section
     * @param {string} value
     */
    async onPeriodChange(section, value) {
        if (section === 'report') {
            this.reportPeriod = value;
            if (this.importedRTRCSVFile) {
                await this.enrichReportWithSujetLinks(this.importedRTRCSVFile);
            }
        } else {
            this.sujetPeriod = value;
        }
    }

    /**
     * Render the category and period selectors for one section of the page. Each
     * section keeps its own selected category/period, so changing one section's
     * selectors does not affect the other.
     * @param {'download'|'report'} section - The section the selectors belong to.
     * @returns {import('lit').TemplateResult} - The rendered HTML template for the category and period selectors.
     */
    renderCategoryAndPeriodSelectors(section) {
        const i18n = this._i18n;
        const selectedCategory = section === 'report' ? this.reportCategory : this.sujetCategory;
        const selectedPeriod = section === 'report' ? this.reportPeriod : this.sujetPeriod;

        return html`
            <section class="report-period-section">
                <div class="section-description">
                    <dbp-translated subscribe="lang">
                        <div slot="en">
                            <p>Please select the category and period you would like to report.</p>
                        </div>
                        <div slot="de">
                            <p>Bitte wählen Sie die Kategorie und den Zeitraum aus.</p>
                        </div>
                    </dbp-translated>
                </div>
                <div class="selector-container-wrapper">
                    <div class="selector-container">
                        <label for="${section}-mt-category-selector">
                            ${i18n.t('prepare-media-transparency-report.dropdowns.label-category')}
                        </label>
                        <select
                            id="${section}-mt-category-selector"
                            class="category-selector category-selector--mt"
                            @change="${(/** @type {Event & {target: HTMLSelectElement}} */ e) =>
                                this.onCategoryChange(section, e.target.value)}">
                            ${Object.entries(getReportingCategoryItems(this._i18n)).map(
                                ([value, label]) => {
                                    const selected = selectedCategory === value;
                                    return html`
                                        <option value="${value}" ?selected="${selected}">
                                            ${label}
                                        </option>
                                    `;
                                },
                            )}
                        </select>
                    </div>

                    <div class="selector-container">
                        <label for="${section}-mt-deadline-period-selector">
                            ${i18n.t(
                                'prepare-media-transparency-report.dropdowns.label-deadline-period',
                            )}
                        </label>
                        <select
                            id="${section}-mt-deadline-period-selector"
                            class="category-selector category-selector--period"
                            @change="${(/** @type {Event & {target: HTMLSelectElement}} */ e) =>
                                this.onPeriodChange(section, e.target.value)}">
                            ${Object.entries(getReportingPeriodItems()).map(([value, label]) => {
                                const selected = selectedPeriod === value;
                                return html`
                                    <option value="${value}" ?selected="${selected}">
                                        ${label}
                                    </option>
                                `;
                            })}
                        </select>
                    </div>
                </div>
            </section>
        `;
    }

    /**
     * Render a single line of the report status block with a leading status icon.
     * @param {boolean} ok - whether this line represents a positive (checkmark) or negative (cross) state
     * @param {string} text - the line text
     * @returns {import('lit').TemplateResult}
     */
    renderStatusLine(ok, text) {
        return html`
            <div class="report-status-line">
                <dbp-icon
                    name="${ok ? 'checkmark-circle' : 'cross-circle'}"
                    aria-hidden="true"></dbp-icon>
                <span>${text}</span>
            </div>
        `;
    }

    /**
     * Render the sujet download status block. Shows a warning message when there
     * are no files for the current selection, or a success message once the user
     * starts the download from the file-sink modal.
     * @returns {import('lit').TemplateResult|string}
     */
    renderSujetStatus() {
        // Warning: no sujet files for the current category/period selection.
        if (this.sujetStatusIsWarning && this.sujetStatusMessage) {
            return html`
                <div class="export-sujet-status notification is-warning">
                    ${this.renderStatusLine(false, this.sujetStatusMessage)}
                </div>
            `;
        }

        // Success: the user started the download from the file-sink modal.
        if (this.sujetFilesDownloadStarted) {
            const i18n = this._i18n;
            return html`
                <div class="export-sujet-status notification is-success">
                    ${this.renderStatusLine(
                        true,
                        i18n.t('prepare-media-transparency-report.sujet-status.files-exported', {
                            count: this.sujetFilesToDownload.length,
                        }),
                    )}
                </div>
            `;
        }

        return '';
    }

    /**
     * Render the merged report status block. It reflects the current report
     * readiness for the selected category and period and updates whenever the
     * imported CSV, category or period change.
     * @returns {import('lit').TemplateResult|string}
     */
    renderReportStatus() {
        const i18n = this._i18n;

        // Nothing to show until the user imported an RTR CSV file.
        if (!this.importedRTRCSVFile) {
            return '';
        }

        // The report is ready when there is something to export and all sujet
        // links are present.
        const isSuccess = this.reportIsComplete;
        // Localized display name of the selected category (e.g. "All", "Online").
        const categoryLabel =
            getReportingCategoryItems(this._i18n)[this.reportCategory] || this.reportCategory;

        return html`
            <div
                class="report-status notification ${classMap({
                    'is-success': isSuccess,
                    'is-warning': !isSuccess,
                })}">
                ${this.renderStatusLine(
                    true,
                    i18n.t('prepare-media-transparency-report.report-status.loaded-file', {
                        fileName: this.importedRTRCSVFile.name,
                        interpolation: {escapeValue: false},
                    }),
                )}
                ${this.renderStatusLine(
                    this.parsedCSVRowCount > 0,
                    i18n.t('prepare-media-transparency-report.report-status.rows-found', {
                        count: this.parsedCSVRowCount,
                    }),
                )}
                ${this.renderStatusLine(
                    this.filteredSubmissionCount > 0,
                    i18n.t('prepare-media-transparency-report.report-status.submissions-found', {
                        count: this.filteredSubmissionCount,
                        category: categoryLabel,
                        period: this.reportPeriod,
                        interpolation: {escapeValue: false},
                    }),
                )}
                ${this.missingSujetLinksCount > 0
                    ? this.renderStatusLine(
                          false,
                          i18n.t('prepare-media-transparency-report.report-status.missing-links', {
                              count: this.missingSujetLinksCount,
                          }),
                      )
                    : ''}
                ${this.hasReportToExport
                    ? this.renderStatusLine(
                          isSuccess,
                          i18n.t('prepare-media-transparency-report.report-status.ready'),
                      )
                    : ''}
            </div>
        `;
    }

    render() {
        const i18n = this._i18n;
        // Base names (without extension) for the downloadable archives/files of
        // each section. The sujet section always produces a single ZIP; the
        // report section produces a ZIP (multiple categories) or a single CSV.
        const sujetExportBaseName = buildExportBaseName(
            'media-transparency-attachments',
            this.sujetCategory,
            this.sujetPeriod,
        );
        const reportExportBaseName = buildExportBaseName(
            'media-transparency-report',
            this.reportCategory,
            this.reportPeriod,
        );

        if (!this.isLoggedIn() && !this.isAuthPending()) {
            return html`
                <div class="notification is-warning login-warning-container">
                    <dbp-icon name="cross-circle" aria-hidden="true"></dbp-icon>
                    <span class="login-warning">
                        ${i18n.t('prepare-media-transparency-report.error-login-message')}
                    </span>
                    <a href="#" @click="${this._onLoginClicked}">
                        ${i18n.t('prepare-media-transparency-report.error-login-link')}
                    </a>
                </div>
            `;
        }

        return html`
            <!-- 0. Select Report Category and Period -->
            <fieldset>
                <legend>
                    <h2 class="legend-title">
                        ${i18n.t('prepare-media-transparency-report.section-title.download-sujet')}
                    </h2>
                </legend>

                ${this.renderCategoryAndPeriodSelectors('download')}

                <!-- 1. Download Sujet Files zip -->
                <section class="download-sujet-section">
                    <div class="section-description">
                        <dbp-translated subscribe="lang">
                            <div slot="en">
                                <ul class="instructions-list">
                                    <li>
                                        <b>Download the sujet files</b>
                                        of the selected category and reporting period
                                    </li>
                                    <li>
                                        proceed to the
                                        <a
                                            href="https://egov.rtr.gv.at/auth/realms/RTR/protocol/openid-connect/auth?state=%2Fertr%2Fmedien%2Frtr_5%2FMediendienste.de.html&redirect_uri=https%3A%2F%2Fegov.rtr.gv.at%2Fportalauth%2Fcallback&scope=openid&response_type=code&client_id=mesh-portal"
                                            target="_blank">
                                            RTR database
                                        </a>
                                        to upload those files.
                                    </li>
                                </ul>
                            </div>
                            <div slot="de">
                                <ul class="instructions-list">
                                    <li>
                                        <b>Herunterladen der sujet-Dateien</b>
                                        der ausgewählten Kategorie und des ausgewählten
                                        Berichtszeitraums
                                    </li>
                                    <li>
                                        anschließendes Hochladen in die
                                        <a
                                            href="https://egov.rtr.gv.at/auth/realms/RTR/protocol/openid-connect/auth?state=%2Fertr%2Fmedien%2Frtr_5%2FMediendienste.de.html&redirect_uri=https%3A%2F%2Fegov.rtr.gv.at%2Fportalauth%2Fcallback&scope=openid&response_type=code&client_id=mesh-portal"
                                            target="_blank">
                                            RTR-Datenbank
                                        </a>
                                        .
                                    </li>
                                </ul>
                            </div>
                        </dbp-translated>
                    </div>
                    <div class="button-container button-container--download-sujet">
                        <dbp-button
                            ${ref(this.downloadSujetButtonRef)}
                            id="download-sujet-button"
                            class="download-sujet-button"
                            @click="${() => this.handleSujetFilesDownload()}"
                            type="is-primary">
                            <dbp-icon name="download" aria-hidden="true"></dbp-icon>
                            ${i18n.t(
                                'prepare-media-transparency-report.buttons.button-text-download-sujet-files',
                            )}
                        </dbp-button>
                        ${this.renderSujetStatus()}
                    </div>

                    <dbp-file-sink
                        ${ref(this.sujetExportFileSinkRef)}
                        id="file-sink"
                        class="file-sink"
                        lang="${this.lang}"
                        decompress-zip
                        streamed
                        enabled-targets="local,clipboard,nextcloud"
                        filename="${sujetExportBaseName}.zip"
                        @dbp-file-sink-download-started="${() => this.handleSujetDownloadStarted()}"
                        subscribe="nextcloud-auth-url,nextcloud-web-dav-url,nextcloud-name,nextcloud-file-url"></dbp-file-sink>
                </section>
            </fieldset>

            <!-- 2. Import RTR CSV -->
            <fieldset>
                <legend>
                    <h2 class="legend-title">
                        ${i18n.t('prepare-media-transparency-report.section-title.generate-report')}
                    </h2>
                </legend>

                ${this.renderCategoryAndPeriodSelectors('report')}

                <section class="add-sujet-link-section">
                    <div class="section-description">
                        <dbp-translated subscribe="lang">
                            <div slot="en">
                                <ul class="instructions-list">
                                    <li>
                                        After uploading the files to the RTR database, please
                                        download the CSV file with the sujet links from there.
                                    </li>
                                    <li>
                                        <b>Upload that CSV file here</b>
                                        to enrich your media transparency report with the sujet
                                        links.
                                    </li>
                                    <li>
                                        The completed report will be exported for the selected
                                        category and period as a CSV file.
                                    </li>
                                    <li>You can import it in RTR.</li>
                                </ul>
                            </div>
                            <div slot="de">
                                <ul class="instructions-list">
                                    <li>
                                        Nachdem Sie die Dateien in die RTR-Datenbank hochgeladen
                                        haben, laden Sie bitte die CSV-Datei mit den sujet-Links von
                                        dort herunter.
                                    </li>
                                    <li>
                                        <b>Verwenden Sie diese CSV-Datei hier</b>
                                        , um Ihren Bericht.
                                    </li>
                                    <li>
                                        Sie können nun den abgeschlossenen Bericht für die
                                        ausgewählte Kategorie und den Berichtszeitraum als CSV-Datei
                                        exportieren
                                    </li>
                                    <li>Sie können in die RTR-Datenbank importieren.</li>
                                </ul>
                            </div>
                        </dbp-translated>
                    </div>
                    <div class="button-container button-container--export-csv">
                        <div>
                            <dbp-button
                                ${ref(this.importCSVButtonRef)}
                                id="import-csv-button"
                                class="import-csv-button"
                                @click="${() => this.openFileSourceToImportCSV()}"
                                type="is-primary">
                                <dbp-icon name="exit-up" aria-hidden="true"></dbp-icon>
                                ${i18n.t(
                                    'prepare-media-transparency-report.buttons.button-text-import-csv',
                                )}
                            </dbp-button>

                            <dbp-button
                                ${ref(this.exportCSVButtonRef)}
                                id="export-csv-button"
                                class="export-csv-button"
                                ?disabled=${!this.hasReportToExport}
                                @click="${() => this.handleExportReportAsCSV()}"
                                type="is-secondary">
                                <dbp-icon name="download" aria-hidden="true"></dbp-icon>
                                ${i18n.t(
                                    'prepare-media-transparency-report.buttons.button-text-download-csv',
                                )}
                            </dbp-button>
                        </div>

                        ${this.renderReportStatus()}
                    </div>

                    <dbp-file-source
                        ${ref(this.csvImportFileSourceRef)}
                        id="file-source"
                        class="file-source"
                        lang="${this.lang}"
                        allowed-mime-types="text/csv"
                        max-file-size="100000"
                        number-of-files="1"
                        @dbp-file-source-file-selected="${(/** @type {CustomEvent} */ e) =>
                            this.handleCSVImportFileSelected(e)}"
                        @dbp-file-source-dialog-closed="${() => this._onFileSourceDialogClosed()}"
                        enabled-targets="local,clipboard,nextcloud"
                        subscribe="nextcloud-auth-url,nextcloud-web-dav-url,nextcloud-name,nextcloud-file-url"></dbp-file-source>

                    <dbp-file-sink
                        ${ref(this.csvExportSinkRef)}
                        id="csv-export-sink"
                        class="file-sink"
                        lang="${this.lang}"
                        enabled-targets="local,clipboard,nextcloud"
                        filename="${reportExportBaseName}.${this.csvFilesToExport.length > 1
                            ? 'zip'
                            : 'csv'}"
                        @dbp-file-sink-download-started="${() =>
                            this.handleExportDownloadStarted()}"
                        subscribe="nextcloud-auth-url,nextcloud-web-dav-url,nextcloud-name,nextcloud-file-url"></dbp-file-sink>
                </section>
            </fieldset>
        `;
    }
}

commonUtils.defineCustomElement(
    'dbp-prepare-media-transparency-report',
    DbpPrepareMediaTransparencyReport,
);
