import {createInstance} from './i18n';
import {css, html} from 'lit';
import {ScopedElementsMixin} from '@dbp-toolkit/common';
import * as commonStyles from '@dbp-toolkit/common/styles';
import {Icon, IconButton, LoadingButton, MiniSpinner, Modal} from '@dbp-toolkit/common';
import DBPLitElement from '@dbp-toolkit/common/dbp-lit-element';
import {FileSource} from '@dbp-toolkit/file-handling';
import {classMap} from 'lit/directives/class-map.js';
import {send} from '@dbp-toolkit/common/notification';
import {TabulatorTable} from '@dbp-toolkit/tabulator-table';
import {humanFileSize} from '@dbp-toolkit/common/i18next';
import {jws} from 'jsrsasign';

export class Blob extends ScopedElementsMixin(DBPLitElement) {
    constructor() {
        super();
        this._i18n = createInstance();
        this.lang = this._i18n.language;
        this.entryPointUrl = '';
        this.isFileSelected = false;
        this.fileToUpload = {};
        this.auth = {};
        this._initialFetchDone = false;
        this.loading = false;

        this.uploadedFilesNumber = 0;
        this.uploadedFiles = [];

        this.bucketId = '';
        this.prefix = '';

        this.activeFileId = '';
        this.activeFileName = '';

        this.tableInit = false;

        this.startsWith = false;
        this.noPrefix = false;
    }

    static get scopedElements() {
        return {
            'dbp-icon': Icon,
            'dbp-button': LoadingButton,
            'dbp-icon-button': IconButton,
            'dbp-file-source': FileSource,
            'dbp-modal': Modal,
            'dbp-mini-spinner': MiniSpinner,
            'dbp-tabulator-table': TabulatorTable,
        };
    }

    static get properties() {
        return {
            ...super.properties,
            lang: {type: String},
            auth: {type: Object},
            entryPointUrl: {type: String, attribute: 'entry-point-url'},
            isFileSelected: {type: Boolean, attribute: false},
            uploadedFilesNumber: {type: Number, attribute: false},
            initialRequestsLoading: {type: Boolean, attribute: false},
            tableInit: {type: Boolean, attribute: false},
            loading: {type: Boolean, attribute: false},
            fileToUpload: {type: Object, attribute: false},
            bucketId: {type: String, attribute: 'bucket-id'},
            prefix: {type: String, attribute: 'prefix'},
            startsWith: {type: String, attribute: 'prefix-starts-with'},
            noPrefix: {type: String, attribute: 'no-prefix'},
            activeFileId: {type: String, attribute: false},
            activeFileName: {type: String, attribute: false},
        };
    }

    connectedCallback() {
        super.connectedCallback();

        this.updateComplete.then(() => {
            this.setOptions();
        });

        this._loginStatus = '';
        this._loginState = [];
    }

    /**
     *  Request a re-rendering every time isLoggedIn()/isLoading() changes
     */
    _updateAuth() {
        this._loginStatus = this.auth['login-status'];

        let newLoginState = [this.isLoggedIn(), this.isLoading()];
        if (this._loginState.toString() !== newLoginState.toString()) {
            this.requestUpdate();
        }
        this._loginState = newLoginState;
    }

    update(changedProperties) {
        let toGetFiles = false;
        changedProperties.forEach((oldValue, propName) => {
            switch (propName) {
                case 'auth':
                    this._updateAuth();
                    break;
                case 'prefix':
                    if (
                        this.isLoggedIn() &&
                        !this.isLoading() &&
                        this._initialFetchDone &&
                        this.bucketId !== ''
                    ) {
                        toGetFiles = true;
                    }
                    break;
                case 'startsWith':
                    if (
                        this.isLoggedIn() &&
                        !this.isLoading() &&
                        this._initialFetchDone &&
                        this.bucketId !== ''
                    ) {
                        toGetFiles = true;
                    }
                    break;
                case 'noPrefix':
                    if (
                        this.isLoggedIn() &&
                        !this.isLoading() &&
                        this._initialFetchDone &&
                        this.bucketId !== ''
                    ) {
                        toGetFiles = true;
                    }
                    break;
                case 'bucketId':
                    if (
                        this.isLoggedIn() &&
                        !this.isLoading() &&
                        this._initialFetchDone &&
                        this.bucketId !== ''
                    ) {
                        toGetFiles = true;
                    }
                    break;
            }
        });

        if (toGetFiles) {
            this.getFiles();
        }

        super.update(changedProperties);
    }

    /**
     * Check if a person is set in or not
     * @returns {boolean}
     */
    isLoggedIn() {
        return this.auth.person !== undefined && this.auth.person !== null;
    }

    /**
     * Check if a person has successfully logged in
     * @returns {boolean}
     */
    isLoading() {
        if (this._loginStatus === 'logged-out') return false;
        return !this.isLoggedIn() && this.auth.token !== undefined;
    }

    fileSelected(event) {
        let file = event.detail.file;
        this.isFileSelected = true;
        this.fileToUpload = file;
    }

    removeFileToUpload() {
        this.fileToUpload = {};
        this.isFileSelected = false;
    }

