import {createI18nInstance} from './i18n.js';
import {css, html} from 'lit-element';
import {ScopedElementsMixin} from '@open-wc/scoped-elements';
import * as commonUtils from '@dbp-toolkit/common/utils';
import * as commonStyles from '@dbp-toolkit/common/styles';
import * as fileHandlingStyles from '@dbp-toolkit/file-handling/src/styles';
import {Icon} from '@dbp-toolkit/common';
import metadata from './dbp-clipboard.metadata.json';
import {Activity} from './activity.js';
import Tabulator from "tabulator-tables";
import {humanFileSize} from "@dbp-toolkit/common/i18next";
import {FileSink} from "@dbp-toolkit/file-handling/src/file-sink";
import {FileSource} from "@dbp-toolkit/file-handling/src/file-source";
import {name as pkgName} from "@dbp-toolkit/file-handling/package.json";
import {send} from "@dbp-toolkit/common/notification";
import {AdapterLitElement} from "@dbp-toolkit/provider/src/adapter-lit-element";

const i18n = createI18nInstance();

export class DbpClipboard extends ScopedElementsMixin(AdapterLitElement) {
    constructor() {
        super();
        this.lang = 'de';
        this.authUrl = '';
        this.allowedMimeTypes = '*/*';
        this.clipboardFiles = {files: ''};
        this.clipboardSelectBtnDisabled = true;
        this.clipboardSelectBtnDisabled = true;
        this.showSelectAllButton = true;
        this.tabulatorTable = null;
        this._onReceiveBeforeUnload = this.onReceiveBeforeUnload.bind(this);
        this.filesToSave = [];

    }

    static get scopedElements() {
        return {
            'dbp-icon': Icon,
            'dbp-file-sink': FileSink,
            'dbp-file-source': FileSource,
        };
    }

    static get properties() {
        return {
            ...super.properties,
            lang: { type: String },
            authUrl: { type: String, attribute: 'auth-url' },
            allowedMimeTypes: { type: String, attribute: 'allowed-mime-types' },
            showSelectAllButton: { type: Boolean, attribute: true },
            clipboardSelectBtnDisabled: { type: Boolean, attribute: true },
            clipboardFiles: {type: Object, attribute: 'clipboard-files'},
            filesToSave: {type: Array, attribute: 'files-to-save'},
        };
    }

    _(selector) {
        return this.shadowRoot === null ? this.querySelector(selector) : this.shadowRoot.querySelector(selector);
    }

    update(changedProperties) {
        changedProperties.forEach((oldValue, propName) => {
            switch (propName) {
                case "lang":
                    i18n.changeLanguage(this.lang);
                    break;
                case "clipboardFiles":
                    console.log("neu laden!");
                    this.generateClipboardTable();
                    break;
            }
        });

        super.update(changedProperties);
    }

