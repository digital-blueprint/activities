import {css, html} from 'lit';
import {ScopedElementsMixin} from '@open-wc/scoped-elements';
import * as commonUtils from '@dbp-toolkit/common/utils';
import * as commonStyles from '@dbp-toolkit/common/styles';
import * as demoStyles from './styles';
import {AdapterLitElement} from '@dbp-toolkit/provider/src/adapter-lit-element';
import {classMap} from 'lit/directives/class-map.js';

class DbpColorDemoActivity extends ScopedElementsMixin(AdapterLitElement) {
    constructor() {
        super();
        this.lang = 'en';
        this.entryPointUrl = '';
        this.dbpColors = true;
        this.checkerLevel = '';
        this.checker1 = '#ffffff';
        this.checker2 = '#000000';
    }

    static get scopedElements() {
        return {};
    }

    static get properties() {
        return {
            ...super.properties,
            lang: {type: String},
            entryPointUrl: {type: String, attribute: 'entry-point-url'},
            dbpColors: {type: Boolean, attribute: false},
            checkerLevel: {type: String, attribute: false},
            checker1: {type: String, attribute: false},
            checker2: {type: String, attribute: false},
        };
    }

    update(changedProperties) {
        changedProperties.forEach((oldValue, propName) => {
            switch (propName) {
                case 'checker1':
                    this.contrastChecker();
                    break;
                case 'checker2':
                    this.contrastChecker();
                    break;
            }
        });

        super.update(changedProperties);
    }

    connectedCallback() {
        super.connectedCallback();

        this.updateComplete.then(() => {});
    }

    _(selector) {
        return this.shadowRoot === null
            ? this.querySelector(selector)
            : this.shadowRoot.querySelector(selector);
    }

