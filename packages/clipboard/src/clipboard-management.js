import {createInstance} from './i18n.js';
import {css, html} from 'lit';
import {ScopedElementsMixin} from '@open-wc/scoped-elements';
import * as commonStyles from '@dbp-toolkit/common/styles';
import {Icon} from '@dbp-toolkit/common';
import metadata from './dbp-clipboard-management.metadata.json';
import {Activity} from './activity.js';
import {Clipboard} from '@dbp-toolkit/file-handling/src/clipboard';
import {AdapterLitElement} from '@dbp-toolkit/provider/src/adapter-lit-element';

export class DbpClipboardManagement extends ScopedElementsMixin(AdapterLitElement) {
    constructor() {
        super();
        this._i18n = createInstance();
        this.lang = this._i18n.language;
        this.nextcloudWebAppPasswordURL = '';
        this.nextcloudWebDavURL = '';
        this.nextcloudName = '';
        this.nextcloudFileURL = '';
        this.nextcloudStoreSession = false;
        this.fileHandlingEnabledTargets = 'local';
        this.allowNesting = false;
        this.authInfo = '';
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
            lang: {type: String},
            fileHandlingEnabledTargets: {type: String, attribute: 'file-handling-enabled-targets'},
            nextcloudWebAppPasswordURL: {type: String, attribute: 'nextcloud-web-app-password-url'},
            nextcloudWebDavURL: {type: String, attribute: 'nextcloud-webdav-url'},
            nextcloudName: {type: String, attribute: 'nextcloud-name'},
            nextcloudFileURL: {type: String, attribute: 'nextcloud-file-url'},
            nextcloudAuthInfo: {type: String, attribute: 'nextcloud-auth-info'},
            nextcloudStoreSession: {type: Boolean, attribute: 'nextcloud-store-session'},
            allowNesting: {type: Boolean, attribute: 'allow-nesting'},
        };
    }

    update(changedProperties) {
        changedProperties.forEach((oldValue, propName) => {
            switch (propName) {
                case 'lang':
                    this._i18n.changeLanguage(this.lang);
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
                border-bottom: 1px solid rgba(0, 0, 0, 0.3);
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

            .subheadline {
                font-style: italic;
                padding-left: 2em;
                margin-top: -1px;
                /*line-height: 1.8;*/
                margin-bottom: 1.2em;
            }

            .warning-container {
                display: flex;
                flex-direction: inherit;
                align-items: center;
                margin-bottom: 1.5rem;
            }

            .warning-icon {
                margin-right: 10px;
                font-size: 1.5rem;
                margin-bottom: -3px;
            }

            .container {
                margin-top: 2rem;
            }
        `;
    }

    render() {
        const activity = new Activity(metadata);
        const i18n = this._i18n;
        return html`
            <h2>${activity.getName(this.lang)}</h2>
            <p class="subheadline">${activity.getDescription(this.lang)}</p>
            <p>
                ${i18n.t('clipboard-manual')} <br />
                <dbp-icon name="warning-high" class="warning-icon"></dbp-icon> ${i18n.t(
                    'save-to-clipboard-warning'
                )}
            </p>

            <div class="container">
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
                    nextcloud-auth-info="${this.nextcloudAuthInfo}"
                    ?nextcloud-store-session="${this.nextcloudStoreSession}"
                    enabled-targets="${this.fileHandlingEnabledTargets}"
                    allow-nesting="${this.allowNesting}"
                    decompress-zip>
                </dbp-clipboard>
            </div>
        `;
    }
}
