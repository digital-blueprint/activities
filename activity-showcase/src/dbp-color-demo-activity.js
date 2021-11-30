import {css, html} from 'lit';
import {ScopedElementsMixin} from '@open-wc/scoped-elements';
import * as commonUtils from '@dbp-toolkit/common/utils';
import * as commonStyles from '@dbp-toolkit/common/styles';
import {unsafeHTML} from 'lit/directives/unsafe-html.js';
import readme from '@dbp-topics/clipboard/README.md';
import * as demoStyles from "./styles";
import {AdapterLitElement} from "@dbp-toolkit/provider/src/adapter-lit-element";
import {classMap} from 'lit/directives/class-map.js';

class DbpColorDemoActivity extends ScopedElementsMixin(AdapterLitElement) {
    constructor() {
        super();
        this.lang = 'en';
        this.entryPointUrl = '';
        this.dbpColors = true;
        this.checkerLevel = '';
    }

    static get scopedElements() {
        return {
        };
    }

    static get properties() {
        return {
            ...super.properties,
            lang: { type: String },
            entryPointUrl: { type: String, attribute: 'entry-point-url' },
            dbpColors: { type: Boolean, attribute: false },
            checkerLevel: { type: String, attribute: false },
        };
    }

    connectedCallback() {
        super.connectedCallback();

        this.updateComplete.then(()=>{
        });
    }

    _(selector) {
        return this.shadowRoot === null ? this.querySelector(selector) : this.shadowRoot.querySelector(selector);
    }