    hexToRgb(hex) {
        var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, function (m, r, g, b) {
            return r + r + g + g + b + b;
        });

        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
            ? {
                  r: parseInt(result[1], 16),
                  g: parseInt(result[2], 16),
                  b: parseInt(result[3], 16),
              }
            : null;
    }

    luminance(r, g, b) {
        var a = [r, g, b].map(function (v) {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    }

    calcContrastRatio(color1luminance, color2luminance) {
        const ratio =
            color1luminance > color2luminance
                ? (color1luminance + 0.05) / (color2luminance + 0.05)
                : (color2luminance + 0.05) / (color1luminance + 0.05);
        return ratio;
    }

    checkWCAGLevel(ratio) {
        if (ratio >= 7) return '✅ AAA-level small text';
        if (ratio >= 4.5) return '☑ AA-level small text';
        if (ratio >= 3) return '~ AA-level large text ' + ratio + ' should >= ' + 4.5;
        else return '❌ ratio: ' + ratio + ', it should >= ' + 4.5;
    }

    getWCAGfromHex(hex1, hex2) {
        if (!hex1 || !hex2) return '';

        hex1 = hex1 == 'black' ? '#000000' : hex1;
        hex1 = hex1 == 'white' ? '#ffffff' : hex1;
        hex2 = hex2 == 'black' ? '#000000' : hex2;
        hex2 = hex2 == 'white' ? '#ffffff' : hex2;

        let rgb1 = this.hexToRgb(hex1);
        let rgb2 = this.hexToRgb(hex2);



        if (!rgb1 || !rgb2) return '';

        let lum1 = this.luminance(rgb1.r, rgb1.g, rgb1.b);
        let lum2 = this.luminance(rgb2.r, rgb2.g, rgb2.b);

        let ratio = this.calcContrastRatio(lum1, lum2);

        return this.checkWCAGLevel(ratio);
    }

    contrastChecker() {
        this.checkerLevel = this.getWCAGfromHex(this.checker1, this.checker2);
    }

    contrast1OnChange(e) {
        this.checker1 = e.target.value;
    }

    contrast2OnChange(e) {
        this.checker2 = e.target.value;
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

                .buttons {
                    position: sticky;
                    top: 0px;
                    padding: 5px 5px 5px 0;
                    background-color: var(--dbp-background);
                }

                table {
                    border-spacing: 30px;
                    margin-top: 30px;
                }

                table tr td {
                    min-width: 140px;
                    padding: 10px 20px;
                    border: var(--border);
                }

                table tr td:first-child {
                    border: none;
                    padding-left: 0px;
                }

                .additional-information {
                    min-width: unset;
                    border: none;
                }

                .contrastChecker {
                    display: flex;
                    gap: 10px;
                    align-items: center;
                    padding-bottom: 50px;
                    margin-bottom: 50px;
                    border-bottom: var(--dbp-border);
                }
            `,
        ];
    }

    render() {
        const docStyle = getComputedStyle(this);
        const background = docStyle.getPropertyValue('--dbp-background');
        const content = docStyle.getPropertyValue('--dbp-content');
        const contentSurface = docStyle.getPropertyValue('--dbp-content-surface');
        const onContentSurface = docStyle.getPropertyValue('--dpp-override-on-content-surface');
        const backgroundContentContrast = this.getWCAGfromHex(background, content);
        const contentSurfaceContrast = this.getWCAGfromHex(contentSurface, onContentSurface);

        return html`
            <h2>Active Theme</h2>
            <p class="subheadline">Example Page for theme colors</p>
            <a class="link">Example</a>
            <a class="link-without-hover">Example</a>
            <br />
            <br />
            <button id="example" class="button is-primary" title="Example">primary</button>

            <button id="example" class="button" title="Example">secondary</button>

            <button id="example" class="button is-danger" title="Example">danger</button>

            <button id="example" class="button is-warning" title="Example">warning</button>

            <button id="example" class="button is-success" title="Example">success</button>

            <button id="example" class="button is-info" title="Example">info</button>

            <h3>Contrast Checker:</h3>
            <div class="contrastChecker">
                <input
                    type="color"
                    id="color1"
                    name="color1"
                    value="${this.checker1}"
                    @change=${this.contrast1OnChange} />
                <label for="color1">Color 1</label>
                <input
                    type="color"
                    id="color2"
                    name="color2"
                    value="${this.checker2}"
                    @change=${this.contrast2OnChange} />
                <label for="color2">Color 2</label>

                <div class="contrastCheckerOutput">${this.checkerLevel}</div>
            </div>

            <div class="buttons">
                <button
                    id="toggleDarkMode"
                    @click="${() => {
                        this.toggleDarkMode();
                    }}"
                    class="button"
                    title="Toggle Darkmode">
                    Toggle Darkmode
                </button>

                <button
                    id="changeToUniversityColors"
                    @click="${() => {
                        this.changeToUniversityColors();
                    }}"
                    class="button ${classMap({hidden: !this.dbpColors})}"
                    title="university colors">
                    University Colors
                </button>

                <button
                    id="changeToDbpColors"
                    @click="${() => {
                        this.changeToDbpColors();
                    }}"
                    class="button ${classMap({hidden: this.dbpColors})}"
                    title="dbp colors">
                    dbp colors
                </button>
            </div>

            <table>
                <tr>
                    <td>--dbp-override-background</td>
                    <td style="background-color: var(--dbp-background); border: var(--dbp-border);"></td>
                    <td class="additional-information">${background}</td>
                    <td class="additional-information"></td>
                </tr>
                <tr>
                    <td>--dbp-override-content</td>
                    <td style="background-color: var(--dbp-background); color: var(--dbp-content); border: var(--dbp-border);">--dbp-override-content</td>
                    <td class="additional-information">${content}</td>
                    <td class="additional-information">${backgroundContentContrast}</td>
                </tr>
                <tr>
                    <td>--dbp-override-content-surface</td>
                    <td style="background-color: var(--dbp-content-surface); var(--dbp-border);"></td>
                    <td class="additional-information">${contentSurface}</td>
                    <td class="additional-information"></td>
                </tr>
                <tr>
                    <td>--dbp-on-override-content-surface</td>
                    <td style="background-color: var(--dbp-content-surface); color: var(--dbp-on-content-surface); var(--dbp-border);">--dbp-on-override-content-surface</td>
                    <td class="additional-information">${onContentSurface}</td>
                    <td class="additional-information">${contentSurfaceContrast}</td>
                </tr>
                
            </table>
        `;
    }
}

commonUtils.defineCustomElement('dbp-color-demo-activity', DbpColorDemoActivity);
