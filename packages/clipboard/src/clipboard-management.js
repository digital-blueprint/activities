import {createI18nInstance} from './i18n.js';
import {css, html} from 'lit-element';
import {ScopedElementsMixin} from '@open-wc/scoped-elements';
import * as commonStyles from '@dbp-toolkit/common/styles';
import {Icon} from '@dbp-toolkit/common';
import metadata from './dbp-clipboard-management.metadata.json';
import {Activity} from './activity.js';
import {Clipboard} from "@dbp-toolkit/file-handling/src/clipboard";
import {AdapterLitElement} from "@dbp-toolkit/provider/src/adapter-lit-element";


const i18n = createI18nInstance();

export class DbpClipboardManagement extends ScopedElementsMixin(AdapterLitElement) {
    constructor() {
        super();
        this.lang = 'de';
        this.nextcloudWebAppPasswordURL = "";
        this.nextcloudWebDavURL = "";
        this.nextcloudName = "";
        this.nextcloudFileURL = "";

    }

    static get scopedElements() {
        return {
            'dbp-icon': Icon,
            'dbp-clipboard': Clipboard,
        };
    }

    static get properties() {
        return {
            ...super.properties,
            lang: { type: String },
            nextcloudWebAppPasswordURL: { type: String, attribute: 'nextcloud-web-app-password-url' },
            nextcloudWebDavURL: { type: String, attribute: 'nextcloud-webdav-url' },
            nextcloudName: { type: String, attribute: 'nextcloud-name' },
            nextcloudFileURL: { type: String, attribute: 'nextcloud-file-url' },
        };
    }

    update(changedProperties) {
        changedProperties.forEach((oldValue, propName) => {
            switch (propName) {
                case "lang":
                    i18n.changeLanguage(this.lang);
                    break;
            }
        });

        super.update(changedProperties);
    }

    static get styles() {
        // language=css
        return css`
            ${commonStyles.getThemeCSS()}
            ${commonStyles.getGeneralCSS(false)}

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
                margin-bottom: 1.5rem;
            }
            
            .warning-icon{
                margin-right: 20px;
                font-size: 1.5rem;
            }
            
        `;
    }

    render() {
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
                <p class="init">${i18n.t('save-to-clipboard-warning')}</p>
            </div>
            <h3>${i18n.t('clipboard-files')}</h3>
            <dbp-clipboard
                id="clipboard"
                lang="${this.lang}"
                show-additional-buttons
                subscribe="clipboard-files:clipboard-files"
                nextcloud-auth-url="${this.nextcloudWebAppPasswordURL}"
                nextcloud-web-dav-url="${this.nextcloudWebDavURL}"
                nextcloud-name="${this.nextcloudName}"
                nextcloud-file-url="${this.nextcloudFileURL}"
                enabled-targets="local,nextcloud,clipboard"
                decompress-zip
            >
            </dbp-clipboard>
        `;
    }
}