    connectedCallback() {
        super.connectedCallback();
        const that = this;
        this.updateComplete.then(() => {

            // see: http://tabulator.info/docs/4.7
            this.tabulatorTable = new Tabulator(this._("#clipboard-content-table"), {
                layout: "fitColumns",
                selectable: true,
                selectableRangeMode: "drag",
                responsiveLayout: true,
                resizableColumns: false,
                columns: [
                    {
                        title: "",
                        field: "type",
                        align: "center",
                        headerSort: false,
                        width: 50,
                        responsive: 1,
                        formatter: (cell, formatterParams, onRendered) => {
                            const icon_tag = that.constructor.getScopedTagName("dbp-icon");
                            let icon = `<${icon_tag} name="empty-file" class="nextcloud-picker-icon"></${icon_tag}>`;
                            return icon;
                        }
                    },
                    {
                        title: '##filename',
                        responsive: 0,
                        widthGrow: 5,
                        minWidth: 150,
                        field: "name",
                        sorter: "alphanum",
                        formatter: (cell) => {
                            let data = cell.getRow().getData();
                            if (data.edit) {
                                cell.getElement().classList.add("fokus-edit");
                            }
                            return cell.getValue();
                        }
                    },
                    {
                        title: '##size',
                        responsive: 4,
                        widthGrow: 1,
                        minWidth: 50,
                        field: "size",
                        formatter: (cell, formatterParams, onRendered) => {
                            return cell.getRow().getData().type === "directory" ? "" : humanFileSize(cell.getValue());
                        }
                    },
                    {
                        title: '##mimetype',
                        responsive: 2,
                        widthGrow: 1,
                        minWidth: 20,
                        field: "type",
                        formatter: (cell, formatterParams, onRendered) => {
                            if (typeof cell.getValue() === 'undefined') {
                                return "";
                            }
                            const [, fileSubType] = cell.getValue().split('/');
                            return fileSubType;
                        }
                    },
                    {
                        title: "##lastmod",
                        responsive: 3,
                        widthGrow: 1,
                        minWidth: 150,
                        field: "lastModified",
                        sorter: (a, b, aRow, bRow, column, dir, sorterParams) => {
                            const a_timestamp = Date.parse(a);
                            const b_timestamp = Date.parse(b);
                            return a_timestamp - b_timestamp;
                        },
                        formatter: function (cell, formatterParams, onRendered) {
                            const timestamp = new Date(cell.getValue());
                            const year = timestamp.getFullYear();
                            const month = ("0" + (timestamp.getMonth() + 1)).slice(-2);
                            const date = ("0" + timestamp.getDate()).slice(-2);
                            const hours = ("0" + timestamp.getHours()).slice(-2);
                            const minutes = ("0" + timestamp.getMinutes()).slice(-2);
                            return date + "." + month + "." + year + " " + hours + ":" + minutes;
                        }
                    },
                    {title: "file", field: "file", visible: false}
                ],
                initialSort: [
                    {column: "name", dir: "asc"},
                    {column: "type", dir: "asc"},
                ],
                rowClick: (e, row) => {
                    if (this.tabulatorTable !== null
                        && this.tabulatorTable.getSelectedRows().length === this.tabulatorTable.getRows().filter(row => this.checkFileType(row.getData())).length) {
                        this.showSelectAllButton = false;
                    } else {
                        this.showSelectAllButton = true;
                    }
                },
                rowSelectionChanged: (data, rows) => {
                    if (this.tabulatorTable && this.tabulatorTable.getSelectedRows().length > 0) {
                        this.clipboardSelectBtnDisabled = false;
                    } else {
                        this.clipboardSelectBtnDisabled = true;
                    }
                }
            });
            that.generateClipboardTable();

        });
        // window.addEventListener('beforeunload', this._onReceiveBeforeUnload);
        console.log("finished");

    }

    disconnectedCallback() {

        //We doesn't want to deregister this event, because we want to use this event over activities
        //window.removeEventListener('beforeunload', this._onReceiveBeforeUnload);

        super.disconnectedCallback();
    }

    checkFileType(file) {
        // check if file is allowed
        const [fileMainType, fileSubType] = file.type.split('/');
        const mimeTypes = this.allowedMimeTypes.split(',');
        let deny = true;

        mimeTypes.forEach((str) => {
            const [mainType, subType] = str.split('/');
            deny = deny && ((mainType !== '*' && mainType !== fileMainType) || (subType !== '*' && subType !== fileSubType));
        });

        if (deny) {
            console.log(`mime type ${file.type} of file '${file.name}' is not compatible with ${this.allowedMimeTypes}`);
            return false;
        }
        return true;
    }

    generateClipboardTable() {
        console.log("generateClipboardTable");
        console.log("files:", this.clipboardFiles.files);
        if (this.clipboardFiles.files) {
            let data = [];
            for (let i = 0; i < this.clipboardFiles.files.length; i++){
                data[i] = {
                    name: this.clipboardFiles.files[i].name,
                    size: this.clipboardFiles.files[i].size,
                    type: this.clipboardFiles.files[i].type,
                    lastModified: this.clipboardFiles.files[i].lastModified,
                    file: this.clipboardFiles.files[i]
                };
            }

            if (this.tabulatorTable !== null){
                this.tabulatorTable.clearData();
                this.tabulatorTable.setData(data);
                console.log("table here");
            }
        }
    }

    async sendClipboardFiles(files) {

        for(let i = 0; i < files.length; i ++)
        {
            await this.sendFileEvent(files[i].file);
        }
        this.tabulatorTable.deselectRow();
        //this.closeDialog();

    }

    async sendFileEvent(file) {
        const data = {"file": file, "data": file};

        const event = new CustomEvent("dbp-clipboard-file-picker-file-downloaded",
            { "detail": data, bubbles: true, composed: true });
        this.dispatchEvent(event);
    }


