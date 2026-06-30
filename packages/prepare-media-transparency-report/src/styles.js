import {css, unsafeCSS} from 'lit';
import {getIconSVGURL} from '@dbp-toolkit/common';

export function getMtReportCSS() {
    // language=css
    return css`
        * {
            box-sizing: border-box;
        }

        .hidden {
            display: none !important;
        }

        .login-warning-container {
            display: flex;
            align-items: center;
            gap: 0.5em;
            border: 1px solid var(--dbp-content);
            padding: 1.25rem 2.5rem 1.25rem 1.5rem;
        }

        .login-warning-container dbp-icon {
            font-size: 1.5em;
            color: var(--dbp-danger);
            top: initial;
        }

        .report-period-section {
            margin-bottom: 1em;
        }

        label {
            font-weight: 400;
        }

        fieldset {
            margin-bottom: 4em;
            padding: 1em;
        }

        legend {
            margin: -0.25em 0 0 0;
        }

        legend .legend-title {
            font-size: 1.25em;
            margin: 0;
        }

        section p {
            margin-top: 0;
            margin-bottom: 0.75em;
        }

        .section-title {
            border-left: 3px solid var(--dbp-primary);
            padding-left: 0.5em;
            margin-bottom: 0.5em;
        }

        .login-warning-container a,
        .section-description a {
            text-decoration: underline;
            text-underline-offset: 2px;
            transition: text-underline-offset 0.1s ease-in;
        }

        .login-warning-container a:hover,
        .section-description a:hover {
            text-underline-offset: 1px;
        }

        .report-period-section {
            margin-bottom: 1.5em;
        }

        ul.instructions-list {
            margin: 1.5em 0;
            line-height: 1.5em;
        }

        .selector-container-wrapper {
            display: flex;
            gap: 2em;
            flex-wrap: wrap;
            margin-top: 1em;
        }

        .selector-container {
            display: flex;
            gap: 1em;
            justify-content: center;
            align-items: center;
        }

        select.category-selector {
            background-size: 0.75em;
            background: none;
            height: 2em;
            width: 7em;
            padding: 0 1.5em 0 0.5em;
        }

        .selector-container {
            position: relative;
        }

        .selector-container::after {
            content: '';
            position: absolute;
            right: 0.6em;
            width: 1em;
            height: 1em;
            pointer-events: none;
            background-color: currentColor;
            mask: url('${unsafeCSS(getIconSVGURL('chevron-down'))}') center/contain no-repeat;
            -webkit-mask: url('${unsafeCSS(getIconSVGURL('chevron-down'))}') center/contain
                no-repeat;
        }

        select option {
            background: var(--dbp-background);
            color: var(--dbp-content);
        }

        .button-container {
            display: flex;
            gap: 1em;
        }

        .button-container--download-sujet {
        }

        .export-sujet-status {
            width: 100%;
            display: flex;
            justify-content: flex-start;
            align-items: center;
            margin-top: 1.5em;
        }

        .button-container.button-container--export-csv {
            align-items: center;
            justify-content: flex-start;
        }

        .report-status {
            width: 100%;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            align-items: flex-start;
            gap: 0.25em;
            margin-top: 1.5em;
        }

        .report-status-line {
            display: flex;
            align-items: center;
            gap: 0.5em;
        }

        .report-status dbp-icon {
            top: initial;
        }

        /* buttons */
        dbp-button dbp-icon {
            margin-right: 0.5em;
            transition: transform 0.1s ease-in;
        }

        dbp-button:hover dbp-icon {
            transform: scale(1.2);
        }

        dbp-button[disabled]:hover dbp-icon {
            transform: none;
        }

        a[target='_blank']::after {
            content: '';
            display: inline-block;
            vertical-align: text-top;
            font-size: 1em;
            height: 0.75em;
            width: 0.75em;
            background-color: currentColor;
            mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' version='1.1' viewBox='0 0 512 512' width='16' height='16'%3E%3Cpath d='M 304.5,-0.5 C 366.5,-0.5 428.5,-0.5 490.5,-0.5C 501.167,2.83333 508.167,9.83333 511.5,20.5C 511.5,82.5 511.5,144.5 511.5,206.5C 501.584,227.306 486.251,232.472 465.5,222C 460.347,217.523 456.847,212.023 455,205.5C 454.667,169.833 454.333,134.167 454,98.5C 375.5,177 297,255.5 218.5,334C 206.598,343.031 194.265,343.697 181.5,336C 167.479,322.809 165.979,308.309 177,292.5C 255.5,214 334,135.5 412.5,57C 376.833,56.6667 341.167,56.3333 305.5,56C 288.961,50.441 281.795,38.941 284,21.5C 287.259,10.7444 294.092,3.41106 304.5,-0.5 Z'/%3E%3Cpath d='M 382.5,511.5 C 278.833,511.5 175.167,511.5 71.5,511.5C 32.4961,502.496 8.49613,478.496 -0.5,439.5C -0.5,335.833 -0.5,232.167 -0.5,128.5C 6.92037,93.5765 27.587,70.4099 61.5,59C 68.0469,57.2228 74.7136,56.2228 81.5,56C 121.167,55.3333 160.833,55.3333 200.5,56C 216.888,58.5531 225.888,68.0531 227.5,84.5C 227.125,99.3742 219.792,108.874 205.5,113C 164.167,113.333 122.833,113.667 81.5,114C 67.559,116.941 59.3923,125.441 57,139.5C 56.3333,235.833 56.3333,332.167 57,428.5C 59.5,443 68,451.5 82.5,454C 178.833,454.667 275.167,454.667 371.5,454C 385.559,451.608 394.059,443.441 397,429.5C 397.333,388.167 397.667,346.833 398,305.5C 403.567,288.95 415.067,281.783 432.5,284C 445.306,287.806 452.806,296.306 455,309.5C 455.667,349.833 455.667,390.167 455,430.5C 451.897,466.246 434.064,491.413 401.5,506C 395.165,508.289 388.831,510.123 382.5,511.5 Z'/%3E%3C/svg%3E%0A");
            mask-repeat: no-repeat;
            mask-size: contain;
        }

        @media screen and (max-width: 480px) {
            .selector-container-wrapper {
                flex-wrap: wrap;
            }

            .selector-container label {
                width: 4em;
            }

            ul.instructions-list {
                padding-left: 1.25em;
            }
        }
    `;
}
