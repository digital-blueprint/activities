import {css, html} from 'lit';
import {ScopedElementsMixin} from '@dbp-toolkit/common';
import {GroupManageDemo} from '../../packages/group-manage/src/dbp-group-manage-demo.js';
import * as commonStyles from '@dbp-toolkit/common/styles';
import * as commonUtils from '@dbp-toolkit/common/utils';
import * as demoStyles from './styles';
import {AdapterLitElement} from '@dbp-toolkit/common';

export class DbpGroupManagementDemoActivity extends ScopedElementsMixin(AdapterLitElement) {
    constructor() {
        super();
        this.lang = 'en';
        this.entryPointUrl = '';
    }

    static get scopedElements() {
        return {
            'dbp-group-manage-demo': GroupManageDemo,
        };
    }

    static get properties() {
        return {
            ...super.properties,
            lang: {type: String},
            entryPointUrl: {type: String, attribute: 'entry-point-url'},
        };
    }

    connectedCallback() {
        super.connectedCallback();
        // this.updateComplete.then(() => {});
    }

    static get styles() {
        // language=css
        return [
            commonStyles.getThemeCSS(),
            commonStyles.getGeneralCSS(),
            demoStyles.getDemoCSS(),
            css`
                h1.title {
                    margin-bottom: 1em;
                }
                div.container {
                    margin-bottom: 1.5em;
                }

                #demo {
                    display: block;
                    padding-top: 50px;
                }
            `,
        ];
    }

    render() {
        return html`
            <dbp-group-manage-demo
                id="group-manage-demo"
                lang="${this.lang}"
                entry-point-url="${this.entryPointUrl}"></dbp-group-manage-demo>
        `;
    }
}

commonUtils.defineCustomElement('dbp-group-manage-demo-activity', DbpGroupManagementDemoActivity);
