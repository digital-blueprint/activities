import { css } from 'lit';

export function getGroupManageCSS() {
    // language=css
    return css`
        :host {
            --border-color: color-mix(in srgb, var(--dbp-content) 30%, transparent);
            --border-color-rotated: color-mix(in srgb, var(--dbp-content) 60%, transparent);
            --input-bg-color: color-mix(in srgb, var(--dbp-content) 80%, transparent);
            --animation-time: .25s;
            --table-line-height: 3em;
            --space: 2em;
            --space-half: calc(var(--space) * .5);
            --space-2x: calc(var(--space) * 2);
            --space-3x: calc(var(--space) * 3);
            --space-4x: calc(var(--space) * 4);
        }

        ::backdrop {
            background-color: rgba(0,0,0,0.75);
            backdrop-filter: blur(2px);
        }

        .hidden {
            display: none !important;
        }

        li {
            list-style: none;
        }

        .section {
            margin-bottom: 2em;
            border: 1px solid var(--border-color);
            padding: 2em;
        }

        .section-heading {
            margin-bottom: .5em;
        }

        .form {
            display: flex;
            flex-direction: column;
            gap: 1em;
        }

        .form-label {
            display: flex;
            flex-direction: column;
            max-width: fit-content;
            gap: .3em;
        }

        input[type="text"] {
            height: 1.9em;
            padding: 0 .5em;
            background-color: var(--dbp-background);
            color: var(--dbp-content);
            border: 1px solid var(--border-color);
            /* transition: border-color var(--animation-duration) ease-in; */
        }

        input[type="text"].not-found {
            border-color: var(--dbp-danger);
            box-shadow: inset 0px 0 7px 0px var(--dbp-danger);
        }

        input[type="text"]:not(:focus):invalid {
            outline: 3px solid var(--dbp-danger);
        }

        input[type="text"]:not(:focus):invalid + .form-error {
            display: block;
        }

        input[type="text"]:valid + .form-error {
            display: none;
        }

        .form-error {
            display: none;
            color: var(--dbp-danger);
        }

        dbp-inline-notification {
            padding-top: var(--space);
            opacity: 0;
            visibility: hidden;
            display: none;
            animation: fadeInOut 1s ease-in-out;
        }

        dbp-inline-notification.show {
            opacity: 1;
            visibility: visible;
            display: block;
        }

        dbp-loading-button {
            max-width: fit-content;
        }

        .list-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: var(--space-half) calc(var(--space-half) / 2) var(--space-half) var(--space-half);
        }

        .row {
            container: group-row / inline-size;
        }

        .row:has(.group-member-list.open:first-of-type) {
            border-left: 3px solid var(--dbp-content);
        }

        @container group-row (width < 600px) {
            .group-member-list[data-level] > li > .group-member {
                padding-left: calc(5px * (var(--data-level) - 1)) !important;
            }
        }

        .group-header {
            line-height: var(--table-line-height);
            height: var(--table-line-height);
            padding: 0 var(--space-half);
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-top: 1px solid var(--border-color);
            /* border-bottom: 0 none;
            border-right: 0 none; */
            background-color: var(--dbp-background);
        }

        .group-name {
            flex-grow: 1;
            display: flex;
            align-items: center;
            white-space: nowrap;
        }

        .group-controls {
            display: flex;
            align-items: center;
            gap: var(--space-half);
            opacity: 0;
            transition: opacity var(--animation-time) linear;
        }

        .group-header:has(:focus-within) .group-controls {
            opacity: 1;
        }

        .row.found > .group-header,
        .row.hover > .group-header,
        .group-header.hover,
        .group-header:hover,
        .group-member:hover {
            filter: invert(1);
            opacity: .7;
        }

        .row.found > .group-header .group-controls,
        .row.hover > .group-header .group-controls,
        .group-header.hover .group-controls,
        .group-header:hover .group-controls,
        .group-member:hover .group-controls {
            opacity: 1;
        }

        /* Hide all rows that don't contains found items as a direct child */
        .search-is-active .row:not(.found):has(.group-header:not(.found-item)) > .group-header {
            display: none ;
        }

        /* Unhide rows that contains found items. */
        .search-is-active .row:has(.found) > .group-header,
        .search-is-active .row.found > .group-header.found-item {
            display: flex !important;
        }

        .group-list-container {
            opacity: 0;
            height: 0;
            border: 1px solid var(--border-color);
            transition: var(--animation-time) opacity linear;
        }

        .group-list-container.visible {
            opacity: 1;
            margin-top: 2em;
            margin-bottom: 2em;
            height: fit-content;
        }

        .group-member-list[data-level] > li > .group-member {
            padding-left: calc(var(--space) * (var(--data-level) - 1));
        }

        .group-member-list {
            opacity: 0;
            display: none;
            animation: fadeInOut var(--animation-time) ease-in;
        }

        .group-member-list.open {
            opacity: 1;
            display: block;
        }

        .root-group:before,
        .child-group-icon:before,
        .user-name-icon:before {
            content: '';
            display: inline-block;
            background-position: 0 12px;
            background-repeat: no-repeat;
            background-size: 20px;
            width: 30px;
            height: var(--table-line-height);
            filter: invert(var(--dbp-light-theme));
        }

        .root-group:before {
            background-image: url("data:image/svg+xml,%3Csvg fill='%23ffffff' width='22.687498' height='19.1625' version='1.1' id='lni_lni-folder' x='0px' y='0px' viewBox='0 0 60.499995 51.100001' xml:space='preserve' sodipodi:docname='folder-icon.svg' inkscape:export-filename='folder-icon-inverted.svg' inkscape:export-xdpi='96' inkscape:export-ydpi='96' xmlns:inkscape='http://www.inkscape.org/namespaces/inkscape' xmlns:sodipodi='http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd' xmlns='http://www.w3.org/2000/svg' xmlns:svg='http://www.w3.org/2000/svg'%3E%3Cdefs id='defs1' /%3E%3Csodipodi:namedview id='namedview1' pagecolor='%23ffffff' bordercolor='%23000000' borderopacity='0.25' inkscape:showpageshadow='2' inkscape:pageopacity='0.0' inkscape:pagecheckerboard='true' inkscape:deskcolor='%23d1d1d1' /%3E%3Crect style='fill:%23ffffff;fill-opacity:1;stroke:none;stroke-width:8;stroke-linecap:round;stroke-linejoin:round;stroke-opacity:1' id='rect1' width='55.704857' height='41.240376' x='1.8104727' y='7.0478868' ry='15.151261' rx='0' /%3E%3Crect style='fill:%23ffffff;fill-opacity:1;stroke:none;stroke-width:8;stroke-linecap:round;stroke-linejoin:round;stroke-opacity:1' id='rect2' width='35.890896' height='9.4465046' x='1.8689146' y='4.1689882' ry='4.7232523' rx='0' /%3E%3Cpath d='M 59.2,13.1 V 9.8 C 59.2,6.4 56.5,3.7 53.1,3.7 H 30.9 L 30.6,2.9 C 29.9,1.1 28.2,0 26.3,0 H 6.1 C 2.7,0 4.7683717e-8,2.7 4.7683717e-8,6.1 V 45 C 4.7683717e-8,48.4 2.7,51.1 6.1,51.1 h 48.3 c 3.4,0 6.1,-2.7 6.1,-6.1 V 16.2 C 60.5,15 60,13.9 59.2,13.1 Z m -6.1,-5 c 0.9,0 1.6,0.7 1.6,1.6 v 1.9 H 34.1 L 32.7,8.1 Z M 56,45 c 0,0.9 -0.7,1.6 -1.6,1.6 H 6.1 C 5.2,46.6 4.5,45.9 4.5,45 V 6 C 4.5,5.1 5.2,4.4 6.1,4.4 l 20.3,0.1 4.1,10.2 c 0.3,0.9 1.2,1.4 2.1,1.4 h 23.3 c 0,0 0.1,0 0.1,0.1 z' id='path1' style='fill:%23010101;fill-opacity:1;stroke:none;stroke-opacity:1' /%3E%3C/svg%3E%0A");
        }

        .child-group-icon:before {
            background-image: url("data:image/svg+xml,%3Csvg fill='%23ffffff' width='24' height='24' version='1.1' id='lni_lni-folder' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' x='0px' y='0px' viewBox='0 0 64 64' style='enable-background:new 0 0 64 64;' xml:space='preserve'%3E%3Cpath d='M61,19.6v-3.3c0-3.4-2.7-6.1-6.1-6.1H32.7l-0.3-0.8c-0.7-1.8-2.4-2.9-4.3-2.9H7.9c-3.4,0-6.1,2.7-6.1,6.1v38.9 c0,3.4,2.7,6.1,6.1,6.1h48.3c3.4,0,6.1-2.7,6.1-6.1V22.7C62.3,21.5,61.8,20.4,61,19.6z M54.9,14.6c0.9,0,1.6,0.7,1.6,1.6v1.9H35.9 l-1.4-3.5H54.9z M57.8,51.5c0,0.9-0.7,1.6-1.6,1.6H7.9c-0.9,0-1.6-0.7-1.6-1.6V12.5c0-0.9,0.7-1.6,1.6-1.6L28.2,11l4.1,10.2 c0.3,0.9,1.2,1.4,2.1,1.4h23.3c0,0,0.1,0,0.1,0.1V51.5z'/%3E%3C/svg%3E");
        }

        .user-name-icon:before {
            background-image: url("data:image/svg+xml,%3Csvg fill='%23ffffff' width='24' height='24' version='1.1' id='lni_lni-user' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' x='0px' y='0px' viewBox='0 0 64 64' style='enable-background:new 0 0 64 64;' xml:space='preserve'%3E%3Cg%3E%3Cpath d='M32,36.8c8.3,0,15-6.7,15-15s-6.7-15-15-15c-8.3,0-15,6.7-15,15S23.7,36.8,32,36.8z M32,11.3c5.8,0,10.5,4.7,10.5,10.5 S37.8,32.3,32,32.3c-5.8,0-10.5-4.7-10.5-10.5S26.2,11.3,32,11.3z'/%3E%3Cpath d='M61.5,53.2C53.3,46.3,42.9,42.5,32,42.5S10.7,46.3,2.5,53.2c-0.9,0.8-1.1,2.2-0.3,3.2c0.8,0.9,2.2,1.1,3.2,0.3 C12.8,50.4,22.2,47,32,47c9.8,0,19.2,3.4,26.5,9.6c0.4,0.4,0.9,0.5,1.5,0.5c0.6,0,1.3-0.3,1.7-0.8C62.5,55.4,62.4,54,61.5,53.2z'/%3E%3C/g%3E%3C/svg%3E%0A");
        }

        .member-count-badge {
            font-size: .8em;
            width: 1.5em;
            width: 3ch;
            line-height: 1.5em;
            line-height: 3ch;
            padding: 0;
            padding: .5ch;
            display: inline-block;
            color: var(--dbp-content);
            text-align: center;
            border: 1px solid var(--border-color);
            border-radius: 100%;
            margin-left: 1em;
        }

        .create-group-button {
            max-width: 100%;
        }

        /* BUTTONS */

        #list-group-button {
            --icon-transform: rotate(180deg);
        }

        #open-create-group-button {
            --icon-transform: scale(1.3);
        }

        .delete-group-member-button,
        .add-group-member-button,
        .delete-group-button {
            --icon-transform: scale(1.4);
            --display-button-lable: none;
        }

        .button-container {
            display: flex;
            flex-direction: row;
            gap: var(--space);
        }

        .list-groups {
            container: list-container / inline-size;
        }

        @container list-container (width < 415px){
            .button-container {
                flex-direction: column;
                gap: var(--space-half);
            }

            dbp-loading-button {
                max-width: 100%;
            }
        }



        .button-container button.select-user-button,
        .button-container button.select-group-button {
            position: relative;
            overflow: hidden;
            display: flex;
            gap: .9em;
            align-items: center;
        }

        .button-container button.select-user-button svg,
        .button-container button.select-group-button svg {
            width: 1.2em;
            height: 1.2em;
            fill: var(--dbp-content);
        }

        .button-container button.select-user-button.selected:before,
        .button-container button.select-group-button.selected:before,
        .button-container button.select-user-button:hover:before,
        .button-container button.select-group-button:hover:before {
            transform: translateX(0);
        }

        .button-container button.select-user-button:before,
        .button-container button.select-group-button:before {
            content: "";
            display: block;
            width: 2.5em;
            height: 2.5em;
            backdrop-filter: invert(1);
            transform: translateX(-2.5em);
            transition: transform var(--animation-time) ease-in-out;
            position: absolute;
            top: 0;
            left: 0;
        }

        .expand-collapse-button {
            transition: transform var(--animation-time) ease-in-out;
        }

        .expand-collapse-button.expanded {
            transform: rotate(-180deg);
        }

        /* DIALOG STYLES */

        .group-assign-modal {
            min-width: 500px;
            min-height: 300px;
        }
        dialog {
            background: var(--dbp-background);
            color: var(--dbp-content);
        }

        .dialog-inner {
            display: grid;
            grid-template-rows: 3em auto 4em;
            grid-template-columns: 1fr;
        }
        ::backdrop {
            background: rgba(36, 32, 20, 0.5);
            backdrop-filter: blur(0.25rem);
            opacity: 0.75;
        }

        .dialog-header {
            display: flex;
            justify-content: space-between;
            padding: 0 0 16px 0;
        }
        dialog footer {
            display: flex;
            justify-content: flex-end;
        }
        dialog form {
            display: grid;
            grid-template-columns: 1fr;
            gap: 16px;
            grid-template-rows: 30px;
        }

        .add-group-member-popover {
            height: 340px;
        }

        .add-group-member-popover .button-container {
            display: flex;
            gap: 2em;
        }

        .add-group-member-popover footer {
            display: flex;
            justify-content: flex-end;
            padding-top: 2em;
        }

        @keyframes fadeInOut {
            0% {
                opacity: 0;
                display: none;
            }
            50% {
                opacity: 0.5;
                display: block;
            }
            100% {
                opacity: 1;
                display: block;
            }
        }


        /* tooltips */

        .tooltip {
            overflow: visible;
            width: max-content;
            position: absolute;
            margin: 0;
            top: 0;
            left: 0;
            background-color: var(--dbp-background);
            color: var(--dbp-content);
            padding: var(--space);
            border: 1px solid var(--border-color);
        }

        .tooltip-button-container {
            height: var(--space-2x);
            display: flex;
            gap: var(--space);
            justify-content: center;
            align-items: center;
        }

        .arrow {
            position: absolute;
            border: 1px solid var(--border-color-rotated);
            width: 30px;
            height: 30px;
            transform: rotate(45deg);
            z-index: -10;
            bottom: -15px;
            right: 30px;
            clip-path: polygon(100% 0, 0% 100%, 100% 100%);
            background: var(--dbp-background);
        }

        #prevent-click-overlay {
            display: none;
            position: absolute;
            top: 0;
            bottom: 0;
            left: 0;
            right: 0;
            background: transparent;
        }
    `;
}
