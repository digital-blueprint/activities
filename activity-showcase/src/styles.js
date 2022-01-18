import {css, CSSResult} from 'lit';

/**
 * We want to have "neutral" colors here
 *
 * @returns {CSSResult}
 */
export function getDemoCSS() {
    // language=css
    return css`
        h1.title {margin-bottom: 1em;}
        div.container {margin-bottom: 1.5em;}
        h1, h2, h3, h4 {
            margin-bottom: 20px;
        }
        h2, h3, h4 {
            margin: 40px 0 10px 0px;
        }
        p{
            margin:10px 0;
        }
        ul{
            margin-left: 14px;
        }
        ul ul{
            margin-left: 14px;
        }
    `;
}