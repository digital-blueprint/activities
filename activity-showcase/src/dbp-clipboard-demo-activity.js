import {css, html} from 'lit-element';
import {ScopedElementsMixin} from '@open-wc/scoped-elements';
import * as commonUtils from '@dbp-toolkit/common/utils';
import * as commonStyles from '@dbp-toolkit/common/styles';
import {unsafeHTML} from 'lit-html/directives/unsafe-html.js';
import readme from '@dbp-topics/clipboard/README.md';
import highlightCSSPath from 'highlight.js/styles/default.css';
import * as demoStyles from "./styles";
import {AdapterLitElement} from "@dbp-toolkit/provider/src/adapter-lit-element";
import {DbpClipboardManagement} from "@dbp-topics/clipboard";

class DbpClipboardDemoActivity extends ScopedElementsMixin(AdapterLitElement) {
    constructor() {
        super();
        this.lang = 'en';
        this.entryPointUrl = '';
    }

    static get scopedElements() {
        return {
            'dbp-clipboard-management': DbpClipboardManagement,
        };
    }

    static get properties() {
        return {
            ...super.properties,
            lang: { type: String },
            entryPointUrl: { type: String, attribute: 'entry-point-url' },
        };
    }

    connectedCallback() {
        super.connectedCallback();

        this.updateComplete.then(()=>{
        });
    }

    static get styles() {
        // language=css
        return [
            commonStyles.getThemeCSS(),
            commonStyles.getGeneralCSS(),
            demoStyles.getDemoCSS(),
            css`
            h1.title {margin-bottom: 1em;}
            div.container {margin-bottom: 1.5em;}

            #demo{
                display: block;
                padding-top: 50px;
            }
            
            `
        ];
    }

    render() {
        return html`
                ${unsafeHTML(readme)}
                <dbp-clipboard-management lang="${this.lang}" 
                subscribe="nextcloud-web-app-password-url,nextcloud-webdav-url,nextcloud-name,nextcloud-file-url"
                entry-point-url="${this.entryPointUrl}"
                enabled-targets="local,nextcloud,clipboard"
                demo-clipboard
                "></dbp-clipboard-management>
        `;
    }
}

commonUtils.defineCustomElement('dbp-clipboard-demo-activity', DbpClipboardDemoActivity);
