import {css, html} from 'lit';
import {ScopedElementsMixin} from '@open-wc/scoped-elements';
import * as commonUtils from '@dbp-toolkit/common/utils';
import * as commonStyles from '@dbp-toolkit/common/styles';
import * as demoStyles from './styles';
import {Icon, IconButton} from '@dbp-toolkit/common';
import {Blob} from "./Blob";
import DBPLitElement from "@dbp-toolkit/common/dbp-lit-element";

let exampleConfig = {
    'bucket_id': '1234',
    'prefix': 'playground'
};

class DbpPlaygroundActivity extends ScopedElementsMixin(DBPLitElement) {
    constructor() {
        super();
        this.lang = 'en';
        this.entryPointUrl = '';
        this.prefix = exampleConfig.prefix;
        this.bucketId = exampleConfig.bucket_id;
    }

    static get scopedElements() {
        return {
            'dbp-icon': Icon,
            'dbp-blob': Blob,
            'dbp-icon-button': IconButton,
        };
    }

    static get properties() {
        return {
            ...super.properties,
            lang: {type: String},
            entryPointUrl: {type: String, attribute: 'entry-point-url'},
            prefix: {type: String, attribute: false},
            bucketId: {type: String, attribute: false},
        };
    }


    changePrefix() {
        if (this._("#prefix-input")) {
            this.prefix = this._("#prefix-input").value;
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
            ${commonStyles.getGeneralCSS()}
            ${commonStyles.getButtonCSS()}
            ${demoStyles.getDemoCSS()}
            ${commonStyles.getLinkCss()}
            
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
            
            .section-titles {
                font-size: 1.3em;
                color: var(--dbp-override-muted);
                text-transform: uppercase;
                padding-bottom: 0.5em;
                padding-top: 1.5em;
            }
        `;
    }


    render() {
        return html`
            <h2>Playground</h2>
            <p class="subheadline">For playing around</p>
            
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

            <dbp-blob
                subscribe="auth,file-handling-enabled-targets:enabled-targets,entry-point-url:entry-point-url,lang:lang"
                prefix="${this.prefix}"
                bucket-id="${this.bucketId}"
            ></dbp-blob>
        `;
    }
}

commonUtils.defineCustomElement('dbp-playground-activity', DbpPlaygroundActivity);