    /**
     * Decides if the "beforeunload" event needs to be canceled
     *
     * @param event
     */
    onReceiveBeforeUnload(event){
        // we don't need to stop if there are no signed files
        if (this.clipboardFiles.files.length === 0) {
            return;
        }

        send({
            "summary": i18n.t('clipboard.file-warning'),
            "body": i18n.t('clipboard.file-warning-body', {count: this.clipboardFiles.files.length}),
            "type": "warning",
            "timeout": 5,
        });

        // we need to handle custom events ourselves
        if(event.target && event.target.activeElement && event.target.activeElement.nodeName) {

            if (!event.isTrusted) {
                // note that this only works with custom event since calls of "confirm" are ignored
                // in the non-custom event, see https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event
                const result = confirm("##carefulsaveialuge");
                // don't stop the page leave if the user wants to leave
                if (result) {
                    return;
                }
            }
            // Cancel the event as stated by the standard
            event.preventDefault();

            // Chrome requires returnValue to be set
            event.returnValue = '';
        }
    }

    saveFilesToClipboard(ev)
    {
        //save it
        console.log("----------", ev.detail.file);
        let data = {};
        let files = [];
        if (this.clipboardFiles && this.clipboardFiles.files.length !== 0) {
            files = files.concat(this.clipboardFiles.files);
            files = files.concat(ev.detail.file);
        } else {
            files = files.concat(ev.detail.file);
        }
        this.filesToSave = files;
        console.log("files", files);
        if (files && files.length !== 0) {
            data = {"files": files};
            this.sendSetPropertyEvent('clipboard-files', data);
            const event = new CustomEvent("dbp-clipboard-file-picker-file-uploaded",
                {  bubbles: true, composed: true });
            this.dispatchEvent(event);

        }
    }

    finishedSaveFilesToClipboard(ev) {
        console.log("hiii");
        send({
            "summary": i18n.t('saved-files-title', {count: ev.detail}),
            "body": i18n.t('saved-files-body', {count: ev.detail}),
            "type": "success",
            "timeout": 5,
        });
    }

    saveFilesFromClipboard() {
        this._("#file-sink-clipboard").files = Object.create(this.clipboardFiles.files);
        this._("#file-sink-clipboard").openDialog();
    }



    getClipboardFileList() {
        let files = [];
        for(let i = 0; i < this.clipboardFiles.files.length; i ++)
        {
            files[i] =  html`<div class="clipboard-list"><strong>${this.clipboardFiles.files[i].name}</strong> ${humanFileSize(this.clipboardFiles.files[i].size)}</div>`;
        }
        return files;
    }

    /**
     * Open Filesink for multiple files
     */
    async openClipboardFileSink() {
        this._("#file-sink-clipboard").files = Object.create(this.clipboardFiles.files);
        console.log("------ this.clipboardFiles.files;", this.clipboardFiles.files);
        this._("#file-sink-clipboard").openDialog();
    }

    clearClipboard() {
        let data = {"files": []};
        this.sendSetPropertyEvent('clipboard-files', data);
        const event = new CustomEvent("dbp-clipboard-file-picker-file-uploaded",
            {  bubbles: true, composed: true });
        this.dispatchEvent(event);
        send({
            "summary": i18n.t('clear-clipboard-title'),
            "body": i18n.t('clear-clipboard-body'),
            "type": "success",
            "timeout": 5,
        });
    }



    static get styles() {
        // language=css
        return css`
            ${commonStyles.getThemeCSS()}
            ${commonStyles.getGeneralCSS(false)}
            ${commonStyles.getButtonCSS()}
            ${commonStyles.getTextUtilities()}
            ${commonStyles.getModalDialogCSS()}
            ${commonStyles.getRadioAndCheckboxCss()}
            ${fileHandlingStyles.getFileHandlingCss()}

            a {
                border-bottom: 1px solid rgba(0,0,0,0.3);
                padding: 0;
            }

            a:hover {
                color: #fff;
                background-color: #000;
            }

            h2:first-child {
                margin-top: 0;
                margin-bottom: 0px;
            }

            .subheadline{
                font-style: italic;
                padding-left: 2em;
                margin-top: -1px;
                /*line-height: 1.8;*/
                margin-bottom: 1.2em;
            }
            
            .warning-container{
                display: flex;
                flex-direction: inherit;
                align-items: center;
            }
            
            .warning-icon{
                margin-right: 20px;
                font-size: 1.5rem;
            }
            
            .container{
                margin-top: 2rem;
            }
        `;
    }