    getFileToUploadName() {
        if (typeof this.fileToUpload.type === 'undefined') {
            return this.fileToUpload.name;
        }
        const [, fileSubType] = this.fileToUpload.type.split('/');
        return this.fileToUpload.name.replace('.' + fileSubType, '');
    }

    async uploadFile() {
        const i18n = this._i18n;

        try {
            let response = await this.sendUploadFileRequest();
            let responseBody = await response.json();
            if (responseBody !== undefined && response.status === 201) {
                send({
                    summary: i18n.t('upload-success-title'),
                    body: i18n.t('upload-success-body'),
                    type: 'success',
                    timeout: 5,
                });
            } else if (response.status === 400) {
                send({
                    summary: i18n.t('invalid-input-title'),
                    body: i18n.t('invalid-input-body'),
                    type: 'danger',
                    timeout: 5,
                });
            } else if (response.status === 403) {
                send({
                    summary: i18n.t('signature-failed-title'),
                    body: i18n.t('signature-failed-body'),
                    type: 'danger',
                    timeout: 5,
                });
            } else if (response.status === 422) {
                send({
                    summary: i18n.t('invalid-input-title'),
                    body: i18n.t('invalid-input-metadata-body'),
                    type: 'danger',
                    timeout: 5,
                });
            } else if (response.status === 507) {
                send({
                    summary: i18n.t('bucket-quota-title'),
                    body: i18n.t('bucket-quota-body'),
                    type: 'danger',
                    timeout: 5,
                });
            } else {
                send({
                    summary: i18n.t('something-went-wrong-title'),
                    body: i18n.t('something-went-wrong-body'),
                    type: 'danger',
                    timeout: 5,
                });
            }
        } finally {
            if (this._('#ask-upload-dialogue')) {
                this._('#ask-upload-dialogue').close();
            }
            this.removeFileToUpload();
            await this.getFiles();
        }
    }

    async sendUploadFileRequest() {
        let params = {
            bucketID: this.bucketId,
            creationTime: Math.floor(new Date().valueOf() / 1000),
            prefix: this.prefix,
            method: 'POST',
        };

        let name = this.activeFileName;
        let retentionDuration = false;
        let additionalMetadata = false;
        if (this._('#to-upload-file-name-input')) {
            name = this._('#to-upload-file-name-input').value;
        }
        if (this._('#to-valid-until')) {
            retentionDuration = this._('#to-valid-until').value;
        }
        if (this._('#to-add-metadata')) {
            additionalMetadata = this._('#to-add-metadata').value;
        }
        name = encodeURIComponent(name);
        retentionDuration = encodeURIComponent(retentionDuration);
        additionalMetadata = encodeURIComponent(additionalMetadata);
        let fileHash = await this.sha256(await this.fileToUpload.arrayBuffer());
        params.fileName = name;
        params.fileHash = fileHash;
        if (retentionDuration) {
            params.retentionDuration = retentionDuration;
        }

        let formData = new FormData();
        formData.append('file', this.fileToUpload);
        if (additionalMetadata) {
            params.additionalMetadata = additionalMetadata;
            formData.append('additionalMetadata', additionalMetadata);
        }

        let formDataAsJson = {};
        formData.forEach((value, key) => {
            if (key != 'file') {
                formDataAsJson[key] = value;
            }
        });
        formDataAsJson = JSON.stringify(formDataAsJson);

        params = {
            ucs: await this.createSha256HexForString('/blob/files?' + new URLSearchParams(params)),
            bcs: await this.createSha256HexForString(formDataAsJson),
        };

        const sig = this.createSignature(params);

        params = {
            bucketID: this.bucketId,
            creationTime: Math.floor(new Date().valueOf() / 1000),
            prefix: this.prefix,
            method: 'POST',
            fileName: name,
            fileHash: fileHash,
        };

        if (retentionDuration) {
            params.retentionDuration = retentionDuration;
        }
        if (additionalMetadata) {
            params.additionalMetadata = additionalMetadata;
        }

        params.sig = sig;

        const urlParams = new URLSearchParams(params);

        const options = {
            method: 'POST',
            body: formData,
        };
        return await this.httpGetAsync(this.entryPointUrl + '/blob/files?' + urlParams, options);
    }

    async getFiles() {
        this.initialRequestsLoading = !this._initialFetchDone;
        this.loading = true;

        try {
            let response = await this.sendGetFilesRequest();
            let responseBody = await response.json();

            if (responseBody !== undefined && response.status === 200) {
                this.uploadedFiles = responseBody['hydra:member'];
                this.uploadedFilesNumber = this.uploadedFiles.length;
            }
        } finally {
            this.fileToUpload = {};
            this.isFileSelected = false;
            this.initialRequestsLoading = false;
            this._initialFetchDone = true;
            await this.setData();
            this.loading = false;
        }
    }

