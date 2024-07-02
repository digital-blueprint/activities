import {createInstance} from './i18n.js';
import {css, html} from 'lit';
import {ScopedElementsMixin} from '@open-wc/scoped-elements';
import {GroupManage} from './group-manage.js';
// import {AuthKeycloak, LoginButton} from '@dbp-toolkit/auth';
import * as commonUtils from '@dbp-toolkit/common/utils';
import * as commonStyles from '@dbp-toolkit/common/styles';
import DBPLitElement from '@dbp-toolkit/common/dbp-lit-element';

export class GroupManageDemo extends ScopedElementsMixin(DBPLitElement) {
    constructor() {
        super();
        this._i18n = createInstance();
        this.lang = this._i18n.language;
        this.entryPointUrl = '';
    }

    static get scopedElements() {
        return {
            'dbp-group-manage': GroupManage,
        };
    }

    static get properties() {
        return {
            ...super.properties,
            lang: {type: String},
            entryPointUrl: {type: String, attribute: 'entry-point-url'},
        };
    }

    static get styles() {
        // language=css
        return [
            commonStyles.getThemeCSS(),
            commonStyles.getGeneralCSS(),
            css`
                h1.title {
                    margin-bottom: 1em;
                }
                div.container {
                    margin-bottom: 1.5em;
                }
            `,
        ];
    }

    connectedCallback() {
        super.connectedCallback();
    }

    update(changedProperties) {
        if (changedProperties.has('lang')) {
            this._i18n.changeLanguage(this.lang);
        }
        super.update(changedProperties);
    }

    render() {
        return html`
            <section class="section">
                <div class="container">
                    <h1 class="title">Group-manage Demo</h1>
                </div>
                <div class="container">
                    <dbp-group-manage
                        subscribe="auth"
                        lang="${this.lang}"
                        entry-point-url="${this.entryPointUrl}"></dbp-group-manage>
                </div>
            </section>
        `;
    }
}

commonUtils.defineCustomElement('dbp-group-manage-demo', GroupManageDemo);
