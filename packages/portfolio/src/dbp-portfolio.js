import * as commonUtils from '@dbp-toolkit/common/utils';
import {createInstance} from './i18n.js';
import {css, html} from 'lit';
import {ScopedElementsMixin} from '@dbp-toolkit/common';
import * as commonStyles from '@dbp-toolkit/common/styles';
import {AdapterLitElement, LangMixin, AuthMixin} from '@dbp-toolkit/common';

export class DbpPortfolio extends AuthMixin(
    LangMixin(ScopedElementsMixin(AdapterLitElement), createInstance),
) {
    constructor() {
        super();
    }

    static get scopedElements() {
        return {};
    }

    static get properties() {
        return {
            ...super.properties,
        };
    }

    static get styles() {
        // language=css
        return css`
            ${commonStyles.getThemeCSS()}
            ${commonStyles.getGeneralCSS(false)}
        `;
    }

    render() {
        return html`
            test
        `;
    }
}

commonUtils.defineCustomElement('dbp-portfolio', DbpPortfolio);
