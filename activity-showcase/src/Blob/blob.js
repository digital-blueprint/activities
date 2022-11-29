import {createInstance} from './i18n';
import {css, html} from 'lit';
import {ScopedElementsMixin} from '@open-wc/scoped-elements';
import * as commonStyles from '@dbp-toolkit/common/styles';
import {LoadingButton, Icon, IconButton, Modal} from '@dbp-toolkit/common';
import DBPLitElement from "@dbp-toolkit/common/dbp-lit-element";
import {FileSource} from "@dbp-toolkit/file-handling";
import {classMap} from 'lit/directives/class-map.js';
import {send} from '@dbp-toolkit/common/notification';


let exampleConfig = {
    'bucket_id': '1234',
    'prefix': 'playground'
};

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

        this.uploadedFilesNumber = 0;
        this.uploadedFiles = [];

        this.bucket_id = exampleConfig.bucket_id;
        this.prefix = exampleConfig.prefix;
    }

    static get scopedElements() {
        return {
            'dbp-icon': Icon,
            'dbp-button': LoadingButton,
            'dbp-icon-button': IconButton,
            'dbp-file-source': FileSource,
            'dbp-modal': Modal,
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

            bucket_id: {type: String, attribute: 'bucket-id'},
            prefix: {type: String, attribute: 'prefix'},
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

    deleteFileToUpload() {
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
            this.fileToUpload = {};
            this.isFileSelected = false;
            this.getFiles();
        }
    }

    async sendUploadFileRequest() {
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
                Authorization: "Bearer " + this.auth.token
            },
            body: formData,
        };
        return await this.httpGetAsync(this.entryPointUrl + '/blob/files', options);
    }

    async getFiles() {
        this.initialRequestsLoading = !this._initialFetchDone;
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
        }
    }

    async sendGetFilesRequest() {
        let params = new URLSearchParams({
            bucketID: this.bucket_id,
            prefix: this.prefix,
        });
        const options = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/ld+json',
                Authorization: "Bearer " + this.auth.token
            },
        };
        return await this.httpGetAsync(this.entryPointUrl + '/blob/files?' + params, options);
    }

    async deleteFile(id) {
        try {
            let response = await this.sendDeleteFileRequest(id);
            console.log(response);
            if (response.status === 204) {
                send({
                    "summary": "File deleted",
                    "body": "You have successfully deleted a file in the bucket.",
                    "type": "success",
                    "timeout": 5,
                });
            }
        } finally {
            this.getFiles();
        }
    }

    async sendDeleteFileRequest(id) {

        const options = {
            method: 'DELETE',
            headers: {
                Authorization: "Bearer " + this.auth.token
            },
        };
        return await this.httpGetAsync(this.entryPointUrl + '/blob/files/' + id, options);
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
        console.log(this.uploadedFiles);
        for (let i = 0; i < this.uploadedFilesNumber; i ++) {
            list[i] = html`
                <div class="row"> 
                    <a class="file_link" href="${this.uploadedFiles[i].contentUrl}">
                        ${this.uploadedFiles[i].fileName}
                    </a>
                    <div class="button-group">
                        <dbp-icon-button
                                icon-name="trash"
                                title="delete"
                                @click="${() => {this.deleteFile(this.uploadedFiles[i].identifier);}}"
                        ></dbp-icon-button>
                    </div>
                </div>`;
        }
        return list;
    }

    changePrefix() {
        if (this._("#prefix-input")) {
            this.prefix = this._("#prefix-input").value;
            this.getFiles();
        }
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
        `;
    }

    render() {

        if (this.isLoggedIn() && !this.isLoading() && !this._initialFetchDone && !this.initialRequestsLoading) {
            this.getFiles();
        }

        return html`
            <div>
                <div class="section-titles">
                    Prefix
                </div>
                <div class="section-prefix">
                    <div class="row">
                        <input
                            type="text"
                            class="input"
                            name="prefix-input"
                            id="prefix-input"
                            value="${this.prefix}"
                        />
                        <dbp-icon-button
                            icon-name="checkmark-circle"
                            title="Enter input"
                            @click="${this.changePrefix}"
                        ></dbp-icon-button>
                    </div>
                </div>
                
                <div class="section-titles">
                    Dateien (${this.uploadedFilesNumber}) in ${this.prefix}
                </div>
                <div id="file-list">
                    ${this.uploadedFilesNumber <= 0 ?
                        html`Es wurden noch keine Dateien hinzugefügt.` :
                        this.getFileList() }
                </div>
                <div class="section-titles">
                    Neue Datei hinzufügen
                </div>
                <div id="add-file-section">
                    
                    <div class="row">
                        Datei:
                        <dbp-button @click="${() => {
                            this._('#file-source').setAttribute('dialog-open', '');}}"
                        >
                            Browse
                        </dbp-button> 
                        <span class="ml-1">
                            ${this.fileToUpload.name}
                        </span>
                        <div class="button-group ${classMap({hidden: !this.isFileSelected})}">
                            <dbp-icon-button
                                    icon-name="trash"
                                    title="delete"
                                    @click="${this.deleteFileToUpload}"
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
                        <dbp-button @click="${()=>{this._("#ask-upload").open();}}">
                            Upload
                        </dbp-button>
                        <dbp-modal
                                id="ask-upload"
                                title=""
                                modal-id="upload-confirmation">
                            <div slot="content">
                                <div>
                                    Are you sure you want to upload this file?
                                </div>
                                
                            </div>
                            <div slot="footer">
                                <div class="footer-btn-row">
                                    <dbp-button @click="${() => {this._("#ask-upload").close();}}">
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
