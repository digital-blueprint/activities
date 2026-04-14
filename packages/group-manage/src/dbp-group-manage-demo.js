import {createInstance} from './i18n.js';
import {css, html} from 'lit';
import {ScopedElementsMixin, LangMixin} from '@dbp-toolkit/common';
import {GroupManage} from './group-manage.js';
// import {AuthKeycloak, LoginButton} from '@dbp-toolkit/auth';
import * as commonUtils from '@dbp-toolkit/common/utils';
import * as commonStyles from '@dbp-toolkit/common/styles';
import DBPLitElement from '@dbp-toolkit/common/dbp-lit-element';

/**
 * @class
 * @augments {DBPLitElement}
 */
export class GroupManageDemo extends LangMixin(ScopedElementsMixin(DBPLitElement), createInstance) {
    constructor() {
        super();
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
