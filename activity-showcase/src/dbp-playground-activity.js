import {css, html} from 'lit';
import {ScopedElementsMixin} from '@open-wc/scoped-elements';
import * as commonUtils from '@dbp-toolkit/common/utils';
import * as commonStyles from '@dbp-toolkit/common/styles';
import * as demoStyles from './styles';
import {AdapterLitElement, Icon} from '@dbp-toolkit/common';
import {Blob} from "./Blob";

class DbpPlaygroundActivity extends ScopedElementsMixin(AdapterLitElement) {
    constructor() {
        super();
        this.lang = 'en';
        this.entryPointUrl = '';
    }

    static get scopedElements() {
        return {
            'dbp-icon': Icon,
            'dbp-blob': Blob,
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
            commonStyles.getButtonCSS(),
            demoStyles.getDemoCSS(),
            commonStyles.getLinkCss(),

            css`
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
            `,
        ];
    }

    render() {
        return html`
            <h2>Playground</h2>
            <p class="subheadline">For playing around</p>
            
             <dbp-blob
                subscribe="auth,file-handling-enabled-targets:enabled-targets,entry-point-url:entry-point-url,lang:lang"
             ></dbp-blob>
        `;
    }
}

commonUtils.defineCustomElement('dbp-playground-activity', DbpPlaygroundActivity);