    async sendGetFilesRequest() {
        let params = {
            bucketID: this.bucketId,
            creationTime: Math.floor(new Date().valueOf() / 1000),
            prefix: this.prefix,
            includeData: 1,
            method: 'GET',
        };

        if (this.startsWith == 'true') {
            params['startsWith'] = 1;
        }
        if (this.noPrefix == 'true') {
            params['prefix'] = '';
        }

        params = {
            ucs: await this.createSha256HexForString('/blob/files?' + new URLSearchParams(params)),
        };

        const sig = this.createSignature(params);

        params = {
            bucketID: this.bucketId,
            creationTime: Math.floor(new Date().valueOf() / 1000),
            prefix: this.prefix,
            includeData: 1,
            method: 'GET',
        };

        if (this.startsWith == 'true') {
            params['startsWith'] = 1;
        }
        if (this.noPrefix == 'true') {
            params['prefix'] = '';
        }

        params['sig'] = sig;

        const urlParams = new URLSearchParams(params);

        const options = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/ld+json',
            },
        };
        return await this.httpGetAsync(this.entryPointUrl + '/blob/files?' + urlParams, options);
    }

    async sendPutFile() {
        this.loading = true;
        const i18n = this._i18n;

        try {
            let response = await this.sendPutFileRequest();
            let responseBody = await response.json();
            if (responseBody !== undefined && response.status === 200) {
                send({
                    summary: i18n.t('rename-success-title'),
                    body: i18n.t('rename-success-body'),
                    type: 'success',
                    timeout: 5,
                });
            } else if (response.status === 404) {
                send({
                    summary: i18n.t('file-not-found-title'),
                    body: i18n.t('file-not-found-body'),
                    type: 'danger',
                    timeout: 5,
                });
            } else if (response.status === 400) {
                send({
                    summary: i18n.t('invalid-input-title'),
                    body: i18n.t('invalid-input-metadata-body'),
                    type: 'danger',
                    timeout: 5,
                });
            } else if (response.status === 422) {
                send({
                    summary: i18n.t('invalid-input-title'),
                    body: i18n.t('invalid-input-body'),
                    type: 'danger',
                    timeout: 5,
                });
            } else {
                send({
                    summary: i18n.t('something-went-wrong-title'),
                    body: i18n.t('something-went-wrong-body'),
                    type: 'danger',
                    timeout: 5,
                });
            }
        } finally {
            this.closeEditFileDialogue();
            await this.getFiles();
        }
    }

    async sendPutFileRequest() {
        let now = Math.floor(new Date().valueOf() / 1000);
        let params = {
            bucketID: this.bucketId,
            creationTime: now,
            prefix: this.prefix,
            method: 'PUT',
        };

        let name = this.activeFileName;
        if (this._('#to-rename-file-name-input')) {
            name = this._('#to-rename-file-name-input').value;
        }

        let data = {fileName: name};

        params.fileName = name;

        let body = JSON.stringify(data);

        params = {
            ucs: await this.createSha256HexForString(
                '/blob/files/' + this.activeFileId + '?' + new URLSearchParams(params),
            ),
            bcs: await this.createSha256HexForString(body),
        };

        const sig = this.createSignature(params);

        params = {
            bucketID: this.bucketId,
            creationTime: now,
            prefix: this.prefix,
            method: 'PUT',
            fileName: name,
            sig: sig,
        };

        const urlParams = new URLSearchParams(params);

        const options = {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/ld+json',
            },
            body: body,
        };
        return await this.httpGetAsync(
            this.entryPointUrl + '/blob/files/' + this.activeFileId + '?' + urlParams,
            options,
        );
    }

    async sendGETFile(id, includeData = 0) {
        this.loading = true;
        const i18n = this._i18n;

        try {
            let response = await this.sendGETFileRequest(id, includeData);
            let responseBody = undefined;
            if (!response.redirected) {
                responseBody = await response.json();
            }

            if (responseBody !== undefined && response.status === 200) {
                send({
                    summary: i18n.t('getone-success-title'),
                    body: i18n.t('getone-success-body'),
                    type: 'success',
                    timeout: 5,
                });
            } else if (
                responseBody == undefined &&
                response.status === 200 &&
                response.redirected
            ) {
                send({
                    summary: i18n.t('getone-success-title'),
                    body: i18n.t('getone-success-body'),
                    type: 'success',
                    timeout: 5,
                });
            } else if (response.status === 404) {
                send({
                    summary: i18n.t('file-not-found-title'),
                    body: i18n.t('file-not-found-body'),
                    type: 'danger',
                    timeout: 5,
                });
            } else if (response.status === 400) {
                send({
                    summary: i18n.t('invalid-input-title'),
                    body: i18n.t('invalid-input-metadata-body'),
                    type: 'danger',
                    timeout: 5,
                });
            } else if (response.status === 422) {
                send({
                    summary: i18n.t('invalid-input-title'),
                    body: i18n.t('invalid-input-body'),
                    type: 'danger',
                    timeout: 5,
                });
            } else {
                send({
                    summary: i18n.t('something-went-wrong-title'),
                    body: i18n.t('something-went-wrong-body'),
                    type: 'danger',
                    timeout: 5,
                });
            }

            return responseBody;
        } finally {
            await this.getFiles();
        }
    }

    async sendGETFileRequest(id, includeData = 0, returnAsString = 0) {
        let now = Math.floor(new Date().valueOf() / 1000);
        let params = {};

        // if includeData == 1, request base64 encoded file immediately
        if (includeData == 1) {
            params = {
                bucketID: this.bucketId,
                creationTime: now,
                includeData: 1,
                method: 'GET',
            };
        }
        // else get metadata
        else {
            params = {
                bucketID: this.bucketId,
                creationTime: now,
                method: 'GET',
            };
        }

        params = {
            ucs: await this.createSha256HexForString(
                '/blob/files/' + id + '?' + new URLSearchParams(params),
            ),
        };

        const sig = this.createSignature(params);

        // if includeData == 1, request base64 encoded file immediately
        if (includeData == 1) {
            params = {
                bucketID: this.bucketId,
                creationTime: now,
                includeData: 1,
                method: 'GET',
                sig: sig,
            };
        }
        // else get metadata
        else {
            params = {
                bucketID: this.bucketId,
                creationTime: now,
                method: 'GET',
                sig: sig,
            };
        }

        const urlParams = new URLSearchParams(params);

        const options = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/ld+json',
            },
        };
        if (returnAsString == 1) {
            return this.entryPointUrl + '/blob/files/' + id + '?' + urlParams;
        } else {
            return await this.httpGetAsync(
                this.entryPointUrl + '/blob/files/' + id + '?' + urlParams,
                options,
            );
        }
    }

    async sendDownloadFile(id) {
        this.loading = true;
        const i18n = this._i18n;

        try {
            let response = await this.sendDownloadFileRequest(id);

            if (response !== undefined && response.status === 200) {
                send({
                    summary: i18n.t('getone-success-title'),
                    body: i18n.t('getone-success-body'),
                    type: 'success',
                    timeout: 5,
                });
            } else if (response == undefined && response.status === 200 && response.redirected) {
                send({
                    summary: i18n.t('getone-success-title'),
                    body: i18n.t('getone-success-body'),
                    type: 'success',
                    timeout: 5,
                });
            } else if (response.status === 404) {
                send({
                    summary: i18n.t('file-not-found-title'),
                    body: i18n.t('file-not-found-body'),
                    type: 'danger',
                    timeout: 5,
                });
            } else if (response.status === 400) {
                send({
                    summary: i18n.t('invalid-input-title'),
                    body: i18n.t('invalid-input-metadata-body'),
                    type: 'danger',
                    timeout: 5,
                });
            } else if (response.status === 422) {
                send({
                    summary: i18n.t('invalid-input-title'),
                    body: i18n.t('invalid-input-body'),
                    type: 'danger',
                    timeout: 5,
                });
            } else {
                send({
                    summary: i18n.t('something-went-wrong-title'),
                    body: i18n.t('something-went-wrong-body'),
                    type: 'danger',
                    timeout: 5,
                });
            }

            return response;
        } finally {
            await this.getFiles();
        }
    }

    async sendDownloadFileRequest(id) {
        let now = Math.floor(new Date().valueOf() / 1000);
        let params = {};

        params = {
            bucketID: this.bucketId,
            creationTime: now,
            method: 'GET',
        };

        params = {
            ucs: await this.createSha256HexForString(
                '/blob/files/' + id + '/download?' + new URLSearchParams(params),
            ),
        };

        const sig = this.createSignature(params);

        params = {
            bucketID: this.bucketId,
            creationTime: now,
            method: 'GET',
            sig: sig,
        };

        const urlParams = new URLSearchParams(params);

        const options = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/ld+json',
            },
        };

        return await this.httpGetAsync(
            this.entryPointUrl + '/blob/files/' + id + '/download?' + urlParams,
            options,
        );
    }

    openDeleteFileDialogue(id, fileName) {
        this.activeFileId = id;
        this.activeFileName = fileName;
        if (this._('#ask-delete-dialogue')) {
            this._('#ask-delete-dialogue').open();
        }
    }

    closeDeleteFileDialogue() {
        this.activeFileId = '';
        this.activeFileName = '';
        if (this._('#ask-delete-dialogue')) {
            this._('#ask-delete-dialogue').close();
        }
    }

    openEditFileDialogue(id, fileName) {
        this.activeFileId = id;
        this.activeFileName = fileName;
        if (this._('#edit-dialogue')) {
            this._('#edit-dialogue').open();
        }
        if (this._('#to-rename-file-name-input')) {
            this._('#to-rename-file-name-input').value = fileName;
        }
    }

    closeEditFileDialogue() {
        this.activeFileId = '';
        this.activeFileName = '';
        if (this._('#edit-dialogue')) {
            this._('#edit-dialogue').close();
        }
    }

    openDeleteAllDialogue(id, fileName) {
        this.activeFileId = id;
        this.activeFileName = fileName;
        if (this._('#ask-delete-all-dialogue')) {
            this._('#ask-delete-all-dialogue').open();
        }
    }

    closeDeleteAllDialogue() {
        this.activeFileId = '';
        this.activeFileName = '';
        if (this._('#ask-delete-all-dialogue')) {
            this._('#ask-delete-all-dialogue').close();
        }
    }

    async deleteFile(id) {
        this.loading = true;
        const i18n = this._i18n;

        this.closeDeleteFileDialogue();
        try {
            let response = await this.sendDeleteFileRequest(id);
            if (response.status === 204) {
                send({
                    summary: i18n.t('delete-success-title'),
                    body: i18n.t('delete-success-body'),
                    type: 'success',
                    timeout: 5,
                });
            } else if (response.status === 404) {
                send({
                    summary: i18n.t('delete-missing-title'),
                    body: i18n.t('delete-missing-body'),
                    type: 'warning',
                    timeout: 5,
                });
            } else {
                send({
                    summary: i18n.t('something-went-wrong-title'),
                    body: i18n.t('something-went-wrong-body'),
                    type: 'danger',
                    timeout: 5,
                });
            }
        } finally {
            await this.getFiles();
        }
    }

    async sendDeleteFileRequest(id) {
        let creationtime = Math.floor(new Date().valueOf() / 1000);
        let params = {
            bucketID: this.bucketId,
            creationTime: creationtime,
            prefix: this.prefix,
            method: 'DELETE',
        };

        params = {
            ucs: await this.createSha256HexForString(
                '/blob/files/' + id + '?' + new URLSearchParams(params),
            ),
        };

        const sig = this.createSignature(params);

        params = {
            bucketID: this.bucketId,
            creationTime: creationtime,
            prefix: this.prefix,
            method: 'DELETE',
            sig: sig,
        };

        const urlParams = new URLSearchParams(params);

        const options = {
            method: 'DELETE',
        };
        return await this.httpGetAsync(
            this.entryPointUrl + '/blob/files/' + id + '?' + urlParams,
            options,
        );
    }

    async sendDeletePrefixRequest() {
        let creationtime = Math.floor(new Date().valueOf() / 1000);

        this.closeDeleteAllDialogue();
        let params = {
            bucketID: this.bucketId,
            creationTime: creationtime,
            prefix: this.prefix,
            method: 'DELETE',
        };

        if (this.startsWith == 'true') {
            params['startsWith'] = 1;
        }
        if (this.noPrefix == 'true') {
            params['prefix'] = '';
        }

        params = {
            ucs: await this.createSha256HexForString('/blob/files?' + new URLSearchParams(params)),
        };

        const sig = this.createSignature(params);

        params = {
            bucketID: this.bucketId,
            creationTime: creationtime,
            prefix: this.prefix,
            method: 'DELETE',
        };

        if (this.startsWith == 'true') {
            params['startsWith'] = 1;
        }
        if (this.noPrefix == 'true') {
            params['prefix'] = '';
        }

        params['sig'] = sig;

        const urlParams = new URLSearchParams(params);

        const options = {
            method: 'DELETE',
        };
        return await this.httpGetAsync(this.entryPointUrl + '/blob/files?' + urlParams, options);
    }

    /**
     * Send a fetch to given url with given options
     * @param {string} url
     * @param {object} options
     * @returns {object} response (error or result)
     */
    async httpGetAsync(url, options) {
        return await fetch(url, options)
            .then((result) => {
                if (!result.ok) throw result;
                return result;
            })
            .catch((error) => {
                return error;
            });
    }

    async getOptions() {
        const i18n = this._i18n;

        const actionsButtons = (cell, formatterParams) => {
            let id = cell.getData()['identifier'];
            let fileName = cell.getData()['fileName'];
            let contentUrl = cell.getData()['contentUrl'];

            let link = this.createScopedElement('a');
            link.setAttribute('href', contentUrl);
            link.setAttribute('download', fileName);
            link.setAttribute('title', i18n.t('open-file'));
            link.setAttribute('target', '_blank');

            let btnLink = this.createScopedElement('dbp-icon-button');
            btnLink.setAttribute('icon-name', 'link');
            btnLink.setAttribute('title', i18n.t('open'));
            btnLink.setAttribute('target', '_blank');
            btnLink.addEventListener('click', (event) => {
                this.sendGETFile(id, 0);
                event.stopPropagation();
            });

            let btnBinary = this.createScopedElement('dbp-icon-button');
            btnBinary.setAttribute('icon-name', 'download');
            btnBinary.setAttribute('title', 'Download');
            btnBinary.addEventListener('click', (event) => {
                this.sendGETFile(id, 1).then((body) => {
                    // download file using hidden a tag
                    let hiddenA = this.createScopedElement('a');
                    hiddenA.setAttribute('href', body['contentUrl']);
                    hiddenA.setAttribute('download', body['fileName']);
                    hiddenA.setAttribute('target', '_blank');
                    hiddenA.click();
                });
                event.stopPropagation();
            });

            let btnDownload = this.createScopedElement('dbp-icon-button');
            btnDownload.setAttribute('icon-name', 'exit-down');
            btnDownload.setAttribute('title', '/download');
            btnDownload.addEventListener('click', (event) => {
                this.sendDownloadFile(id).then((response) => {
                    if (response == undefined) {
                        console.error('Response is undefined');
                        return;
                    }
                    response.blob().then((blob) => {
                        const objUrl = URL.createObjectURL(blob);
                        // download file using hidden a tag
                        let hiddenA = this.createScopedElement('a');
                        hiddenA.setAttribute('href', objUrl);
                        hiddenA.setAttribute('download', fileName);
                        hiddenA.setAttribute('target', '_blank');
                        hiddenA.click();
                        URL.revokeObjectURL(objUrl);
                    });
                });
                event.stopPropagation();
            });

            //link.appendChild(btnBinary);

            let btnEdit = this.createScopedElement('dbp-icon-button');
            btnEdit.setAttribute('icon-name', 'pencil');
            btnEdit.setAttribute('title', i18n.t('edit'));
            btnEdit.addEventListener('click', (event) => {
                this.openEditFileDialogue(id, fileName);
                event.stopPropagation();
            });

            let btnDelete = this.createScopedElement('dbp-icon-button');
            btnDelete.setAttribute('icon-name', 'trash');
            btnDelete.setAttribute('title', i18n.t('delete'));
            btnDelete.addEventListener('click', (event) => {
                this.openDeleteFileDialogue(id, fileName);
                event.stopPropagation();
            });

            let div = this.createScopedElement('div');
            div.appendChild(btnLink);
            div.appendChild(btnBinary);
            div.appendChild(btnDownload);
            div.appendChild(btnEdit);
            div.appendChild(btnDelete);
            div.classList.add('actions-buttons');

            return div;
        };

        const options = {
            layout: 'fitColumns',
            selectable: false,
            placeholder: 'Es wurden noch keine Dateien hinzugefügt.',
            responsiveLayout: 'collapse',
            responsiveLayoutCollapseStartOpen: false,
            columnHeaderVertAlign: 'middle',
            columnDefaults: {
                vertAlign: 'middle',
                hozAlign: 'left',
                resizable: false,
            },
            columns: [
                {
                    minWidth: 40,
                    headerSort: false,
                    formatter: 'responsiveCollapse',
                },
                {
                    title: i18n.t('filename'),
                    responsive: 0,
                    widthGrow: 5,
                    minWidth: 150,
                    field: 'fileName',
                    sorter: 'alphanum',
                    formatter: (cell) => {
                        let div = this.createScopedElement('div');
                        let p = this.createScopedElement('p');
                        div.classList.add('filename');
                        p.innerHTML = cell.getValue();

                        if (cell.getData()['extension'] == 'png') {
                            p.style = 'margin-left: 5px;';
                            let img = this.createScopedElement('img');

                            this.sendGETFileRequest(cell.getData()['identifier'], 1, 0).then(
                                (response) => {
                                    response.json().then((data) => {
                                        img.src = data['contentUrl'];
                                    });
                                },
                            );

                            img.width = '40';
                            img.height = '40';

                            div.style = 'display: flex; align-items: center;';

                            div.appendChild(img);
                        }
                        div.appendChild(p);
                        return div;
                    },
                },
                {
                    title: i18n.t('size'),
                    responsive: 4,
                    widthGrow: 1,
                    minWidth: 84,
                    field: 'fileSize',
                    formatter: (cell, formatterParams, onRendered) => {
                        return humanFileSize(cell.getValue());
                    },
                },
                {
                    title: i18n.t('type'),
                    responsive: 2,
                    widthGrow: 1,
                    minWidth: 58,
                    field: 'mimeType',
                },
                {
                    title: i18n.t('creation-time'),
                    responsive: 3,
                    widthGrow: 1,
                    minWidth: 150,
                    field: 'dateCreated',
                    sorter: (a, b, aRow, bRow, column, dir, sorterParams) => {
                        const a_timestamp = Date.parse(a);
                        const b_timestamp = Date.parse(b);
                        return a_timestamp - b_timestamp;
                    },
                    formatter: function (cell, formatterParams, onRendered) {
                        const d = Date.parse(cell.getValue());
                        const timestamp = new Date(d);
                        const year = timestamp.getFullYear();
                        const month = ('0' + (timestamp.getMonth() + 1)).slice(-2);
                        const date = ('0' + timestamp.getDate()).slice(-2);
                        const hours = ('0' + timestamp.getHours()).slice(-2);
                        const minutes = ('0' + timestamp.getMinutes()).slice(-2);
                        return date + '.' + month + '.' + year + ' ' + hours + ':' + minutes;
                    },
                },
                {title: i18n.t('exists-until'), field: 'existsUntil', visible: false},
                {title: i18n.t('last-access'), field: 'lastAccess', visible: false},
                {title: i18n.t('additional-data'), field: 'additionalMetadata', visible: false},
                {title: 'identifier', field: 'identifier', visible: false},
                {
                    title: '',
                    hozAlign: 'center',
                    field: 'no_display_1',
                    download: false,
                    headerSort: false,
                    visible: true,
                    minWidth: 200,
                    formatter: actionsButtons,
                },
            ],
        };

        return options;
    }

    async setData() {
        if (this._('#tabulator-table-blob')) {
            await this._('#tabulator-table-blob').setData(this.uploadedFiles);
        }
    }

    async setOptions() {
        if (this._('#tabulator-table-blob') && !this.tableInit) {
            this._('#tabulator-table-blob').options = await this.getOptions();
            this.tableInit = true;
        }
    }

    static get styles() {
        // language=css
        return css`
            .row {
                display: flex;
                gap: 1em;
                align-items: center;
                min-height: 40px;
            }

            ${commonStyles.getThemeCSS()}
            ${commonStyles.getGeneralCSS(false)}
            ${commonStyles.getButtonCSS()}
            ${commonStyles.getTextUtilities()}
            ${commonStyles.getModalDialogCSS()}
            ${commonStyles.getRadioAndCheckboxCss()}
            
            .section-titles {
                font-size: 1.3em;
                color: var(--dbp-override-muted);
                text-transform: uppercase;
                padding-bottom: 0.5em;
                padding-top: 1.5em;
            }

            .ml-1 {
                margin-left: 1em;
            }

            .footer-btn-row {
                display: flex;
                justify-content: space-between;
            }

            .file-link {
                display: flex;
                justify-content: center;
                flex-direction: column;
                line-height: 1em;
            }

            .file-row {
                display: flex;
                gap: 1em;
                align-items: center;
                min-height: 40px;
                justify-content: space-between;
                max-width: 500px;
                padding-bottom: 1rem;
            }

            .file-link span {
                white-space: nowrap;
                max-width: 280px;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            @media only screen and (orientation: portrait) and (max-width: 768px) {
                .file-link span {
                    max-width: 180px;
                }
            }
        `;
    }

    render() {
        const i18n = this._i18n;

        if (
            this.tableInit &&
            this.isLoggedIn() &&
            !this.isLoading() &&
            !this._initialFetchDone &&
            !this.initialRequestsLoading &&
            this.bucketId !== ''
        ) {
            this.getFiles();
        }

        return html`
            <div>
                <div class="section-titles">
                    ${i18n.t('files')} (${this.uploadedFilesNumber}) in ${this.prefix}
                </div>
                <dbp-mini-spinner
                        class="spinner ${classMap({
                            hidden: !this.loading,
                        })}"></dbp-mini-spinner>
                <div id="file-list" class="${classMap({
                    hidden: this.loading,
                })}">
                    <dbp-tabulator-table 
                            id="tabulator-table-blob" 
                            identifier="blob-file-list" 
                            data="${JSON.stringify(this.uploadedFiles)}"
                    ></dbp-tabulator-table>
                </div>
                <dbp-modal
                        id="ask-delete-dialogue"
                        title=""
                        modal-id="delete-confirmation"
                >
                    <div slot="content">
                        <div>
                            ${i18n.t('delete-text', {name: this.activeFileName})}
                        </div>

                    </div>
                    <div slot="footer">
                        <div class="footer-btn-row">
                            <dbp-button 
                                    title="${i18n.t('cancel')}"
                                    @click="${() => {
                                        this._('#ask-delete-dialogue').close();
                                    }}">
                                ${i18n.t('cancel')}
                            </dbp-button>
                            <dbp-button
                                    title="${i18n.t('delete')}"
                                    type="is-primary" 
                                    @click="${() => this.deleteFile(this.activeFileId)}">
                                ${i18n.t('delete')}
                            </dbp-button>
                        </div>
                    </div>
                </dbp-modal>
                <dbp-modal
                        id="edit-dialogue"
                        title=""
                        modal-id="edit-dialogue">
                    <div slot="content">
                        <div>
                            ${i18n.t('save-as')}:
                            <input
                                    type="text"
                                    class="input"
                                    name="toRenameFileName"
                                    id="to-rename-file-name-input"
                                    value="${this.activeFileName}"
                                    required
                            />
                        </div>
                    </div>
                    <div slot="footer">
                        <div class="footer-btn-row">
                            <dbp-button
                                    title="${i18n.t('cancel')}"
                                    @click="${() => {
                                        this._('#edit-dialogue').close();
                                    }}">
                                ${i18n.t('cancel')}
                            </dbp-button>
                            <dbp-button 
                                    title="${i18n.t('save')}"
                                    type="is-primary" 
                                    @click="${() => this.sendPutFile()}">
                                ${i18n.t('save')}
                            </dbp-button>
                        </div>
                    </div>
                </dbp-modal>
                <dbp-modal
                        id="ask-delete-all-dialogue"
                        title=""
                        modal-id="delete-confirmation"
                >
                    <div slot="content">
                        <div>
                            ${i18n.t('delete-all-text', {name: this.prefix})}
                        </div>

                    </div>
                    <div slot="footer">
                        <div class="footer-btn-row">
                            <dbp-button 
                                    title="${i18n.t('cancel')}"
                                    @click="${() => {
                                        this._('#ask-delete-all-dialogue').close();
                                    }}">
                                ${i18n.t('cancel')}
                            </dbp-button>
                            <dbp-button
                                    title="${i18n.t('delete')}"
                                    type="is-primary" 
                                    @click="${() => {
                                        this.sendDeletePrefixRequest().then(() => {
                                            this.getFiles();
                                        });
                                    }}">
                                ${i18n.t('delete')}
                            </dbp-button>
                        </div>
                    </div>
                </dbp-modal>
                <div class="section-titles">
                    ${i18n.t('add-new-file')}
                </div>
                <div id="add-file-section">
                    
                    <div class="row">
                        <dbp-button 
                                title="${i18n.t('select-file')}"
                                @click="${() => {
                                    this._('#file-source').setAttribute('dialog-open', '');
                                }}"
                        >
                            ${i18n.t('select-file')} ...
                        </dbp-button> 
                        <span class="ml-1">
                            ${this.fileToUpload.name}
                        </span>
                        <div class="button-group ${classMap({hidden: !this.isFileSelected})}">
                            <dbp-icon-button
                                    icon-name="trash"
                                    title="${i18n.t('delete')}"
                                    @click="${this.removeFileToUpload}"
                            ></dbp-icon-button>
                        </div>
                     
                    </div>
                    <dbp-file-source
                        id="file-source"
                        class="file-source"
                        context="Select a file to append to bucket xy"
                        allowed-mime-types="*/*"
                        number-of-files="1"
                        subscribe="lang:lang,enabled-targets:file-handling-enabled-targets,auth,nextcloud-web-app-password-url,nextcloud-webdav-url,nextcloud-name,nextcloud-file-url"
                        @dbp-file-source-file-selected="${this.fileSelected}"
                      ></dbp-file-source>
                    </dbp-file-source>
                    
                    <div class="row ${classMap({hidden: !this.isFileSelected})}">
                        ${i18n.t('save-as')}:
                        <input
                                type="text"
                                class="input"
                                name="toUploadFileName"
                                id="to-upload-file-name-input"
                                value="${this.getFileToUploadName()}"
                        />
                        ${i18n.t('valid-until')}:
                        <input
                                type="text"
                                class="input"
                                name="toValidUntil"
                                id="to-valid-until"
                                value=""
                        />
                        ${i18n.t('add-metadata')}:
                        <input
                                type="text"
                                class="input"
                                name="toAddMetadata"
                                id="to-add-metadata"
                                value=""
                        />
                    </div>
                    <div class="row ${classMap({hidden: !this.isFileSelected})}">
                        <dbp-button 
                                title="${i18n.t('upload')}"
                                @click="${() => {
                                    this._('#ask-upload-dialogue').open();
                                }}"
                        >
                            ${i18n.t('upload')}
                        </dbp-button>
                        <dbp-modal
                                id="ask-upload-dialogue"
                                title=""
                                modal-id="upload-confirmation">
                            <div slot="content">
                                <div>
                                    ${i18n.t('ask-upload')}
                                </div>
                                
                            </div>
                            <div slot="footer">
                                <div class="footer-btn-row">
                                    <dbp-button 
                                            title="${i18n.t('cancel')}"
                                            @click="${() => {
                                                this._('#ask-upload-dialogue').close();
                                            }}">
                                        ${i18n.t('cancel')}
                                    </dbp-button>
                                    <dbp-button 
                                            title="${i18n.t('upload')}"
                                            type="is-primary" 
                                            @click="${this.uploadFile}">
                                        ${i18n.t('upload')}
                                    </dbp-button>
                                </div>
                            </div>
                        </dbp-modal>
                        
                    </div>
                </div>
                <div class="section-titles">
                    ${i18n.t('remove-all-files')}
                </div>
                <div id="remove-all-files-section">
                    <div class="row">
                        <dbp-button 
                                title="remove-all-files"
                                @click="${() => {
                                    this.openDeleteAllDialogue();
                                }}"
                        >
                            ${i18n.t('remove')}
                        </dbp-button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Create a SHA256 hash from a blob
     * @param {ArrayBuffer} blob the file
     * @returns {Promise<string>} the sha256 hash
     */
    async sha256(blob) {
        // console.dir(blob);
        return crypto.subtle
            .digest('SHA-256', blob)
            .then((hashBuffer) => Array.from(new Uint8Array(hashBuffer)))
            .then((hashArray) => hashArray.map((b) => b.toString(16).padStart(2, '0')).join(''));
    }

    /**
     * Returns the API key (not for production!)
     * This returns the API key. This implementation is intended for usage in development only!
     * In production, the API key should be created securly on the server side and not leak into the frontend.
     * @returns {string}
     */
    getApiKey() {
        // not for production use!
        let apiKey = '08d848fd868d83646778b87dd0695b10f59c78e23b286e9884504d1bb43cce93';

        if (this.bucketId == 4321) {
            apiKey = '427bb401c7e4ed7bc6d450cd8d3e7a601a50e64f7ebe59011faff77551809011';
        }

        return apiKey;
    }

    /**
     * Create a valid dbp-signature locally (not for production!)
     * This implementation of the function createSignature(payload) IS NOT FOR PRODUCTION USE!
     * A proper implementation will create the token after checking permissions
     * server side, keeping the value of the signing key secret!
     * @param {object} payload to build the JSW with
     * @returns {string}
     */
    createSignature(payload) {
        // not for production use!
        const apiKey = this.getApiKey();

        const pHeader = {alg: 'HS256'};
        const sHeader = JSON.stringify(pHeader);

        return jws.JWS.sign(pHeader.alg, sHeader, JSON.stringify(payload), this.hexEncode(apiKey));
    }

    /**
     * Create a valid dbp-signature locally (not for production!)
     * This implementation of the function createSignature(payload) IS NOT FOR PRODUCTION USE!
     * A proper implementation will create the token after checking permissions
     * server side, keeping the value of the signing key secret!
     * @param {string} payload to build the JSW with
     * @returns {ArrayBuffer}
     */
    createSha256HexForString(payload) {
        return crypto.subtle
            .digest('SHA-256', new TextEncoder().encode(payload))
            .then((hashArray) => {
                return Array.from(new Uint8Array(hashArray))
                    .map((b) => b.toString(16).padStart(2, '0'))
                    .join('');
            });
    }

    /**
     * Encode a string into hex (helper function)
     * @param {string} str
     * @returns {string}
     */
    hexEncode(str) {
        let result = '';
        for (let i = 0; i < str.length; i++) {
            result += ('00' + str.charCodeAt(i).toString(16)).slice(-2);
        }
        return result;
    }
}
