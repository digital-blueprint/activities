import * as commonUtils from '@dbp-toolkit/common/utils';
import {createInstance} from './i18n.js';
import {html} from 'lit';
import {ScopedElementsMixin} from '@dbp-toolkit/common';
import {AdapterLitElement, LangMixin, AuthMixin} from '@dbp-toolkit/common';

export class DbpPrepareMediaTransparencyReport extends AuthMixin(
    LangMixin(ScopedElementsMixin(AdapterLitElement), createInstance),
) {
    constructor() {
        super();
        this.entryPointUrl = '';
    }

    render() {
        return html`
            TODO
        `;
    }
}

commonUtils.defineCustomElement(
    'dbp-prepare-media-transparency-report',
    DbpPrepareMediaTransparencyReport,
);