    render() {
        const tabulatorCss = commonUtils.getAssetURL(pkgName, 'tabulator-tables/css/tabulator.min.css');
        const activity = new Activity(metadata);
        return html`
            <h2>${activity.getName(this.lang)}</h2>
            <p class="subheadline">
                ${activity.getDescription(this.lang)}
            </p>
            <p>
                ${i18n.t('clipboard-manual')}
            </p>
            <div class="warning-container">
                <dbp-icon name="warning" class="warning-icon"></dbp-icon>
                <p>${i18n.t('save-to-clipboard-warning')}</p>
            </div>
            // save data from clipboard
            //remove data from clipboard
            <div class="container">
                <h3> ${i18n.t('clipboard')}</h3>
                <button @click="${() => { this._("#file-source").setAttribute("dialog-open", ""); }}"
                        class="button is-primary" title="${i18n.t('add-files')}">
                    ${i18n.t('add-files-btn')}
                </button>
                <dbp-file-source
                        id="file-source"
                        context="${i18n.t('add-files')}"
                        subscribe="nextcloud-auth-url:nextcloud-web-app-password-url,nextcloud-web-dav-url:nextcloud-webdav-url,nextcloud-name:nextcloud-name,nextcloud-file-url:nextcloud-file-url"
                        enabled-targets="local,nextcloud"
                        decompress-zip
                        lang="${this.lang}"
                        text="${i18n.t('upload-area-text')}"
                        button-label="${i18n.t('upload-button-label')}"
                        @dbp-file-source-file-selected="${this.saveFilesToClipboard}"
                        @dbp-file-source-file-upload-finished="${this.finishedSaveFilesToClipboard}"
                ></dbp-file-source>
                <button @click="${() => { this.clearClipboard() }}"
                        class="button" title="${i18n.t('remove-all')}">
                    ${i18n.t('remove-all-btn')}
                </button>
                <button @click="${() => { this.saveFilesFromClipboard()}}"
                        class="button" title="${i18n.t('save-all')}">
                    ${i18n.t('save-all-btn')}
                </button>
                <dbp-file-sink id="file-sink-clipboard"
                    context="${i18n.t('save-all')}"
                    filename="clipboard-documents.zip"
                    enabled-targets="local,nextcloud"
                    subscribe="nextcloud-auth-url:nextcloud-web-app-password-url,nextcloud-web-dav-url:nextcloud-webdav-url,nextcloud-name:nextcloud-name,nextcloud-file-url:nextcloud-file-url"
                    lang="${this.lang}"
                    ></dbp-file-sink>
                <p>${i18n.t('clipboard-files')}</p>
                <link rel="stylesheet" href="${tabulatorCss}">
                <div><table id="clipboard-content-table" class="force-no-select"></table></div>
            </div>
        `;/*
           <div class="${classMap({"hidden": this.clipboardFiles.files.length === 0})}">
                    <button id="clipboard-download-button"
                                class="button is-right clipboard-btn"
                                @click="${this.openClipboardFileSink}"
                                >##save from clipboard</button>
                    </div>

                    <dbp-file-sink id="file-sink-clipboard"
                    context="## save x files"
                    filename="clipboard-documents.zip"
                    enabled-targets="local,nextcloud"
                    nextcloud-auth-url="${this.nextcloudAuthUrl}"
                    nextcloud-web-dav-url="${this.nextcloudWebDavUrl}"
                    nextcloud-name="${this.nextcloudName}"
                    nextcloud-file-url="${this.nextcloudFileURL}"
                    fullsize-modal="true"
                    lang="${this.lang}"
                    ></dbp-file-sink>

            <link rel="stylesheet" href="${tabulatorCss}">
            <div class="block clipboard-container">
                <div class="wrapper ${classMap({"table": this.clipboardFiles.files.length !== 0})}">
                    <div class="inner">
                        <p class="${classMap({"hidden": this.clipboardFiles.files.length !== 0})}">
                          ##keine files da</p>
                        <div class="clipboard-table ">
                            <div id="select-all-wrapper">
                                <button class="button ${classMap({"hidden": !this.showSelectAllButton})}"
                                        title="##selectall"
                                        @click="${() => {
                                            this.selectAll();
                                        }}">
                                    ##select all
                                </button>
                                <button class="button ${classMap({"hidden": this.showSelectAllButton})}"
                                        title="##selectnothing"
                                        @click="${() => {
                                            this.deselectAll();
                                        }}">
                                    ##select nothing
                                </button>
                            </div>
                            <table id="clipboard-content-table" class="force-no-select"></table>
                        </div>
                    </div>
                </div>
                <div class="clipboard-footer  ${classMap({"hidden": this.clipboardFiles.files.length === 0})}">
                    <button class="button select-button is-primary" ?disabled="${this.clipboardSelectBtnDisabled}"
                            @click="${() => {
                                this.sendClipboardFiles(this.tabulatorTable.getSelectedData());
                            }}">##Select files
                    </button>
                </div>
            </div>
        */
    }
}