    hexToRgb(hex) {
        var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, function(m, r, g, b) {
            return r + r + g + g + b + b;
        });

        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    luminance(r, g, b) {
        var a = [r, g, b].map(function (v) {
            v /= 255;
            return v <= 0.03928
                ? v / 12.92
                : Math.pow( (v + 0.055) / 1.055, 2.4 );
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    }

    calcContrastRatio(color1luminance, color2luminance) {
        const ratio = color1luminance > color2luminance
            ? ((color2luminance + 0.05) / (color1luminance + 0.05))
            : ((color1luminance + 0.05) / (color2luminance + 0.05));
        return ratio;
    }

    checkWCAGLevel(ratio) {
        if (ratio < 1/7)
            return "AAA-level small text";
        if (ratio < 1/4.5)
            return "AA-level small text";
        if (ratio < 1/3)
            return "AA-level large text"
        else
            return "ratio: " + ratio + ", it should < " + 1/4.5;
    }

    getWCAGfromHex(hex1, hex2) {
        if (!hex1 || !hex2)
            return "";

        let rgb1 = this.hexToRgb(hex1);
        let rgb2 = this.hexToRgb(hex2);

        let lum1 = this.luminance(rgb1.r, rgb1.g, rgb1.b);
        let lum2 = this.luminance(rgb2.r, rgb2.g, rgb2.b);

        let ratio = this.calcContrastRatio(lum1, lum2);

        return this.checkWCAGLevel(ratio);
    }

    contrastChecker() {
        let color1 = this._("#color1").value;
        let color2 = this._("#color2").value;
        this.checkerLevel = this.getWCAGfromHex(color1, color2);
    }

    toggleDarkMode() {
        const docStyle = getComputedStyle(this);

        const baseLight = docStyle.getPropertyValue('--base-light');
        const baseDark = docStyle.getPropertyValue('--base-dark');
        const textLight = docStyle.getPropertyValue('--text-light');
        const textDark = docStyle.getPropertyValue('--text-dark');

        const textMutedLight = docStyle.getPropertyValue('--text-muted-light');
        const textMutedDark = docStyle.getPropertyValue('--text-muted-dark');

        const primaryLight = docStyle.getPropertyValue('--primary-light');
        const primaryDark = docStyle.getPropertyValue('--primary-dark');

        const secondaryLight = docStyle.getPropertyValue('--secondary-light');
        const secondaryDark = docStyle.getPropertyValue('--secondary-dark');

        const infoLight = docStyle.getPropertyValue('--info-light');
        const infoDark = docStyle.getPropertyValue('--info-dark');

        const successLight = docStyle.getPropertyValue('--success-light');
        const successDark = docStyle.getPropertyValue('--success-dark');

        const warningLight = docStyle.getPropertyValue('--warning-light');
        const warningDark = docStyle.getPropertyValue('--warning-dark');

        const dangerLight = docStyle.getPropertyValue('--danger-light');
        const dangerDark = docStyle.getPropertyValue('--danger-dark');

        const borderLight = docStyle.getPropertyValue('--border-light');
        const borderDark = docStyle.getPropertyValue('--border-dark');

        this.style.setProperty('--base-light', baseDark);
        this.style.setProperty('--base-dark', baseLight);
        this.style.setProperty('--text-light', textDark);
        this.style.setProperty('--text-dark', textLight);
        this.style.setProperty('--text-muted-light', textMutedDark);
        this.style.setProperty('--text-muted-dark', textMutedLight);
        this.style.setProperty('--primary-light', primaryDark);
        this.style.setProperty('--primary-dark', primaryLight);
        this.style.setProperty('--secondary-light', secondaryDark);
        this.style.setProperty('--secondary-dark', secondaryLight);
        this.style.setProperty('--info-light', infoDark);
        this.style.setProperty('--info-dark', infoLight);
        this.style.setProperty('--success-light', successDark);
        this.style.setProperty('--success-dark', successLight);
        this.style.setProperty('--warning-light', warningDark);
        this.style.setProperty('--warning-dark', warningLight);
        this.style.setProperty('--danger-light', dangerDark);
        this.style.setProperty('--danger-dark', dangerLight);
        this.style.setProperty('--border-light', borderDark);
        this.style.setProperty('--border-dark', borderLight);

        this.requestUpdate();
    }

    changeToUniversityColors() {
        this.dbpColors = false;

        const baseLight = "#ffffff";
        const baseDark = "#000000";
        const textLight = "#ffffff";
        const textDark = "#000000";
        const textMutedLight = "#afaca7";
        const textMutedDark = "#5c5856";
        const primaryLight = "#3690b1";
        const primaryDark = "#245b78";
        const secondaryLight = "#ffffff";
        const secondaryDark = "#000000";
        const infoLight = "#3690b1";
        const infoDark = "#245b78";
        const successLight = "#31a142";
        const successDark = "#1a6729";
        const warningLight = "#ffc107";
        const warningDark = "#bf5900";
        const dangerLight = "#e4154b";
        const dangerDark = "#e4154b";
        const borderLight = "1px solid #ffffff";
        const borderDark = "1px solid #000000";

        this.style.setProperty('--base-light', baseLight);
        this.style.setProperty('--base-dark', baseDark);
        this.style.setProperty('--text-light', textLight);
        this.style.setProperty('--text-dark', textDark);
        this.style.setProperty('--text-muted-light', textMutedLight);
        this.style.setProperty('--text-muted-dark', textMutedDark);
        this.style.setProperty('--primary-light', primaryLight);
        this.style.setProperty('--primary-dark', primaryDark);
        this.style.setProperty('--secondary-light', secondaryLight);
        this.style.setProperty('--secondary-dark', secondaryDark);
        this.style.setProperty('--info-light', infoLight);
        this.style.setProperty('--info-dark', infoDark);
        this.style.setProperty('--success-light', successLight);
        this.style.setProperty('--success-dark', successDark);
        this.style.setProperty('--warning-light', warningLight);
        this.style.setProperty('--warning-dark', warningDark);
        this.style.setProperty('--danger-light', dangerLight);
        this.style.setProperty('--danger-dark', dangerDark);
        this.style.setProperty('--border-light', borderLight);
        this.style.setProperty('--border-dark', borderDark);
    }

    changeToDbpColors() {
        this.dbpColors = true;

        const baseLight = "#ffffff";
        const baseDark = "#100d0f";
        const textLight = "#ffffff";
        const textDark = "#100d0f";
        const textMutedLight = "#afaca7";
        const textMutedDark = "#5c5856";
        const primaryLight = "#5b95c4";
        const primaryDark = "#2a4491";
        const secondaryLight = "#ffffff";
        const secondaryDark = "#100d0f";
        const infoLight = "#5b95c4";
        const infoDark = "#2a4491";
        const successLight = "#73c14a";
        const successDark = "#436726";
        const warningLight = "#f39e1d";
        const warningDark = "#74410a";
        const dangerLight = "#db425b";
        const dangerDark = "#d21728";
        const borderLight = "1px solid #ffffff";
        const borderDark = "1px solid #100d0f";

        this.style.setProperty('--base-light', baseLight);
        this.style.setProperty('--base-dark', baseDark);
        this.style.setProperty('--text-light', textLight);
        this.style.setProperty('--text-dark', textDark);
        this.style.setProperty('--text-muted-light', textMutedLight);
        this.style.setProperty('--text-muted-dark', textMutedDark);
        this.style.setProperty('--primary-light', primaryLight);
        this.style.setProperty('--primary-dark', primaryDark);
        this.style.setProperty('--secondary-light', secondaryLight);
        this.style.setProperty('--secondary-dark', secondaryDark);
        this.style.setProperty('--info-light', infoLight);
        this.style.setProperty('--info-dark', infoDark);
        this.style.setProperty('--success-light', successLight);
        this.style.setProperty('--success-dark', successDark);
        this.style.setProperty('--warning-light', warningLight);
        this.style.setProperty('--warning-dark', warningDark);
        this.style.setProperty('--danger-light', dangerLight);
        this.style.setProperty('--danger-dark', dangerDark);
        this.style.setProperty('--border-light', borderLight);
        this.style.setProperty('--border-dark', borderDark);

        this.requestUpdate();

    }

    static get styles() {
        // language=css
        return [
            commonStyles.getThemeCSS(),
            commonStyles.getGeneralCSS(),
            commonStyles.getButtonCSS(),
            demoStyles.getDemoCSS(),

            css`
            h1.title {margin-bottom: 1em;}
            div.container {margin-bottom: 1.5em;}

            #demo{
                display: block;
                padding-top: 50px;
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
            
            table{
                border-spacing: 30px;
                margin-top: 30px;
            }
            
            table tr td{
                min-width: 140px;
                padding: 10px 20px;
                border: var(--border-dark);
            }

            table tr td:first-child{
                border: none;
                padding-left: 0px;
            }

            .additional-information{
                min-width: unset;
                border: none;
            }

            :host {
                --base-light: #ffffff;
                --base-dark: #100d0f;
                --text-light: #ffffff;
                --text-dark: #100d0f;
                --text-muted-light: #afaca7;
                --text-muted-dark: #5c5856;
                --primary-light: #5b95c4;
                --primary-dark: #2a4491;
                --secondary-light: #ffffff;
                --secondary-dark: #100d0f;
                --info-light: #5b95c4;
                --info-dark: #2a4491;
                --success-light: #73c14a;
                --success-dark: #436726;
                --warning-light: #f39e1d;
                --warning-dark: #74410a;
                --danger-light: #db425b;
                --danger-dark: #d21728;
                --border-light: 1px solid #ffffff;
                --border-dark: 1px solid #100d0f;
                --border-radius: 0px;
            }
            
            .base-light{
                background-color: var(--base-light);
                color: var(--text-dark);
            }

            .base-dark{
                background-color: var(--base-dark);
                color: var(--text-light);
            }

            .text-light:nth-child(2){
                background-color: var(--text-light);
            }
            
            .text-light{
                background-color: var(--base-dark);
                color: var(--text-light);
            }

            .text-dark:nth-child(2){
                background-color: var(--text-dark);
            }
            
            .text-dark{
                background-color: var(--base-light);
                color: var(--text-dark);
            }

            .text-muted-light:nth-child(2){
                background-color: var(--text-muted-light);
            }
            
            .text-muted-light{
                background-color: var(--base-dark);
                color: var(--text-muted-light);
            }
            
            .text-muted-dark{
                background-color: var(--base-light);
                color: var(--text-muted-dark);
            }

            .text-muted-dark:nth-child(2){
                background-color: var(--text-muted-dark);
            }

            /* primary */
            .primary-light{
                color: var(--text-dark);
                background-color: var(--primary-light);
            }
            
            .primary-dark{
                color: var(--text-light);
                background-color: var(--primary-dark);
            }

            .primary-dark:nth-child(4){
                color: var(--primary-dark);
                background-color: var(--base-light);
            }
            
            /* secondary */
            .secondary-light{
                color: var(--text-dark);
                background-color: var(--secondary-light);
            }

            .secondary-dark{
                color: var(--text-light);
                background-color: var(--secondary-dark);
            }

            .secondary-dark:nth-child(4){
                color: var(--secondary-dark);
                background-color: var(--base-light);
            }

            /* info */
            .info-light{
                color: var(--text-dark);
                background-color: var(--info-light);
            }

            .info-dark{
                color: var(--text-light);
                background-color: var(--info-dark);
            }

            .info-dark:nth-child(4){
                color: var(--info-dark);
                background-color: var(--base-light);
            }

            /* success */
            .success-light{
                color: var(--text-dark);
                background-color: var(--success-light);
            }

            .success-dark{
                color: var(--text-light);
                background-color: var(--success-dark);
            }

            .success-dark:nth-child(4){
                color: var(--success-dark);
                background-color: var(--base-light);
            }

            /* warning */
            .warning-light{
                color: var(--text-dark);
                background-color: var(--warning-light);
            }

            .warning-dark{
                color: var(--text-light);
                background-color: var(--warning-dark);
            }

            .warning-dark:nth-child(4){
                color: var(--warning-dark);
                background-color: var(--base-light);
            }

            /* danger */
            .danger-light{
                color: var(--text-dark);
                background-color: var(--danger-light);
            }

            .danger-dark{
                color: var(--text-light);
                background-color: var(--danger-dark);
            }

            .danger-dark:nth-child(4){
                color: var(--danger-dark);
                background-color: var(--base-light);
            }
            
            /* border */
            
            .border{
                background-color: var(--base-light);
                border: var(--border-dark);
            }

            .border-radius {
                background-color: var(--base-light);
                border: var(--border-dark);
                border-radius: var(--border-radius);
            }
            

            .contrastChecker {
                display: flex;
                gap: 10px;
                align-items: center;
                padding-bottom: 50px;
                margin-bottom: 50px;
                border-bottom: 1px solid black;
            }
         
            
            
            `
        ];
    }

    render() {

        const docStyle = getComputedStyle(this);
        const baseLight = docStyle.getPropertyValue('--base-light');
        const baseDark = docStyle.getPropertyValue('--base-dark');
        const textLight = docStyle.getPropertyValue('--text-light');
        const textDark = docStyle.getPropertyValue('--text-dark');
        const baseDarkTextLightRatio = this.getWCAGfromHex(baseDark, textLight);
        const baseLightTextDarkRatio = this.getWCAGfromHex(baseLight, textDark);

        const textMutedLight = docStyle.getPropertyValue('--text-muted-light');
        const textMutedDark = docStyle.getPropertyValue('--text-muted-dark');
        const baseDarkTextmutedLightRatio = this.getWCAGfromHex(baseDark, textMutedLight);
        const baseLightTextMutedDarkRatio = this.getWCAGfromHex(baseLight, textMutedDark);

        const primaryLight = docStyle.getPropertyValue('--primary-light');
        const primaryDark = docStyle.getPropertyValue('--primary-dark');
        const baseDarkPrimaryLightRatio = this.getWCAGfromHex(baseDark, primaryLight);
        const baseLightPrimaryDarkRatio = this.getWCAGfromHex(baseLight, primaryDark);


        const secondaryLight = docStyle.getPropertyValue('--secondary-light');
        const secondaryDark = docStyle.getPropertyValue('--secondary-dark');
        const baseDarkSecondaryLightRatio = this.getWCAGfromHex(baseDark, secondaryLight);
        const baseLightSecondaryDarkRatio = this.getWCAGfromHex(baseLight, secondaryDark);

        const infoLight = docStyle.getPropertyValue('--info-light');
        const infoDark = docStyle.getPropertyValue('--info-dark');
        const baseDarkInfoLightRatio = this.getWCAGfromHex(baseDark, infoLight);
        const baseLightInfoDarkRatio = this.getWCAGfromHex(baseLight, infoDark);

        const successLight = docStyle.getPropertyValue('--success-light');
        const successDark = docStyle.getPropertyValue('--success-dark');
        const baseDarkSuccessLightRatio = this.getWCAGfromHex(baseDark, successLight);
        const baseLightSuccessDarkRatio = this.getWCAGfromHex(baseLight, successDark);

        const warningLight = docStyle.getPropertyValue('--warning-light');
        const warningDark = docStyle.getPropertyValue('--warning-dark');
        const baseDarkWarningLightRatio = this.getWCAGfromHex(baseDark, warningLight);
        const baseLightWarningDarkRatio = this.getWCAGfromHex(baseLight, warningDark);

        const dangerLight = docStyle.getPropertyValue('--danger-light');
        const dangerDark = docStyle.getPropertyValue('--danger-dark');
        const baseDarkDangerLightRatio = this.getWCAGfromHex(baseDark, dangerLight);
        const baseLightDangerDarkRatio = this.getWCAGfromHex(baseLight, dangerDark);

        const border = docStyle.getPropertyValue('--border-dark');
        const borderRadius = docStyle.getPropertyValue('--border-radius');



        const i18n = this._i18n;
        return html`
            <h2>Our colors</h2>
            <p class="subheadline">
                Example Page for dbp colors
            </p>

            <h3>Contrast Checker:</h3>
            <div class="contrastChecker">
                <input type="color" id="color1" name="color1" value="#ffffff">
                <label for="color1">Color 1</label>
                <input type="color" id="color2" name="color2" value="#000000">
                <label for="color2">Color 2</label>

                <button id="checkContrast" @click="${() => { this.contrastChecker(this.checker1, this.checker2); }}" class="button"">
                Contrast Checker
                </button>
                
                <div class="contrastCheckerOutput">${this.checkerLevel}</div>
            </div>
            
            <button id="toggleDarkMode" @click="${() => { this.toggleDarkMode(); }}" class="button" title="Toggle Darkmode">
                Toggle Darkmode
            </button>

            <button id="changeToUniversityColors" @click="${() => { this.changeToUniversityColors(); }}" 
                    class="button ${classMap({hidden: !this.dbpColors})}" title="university colors">
                University Colors
            </button>

            <button id="changeToDbpColors" @click="${() => { this.changeToDbpColors(); }}" 
                    class="button ${classMap({hidden: this.dbpColors})}" title="dbp colors">
                dbp colors
            </button>
            
            <table class="dbp-colors base-light">
                <caption><h3>${this.dbpColors ? "dbp Colors" : "University Colors"}</h3></caption>
                <tr>
                    <td>base-light</td>
                    <td class="base-light"></td>
                    <td class="base-light">base-light</td>
                    <td class="additional-information">${baseLight}</td>
                    <td class="additional-information"></td>
                </tr>
                <tr>
                    <td>base-dark</td>
                    <td class="base-dark"></td>
                    <td class="base-dark">base-dark</td>
                    <td class="additional-information">${baseDark}</td>
                    <td class="additional-information"></td>
                </tr>
                <tr>
                    <td>text-light</td>
                    <td class="text-light"></td>
                    <td class="text-light">text-light</td>
                    <td class="additional-information">${textLight}</td>
                    <td class="additional-information">${baseDarkTextLightRatio}</td>
                </tr>
                <tr>
                    <td>text-dark</td>
                    <td class="text-dark"></td>
                    <td class="text-dark">text-dark</td>
                    <td class="additional-information">${textDark}</td>
                    <td class="additional-information">${baseLightTextDarkRatio}</td>
                </tr>
                <tr>
                    <td>text-muted-light</td>
                    <td class="text-muted-light"></td>
                    <td class="text-muted-light">text-muted-light</td>
                    <td class="additional-information">${textMutedLight}</td>
                    <td class="additional-information">${baseDarkTextmutedLightRatio}</td>
                </tr>
                <tr>
                    <td>text-muted-dark</td>
                    <td class="text-muted-dark"></td>
                    <td class="text-muted-dark">text-muted-dark</td>
                    <td class="additional-information">${textMutedDark}</td>
                    <td class="additional-information">${baseLightTextMutedDarkRatio}</td>
                </tr>
                <tr>
                    <td>primary-light</td>
                    <td class="primary-light"></td>
                    <td class="primary-light">primary-light</td>
                    <td class="additional-information">${primaryLight}</td>
                    <td class="additional-information">${baseDarkPrimaryLightRatio}</td>
                </tr>
                <tr>
                    <td>primary-dark</td>
                    <td class="primary-dark"></td>
                    <td class="primary-dark">primary-dark</td>
                    <td class="additional-information primary-dark">${primaryDark}</td>
                    <td class="additional-information">${baseLightPrimaryDarkRatio}</td>
                </tr>
                <tr>
                    <td>secondary-light</td>
                    <td class="secondary-light"></td>
                    <td class="secondary-light">secondary-light</td>
                    <td class="additional-information">${secondaryLight}</td>
                    <td class="additional-information">${baseDarkSecondaryLightRatio}</td>
                </tr>
                <tr>
                    <td>secondary-dark</td>
                    <td class="secondary-dark"></td>
                    <td class="secondary-dark">secondary-dark</td>
                    <td class="additional-information secondary-dark">${secondaryDark}</td>
                    <td class="additional-information">${baseLightSecondaryDarkRatio}</td>
                </tr>
                <tr>
                    <td>info-light</td>
                    <td class="info-light"></td>
                    <td class="info-light">info-light</td>
                    <td class="additional-information">${infoLight}</td>
                    <td class="additional-information">${baseDarkInfoLightRatio}</td>
                </tr>
                <tr>
                    <td>info-dark</td>
                    <td class="info-dark"></td>
                    <td class="info-dark">info-dark</td>
                    <td class="additional-information info-dark">${infoDark}</td>
                    <td class="additional-information">${baseLightInfoDarkRatio}</td>
                </tr>
                <tr>
                    <td>success-light</td>
                    <td class="success-light"></td>
                    <td class="success-light">success-light</td>
                    <td class="additional-information">${successLight}</td>
                    <td class="additional-information">${baseDarkSuccessLightRatio}</td>
                </tr>
                <tr>
                    <td>success-dark</td>
                    <td class="success-dark"></td>
                    <td class="success-dark">success-dark</td>
                    <td class="additional-information success-dark">${successDark}</td>
                    <td class="additional-information">${baseLightSuccessDarkRatio}</td>
                </tr>
                <tr>
                    <td>warning-light</td>
                    <td class="warning-light"></td>
                    <td class="warning-light">warning-light</td>
                    <td class="additional-information">${warningLight}</td>
                    <td class="additional-information">${baseDarkWarningLightRatio}</td>
                </tr>
                <tr>
                    <td>warning-dark</td>
                    <td class="warning-dark"></td>
                    <td class="warning-dark">warning-dark</td>
                    <td class="additional-information warning-dark">${warningDark}</td>
                    <td class="additional-information">${baseLightWarningDarkRatio}</td>
                </tr>
                <tr>
                    <td>danger-light</td>
                    <td class="danger-light"></td>
                    <td class="danger-light">danger-light</td>
                    <td class="additional-information">${dangerLight}</td>
                    <td class="additional-information">${baseDarkDangerLightRatio}</td>
                </tr>
                <tr>
                    <td>danger-dark</td>
                    <td class="danger-dark"></td>
                    <td class="danger-dark">danger-dark</td>
                    <td class="additional-information danger-dark">${dangerDark}</td>
                    <td class="additional-information">${baseLightDangerDarkRatio}</td>
                </tr>
                <tr>
                    <td>border</td>
                    <td class="border"></td>
                    <td class="additional-information">${border}</td>
                </tr>
                <tr>
                    <td>border-radius</td>
                    <td class="border-radius"></td>
                    <td class="additional-information">${borderRadius}</td>
                </tr>
            </table>
            
            
        `;
    }
}

commonUtils.defineCustomElement('dbp-color-demo-activity', DbpColorDemoActivity);
