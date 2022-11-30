import {createInstance} from './i18n';
import {css, html} from 'lit';
import {ScopedElementsMixin} from '@open-wc/scoped-elements';
import * as commonStyles from '@dbp-toolkit/common/styles';
import {LoadingButton, Icon, IconButton, Modal, MiniSpinner} from '@dbp-toolkit/common';
import DBPLitElement from "@dbp-toolkit/common/dbp-lit-element";
import {FileSource} from "@dbp-toolkit/file-handling";
import {classMap} from 'lit/directives/class-map.js';
import {send} from '@dbp-toolkit/common/notification';




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

        this.bucket_id = '';
        this.prefix = '';

        this.activeFileId = '';
        this.activeFileName = '';
    }

    static get scopedElements() {
        return {
            'dbp-icon': Icon,
            'dbp-button': LoadingButton,
            'dbp-icon-button': IconButton,
            'dbp-file-source': FileSource,
            'dbp-modal': Modal,
            'dbp-mini-spinner': MiniSpinner
        };
    }

    static get properties() {
        return {
            ...super.properties,
            lang: {type: String},
            auth: { type: Object },
            entryPointUrl: {type: String, attribute: 'entry-point-url'},
            isFileSelected: {type: Boolean, attribute: false},
            uploadedFilesNumber: {type: Number, attribute: false},
            initialRequestsLoading: { type: Boolean, attribute: false },
            loading: { type: Boolean, attribute: false },

            bucket_id: {type: String, attribute: 'bucket-id'},
            prefix: {type: String, attribute: 'prefix'},
            activeFileId: {type: String, attribute: false},
            activeFileName: {type: String, attribute: false},
        };
    }

    connectedCallback() {
        super.connectedCallback();

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
        changedProperties.forEach((oldValue, propName) => {
            switch (propName) {
                case "auth":
                    this._updateAuth();
                    break;
                case "prefix":
                    if (this.isLoggedIn() && !this.isLoading()
                        && this._initialFetchDone
                        && this.bucket_id !== '') {
                            this.getFiles();
                    }
                    break;
            }
        });

        super.update(changedProperties);
    }

    /**
     * Returns if a person is set in or not
     *
     * @returns {boolean} true or false
     */
    isLoggedIn() {
        return (this.auth.person !== undefined && this.auth.person !== null);
    }

    /**
     * Returns true if a person has successfully logged in
     *
     * @returns {boolean} true or false
     */
    isLoading() {
        if (this._loginStatus === "logged-out")
            return false;
        return (!this.isLoggedIn() && this.auth.token !== undefined);
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

    async uploadFile() {
        try {
            let response = await this.sendUploadFileRequest();
            let responseBody = await response.json();
            if (responseBody !== undefined && response.status === 201) {
                send({
                    "summary": "Upload successfull",
                    "body": "You have successfully uploaded a file to a bucket :)",
                    "type": "success",
                    "timeout": 5,
                });
            }
        } finally {
            if (this._("#ask-upload-dialogue")) {
                this._("#ask-upload-dialogue").close();
            }
            this.removeFileToUpload();
            this.getFiles();
        }
    }

    async sendUploadFileRequest() {
        let params = new URLSearchParams({
            bucketID: this.bucket_id,
            creationTime: new Date().toISOString(),
        });
        let name = this.fileToUpload.name;
        if (this._('#to-upload-file-name-input')) {
            name = this._('#to-upload-file-name-input').value;
        }

        let formData = new FormData();
        formData.append('file', this.fileToUpload);
        formData.append('prefix', this.prefix);
        formData.append('fileName', name);
        formData.append('bucketID', this.bucket_id);

        const options = {
            method: 'POST',
            headers: {
                Authorization: "Bearer " + this.auth.token,
                'X-Dbp-Signature': 'test',
            },
            body: formData,
        };
        return await this.httpGetAsync(this.entryPointUrl + '/blob/files?' + params, options);
    }

    async getFiles() {
        this.initialRequestsLoading = !this._initialFetchDone;
        this.loading = true;

        try {
            let response = await this.sendGetFilesRequest();
            console.log("response", response);
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
            this.loading = false;

        }
    }

    async sendGetFilesRequest() {
        let params = new URLSearchParams({
            bucketID: this.bucket_id,
            creationTime: new Date().toISOString(),
            prefix: this.prefix,
        });
        const options = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/ld+json',
                Authorization: "Bearer " + this.auth.token,
                'X-Dbp-Signature': 'test',
            },
        };
        return await this.httpGetAsync(this.entryPointUrl + '/blob/files?' + params, options);
    }

    async sendPutFile() {
        this.loading = true;

        try {
            let response = await this.sendPutFileRequest();
            let responseBody = await response.json();
            if (responseBody !== undefined && response.status === 201) {
                send({
                    "summary": "Rename was successful",
                    "body": "You have successfully renamed a file :)",
                    "type": "success",
                    "timeout": 5,
                });
            }
        } finally {
            this.closeEditFileDialogue();
            this.getFiles();
        }
    }

    async sendPutFileRequest() {
        let params = new URLSearchParams({
            bucketID: this.bucket_id,
            creationTime: new Date().toISOString(),
        });
        let name = this.activeFileName;
        if (this._('#to-rename-file-name-input')) {
            name = this._('#to-rename-file-name-input').value;
        }

        let data = {'fileName': name};

        const options = {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/ld+json',
                Authorization: "Bearer " + this.auth.token,
                'X-Dbp-Signature': 'test',
            },
            body: JSON.stringify(data),
        };
        return await this.httpGetAsync(this.entryPointUrl + '/blob/files/' + this.activeFileId + '?' + params, options);

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

    async deleteFile(id) {
        this.loading = true;

        this.closeDeleteFileDialogue();
        try {
            let response = await this.sendDeleteFileRequest(id);
            if (response.status === 204) {
                send({
                    "summary": "File deleted",
                    "body": "You have successfully deleted a file in the bucket.",
                    "type": "success",
                    "timeout": 5,
                });
            }
            //TODO add error responses
        } finally {
            this.getFiles();
        }
    }

    async sendDeleteFileRequest(id) {
        let params = new URLSearchParams({
            bucketID: this.bucket_id,
            creationTime: new Date().toISOString(),
        });

        const options = {
            method: 'DELETE',
            headers: {
                Authorization: "Bearer " + this.auth.token,
                'X-Dbp-Signature': 'test',
            },
        };
        return await this.httpGetAsync(this.entryPointUrl + '/blob/files/' + id + '?' + params, options);
    }

    /**
     * Send a fetch to given url with given options
     *
     * @param url
     * @param options
     * @returns {object} response (error or result)
     */
    async httpGetAsync(url, options) {
        let response = await fetch(url, options).then(result => {
            if (!result.ok) throw result;
            return result;
        }).catch(error => {
            return error;
        });

        return response;
    }

    getFileList(){
        let list = [];
        for (let i = 0; i < this.uploadedFilesNumber; i ++) {
            list[i] = html`
                <div class="row file-row"> 
                    <a class="file-link" href="${this.uploadedFiles[i].contentUrl}">
                        <span><strong>${this.uploadedFiles[i].fileName}</strong></span>
                        <span class="small-text">${this.dateTimeFormatter(this.uploadedFiles[i].dateCreated)}</span>
                    </a>
                    <div class="button-group">
                        <dbp-icon-button
                                icon-name="pencil"
                                title="edit"
                                @click="${() => {
                                    this.openEditFileDialogue(
                                            this.uploadedFiles[i].identifier,
                                            this.uploadedFiles[i].fileName)
                                    ;}}"
                        ></dbp-icon-button>
                        <dbp-icon-button
                                icon-name="trash"
                                title="delete"
                                @click="${() => {
                                    this.openDeleteFileDialogue(
                                        this.uploadedFiles[i].identifier, 
                                        this.uploadedFiles[i].fileName)
                                    ;}}"
                        ></dbp-icon-button>
                    </div>
                </div>`;
        }
        return list;
    }

    dateTimeFormatter(dateTime) {
        const d = Date.parse(dateTime);
        const timestamp = new Date(d);
        const year = timestamp.getFullYear();
        const month = ('0' + (timestamp.getMonth() + 1)).slice(-2);
        const date = ('0' + timestamp.getDate()).slice(-2);
        const hours = ('0' + timestamp.getHours()).slice(-2);
        const minutes = ('0' + timestamp.getMinutes()).slice(-2);
        return date + '.' + month + '.' + year + ' ' + hours + ':' + minutes;
    }


    static get styles() {
        // language=css
        return css`
            .row{
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
            
            .ml-1{
                margin-left: 1em;
            }
            
            .footer-btn-row {
                display: flex;
                justify-content: space-between;
            }
            
            .file-link{
                display: flex;
                justify-content: center;
                flex-direction: column;
                line-height: 1em;
            }
            
            .file-row{
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

        if (this.isLoggedIn() && !this.isLoading()
            && !this._initialFetchDone
            && !this.initialRequestsLoading
            && this.bucket_id !== '') {
                this.getFiles();
        }

        return html`
            <div>
                <div class="section-titles">
                    Dateien (${this.uploadedFilesNumber}) in ${this.prefix}
                </div>
                <dbp-mini-spinner
                        class="spinner ${classMap({
                            hidden: !this.loading,
                        })}"></dbp-mini-spinner>
                <div id="file-list" class="${classMap({
                    hidden: this.loading,
                })}">
                    ${this.uploadedFilesNumber <= 0 ?
                        html`Es wurden noch keine Dateien hinzugefügt.` :
                        this.getFileList() }
                </div>
                <dbp-modal
                        id="ask-delete-dialogue"
                        title=""
                        modal-id="delete-confirmation">
                    <div slot="content">
                        <div>
                            Are you sure you want to delete the file <strong>${this.activeFileName}</strong>?
                        </div>

                    </div>
                    <div slot="footer">
                        <div class="footer-btn-row">
                            <dbp-button @click="${() => {this._("#ask-delete-dialogue").close();}}">
                                Cancel
                            </dbp-button>
                            <dbp-button type="is-primary" @click="${() => this.deleteFile(this.activeFileId)}">
                                Delete
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
                            Save as:
                            <input
                                    type="text"
                                    class="input"
                                    name="toRenameFileName"
                                    id="to-rename-file-name-input"
                                    value="${this.activeFileName}"
                            />                        </div>

                    </div>
                    <div slot="footer">
                        <div class="footer-btn-row">
                            <dbp-button @click="${() => {this._("#edit-dialogue").close();}}">
                                Cancel
                            </dbp-button>
                            <dbp-button type="is-primary" @click="${() => this.sendPutFile()}">
                                Save
                            </dbp-button>
                        </div>
                    </div>
                </dbp-modal>
                <div class="section-titles">
                    Neue Datei hinzufügen
                </div>
                <div id="add-file-section">
                    
                    <div class="row">
                        <dbp-button @click="${() => {
                            this._('#file-source').setAttribute('dialog-open', '');}}"
                        >
                            Select a file ...
                        </dbp-button> 
                        <span class="ml-1">
                            ${this.fileToUpload.name}
                        </span>
                        <div class="button-group ${classMap({hidden: !this.isFileSelected})}">
                            <dbp-icon-button
                                    icon-name="trash"
                                    title="delete"
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
                        Save as:
                        <input
                                type="text"
                                class="input"
                                name="toUploadFileName"
                                id="to-upload-file-name-input"
                                value="${this.fileToUpload.name}"
                        />

                    </div>
                    <div class="row ${classMap({hidden: !this.isFileSelected})}">
                        <dbp-button @click="${()=>{this._("#ask-upload-dialogue").open();}}">
                            Upload
                        </dbp-button>
                        <dbp-modal
                                id="ask-upload-dialogue"
                                title=""
                                modal-id="upload-confirmation">
                            <div slot="content">
                                <div>
                                    Are you sure you want to upload this file?
                                </div>
                                
                            </div>
                            <div slot="footer">
                                <div class="footer-btn-row">
                                    <dbp-button @click="${() => {this._("#ask-upload-dialogue").close();}}">
                                        Cancel
                                    </dbp-button>
                                    <dbp-button type="is-primary" @click="${this.uploadFile}">
                                        Upload
                                    </dbp-button>
                                </div>
                            </div>
                        </dbp-modal>
                        
                    </div>
                </div>
            </div>
        `;
    }
}
