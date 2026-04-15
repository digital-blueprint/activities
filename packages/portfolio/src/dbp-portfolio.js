import * as commonUtils from '@dbp-toolkit/common/utils';
import {createInstance} from './i18n.js';
import {css, html} from 'lit';
import {ScopedElementsMixin, LoadingButton} from '@dbp-toolkit/common';
import * as commonStyles from '@dbp-toolkit/common/styles';
import {AdapterLitElement, LangMixin, AuthMixin} from '@dbp-toolkit/common';
import {send as notify} from '@dbp-toolkit/common/notification';
import {PortfolioApi} from './api.js';

export class DbpPortfolio extends AuthMixin(
    LangMixin(ScopedElementsMixin(AdapterLitElement), createInstance),
) {
    constructor() {
        super();
        this.entryPointUrl = '';
        this._workflows = [];
        this._selectedWorkflow = null;
        this._isLoading = false;
    }

    static get scopedElements() {
        return {
            'dbp-loading-button': LoadingButton,
        };
    }

    static get properties() {
        return {
            ...super.properties,
            entryPointUrl: {type: String, attribute: 'entry-point-url'},
            _workflows: {type: Array, state: true},
            _selectedWorkflow: {type: Object, state: true},
            _isLoading: {type: Boolean, state: true},
        };
    }

    update(changedProperties) {
        super.update(changedProperties);

        changedProperties.forEach((oldValue, propName) => {
            switch (propName) {
                case 'lang':
                    if (this.isLoggedIn()) {
                        this._fetchWorkflows();
                    }
                    break;
            }
        });
    }

    loginCallback() {
        this._fetchWorkflows();
    }

    logoutCallback() {
        this._workflows = [];
        this._selectedWorkflow = null;
    }

    _api() {
        return new PortfolioApi(this);
    }

    get _loadingButton() {
        return this.shadowRoot?.querySelector('.reload-button');
    }

    async _fetchWorkflows() {
        if (this._isLoading) return;
        this._isLoading = true;
        this._loadingButton?.start();

        try {
            this._workflows = await this._api().getWorkflows();
            // Refresh selected workflow if one is open
            if (this._selectedWorkflow) {
                const updated = this._workflows.find(
                    (w) => w.identifier === this._selectedWorkflow.identifier,
                );
                this._selectedWorkflow = updated ?? null;
            }
        } catch (e) {
            notify({
                summary: 'Error',
                body: e.detail ?? e.message,
                type: 'danger',
                timeout: 30,
            });
        } finally {
            this._isLoading = false;
            this._loadingButton?.stop();
        }
    }

    async _triggerAction(workflowId, actionId) {
        try {
            let response = await this._api().triggerWorkflowAction(workflowId, actionId);
            if (response.type === 'url') {
                window.open(response.url, '_blank', 'noopener,noreferrer');
            }
            if (response.message !== null) {
                notify({
                    summary: response.message.title,
                    body: response.message.text,
                    type: response.message.type == 'error' ? 'danger' : response.message.type,
                    timeout: 5,
                });
            }
            // Re-fetch the updated workflow and patch local state
            const updated = await this._api().getWorkflow(workflowId);
            this._workflows = this._workflows.map((w) =>
                w.identifier === workflowId ? updated : w,
            );
            this._selectedWorkflow =
                this._selectedWorkflow?.identifier === workflowId
                    ? updated
                    : this._selectedWorkflow;
        } catch (e) {
            notify({
                summary: 'Error',
                body: e.detail ?? e.message,
                type: 'danger',
                timeout: 30,
            });
        }
    }

    _selectWorkflow(workflow) {
        this._selectedWorkflow =
            this._selectedWorkflow?.identifier === workflow.identifier ? null : workflow;
    }

    _renderActions(workflow) {
        if (!workflow.availableActions?.length) {
            return html`
                <p class="no-actions">${this._i18n.t('no-actions-available')}</p>
            `;
        }
        return html`
            <div class="workflow-actions">
                ${workflow.availableActions.map((action) => {
                    if (action.type === 'url') {
                        return html`
                            <a
                                class="action-link"
                                href="${action.url}"
                                target="_blank"
                                rel="noopener noreferrer">
                                ${action.label}
                            </a>
                        `;
                    }
                    return html`
                        <button
                            class="action-button"
                            @click=${() => this._triggerAction(workflow.identifier, action.id)}>
                            ${action.label}
                        </button>
                    `;
                })}
            </div>
        `;
    }

    _renderDetail(workflow) {
        return html`
            <div class="workflow-detail">
                <p class="status-display">
                    <strong>${workflow.statusDisplay.label}</strong>
                    &mdash; ${workflow.statusDisplay.description}
                </p>
                ${this._renderActions(workflow)}
            </div>
        `;
    }

    _renderWorkflows() {
        if (!this._isLoading && this._workflows.length === 0) {
            return html`
                <p class="empty">No workflows found.</p>
            `;
        }
        return html`
            <ul class="workflow-list">
                ${this._workflows.map((workflow) => {
                    const isSelected = this._selectedWorkflow?.identifier === workflow.identifier;
                    return html`
                        <li class="workflow-item ${isSelected ? 'active' : ''}">
                            <button
                                class="workflow-row"
                                @click=${() => this._selectWorkflow(workflow)}>
                                <span class="workflow-name">${workflow.name}</span>
                                <span
                                    class="workflow-state state-${workflow.active
                                        ? 'active'
                                        : 'done'}">
                                    ${workflow.statusDisplay.label}
                                </span>
                            </button>
                            ${isSelected ? this._renderDetail(workflow) : ''}
                        </li>
                    `;
                })}
            </ul>
        `;
    }

    render() {
        const authenticated = this.isLoggedIn();

        return html`
            <div class="portfolio">
                ${!authenticated
                    ? html`
                          <p class="login-required">Please log in to view your workflows.</p>
                      `
                    : html`
                          <div class="toolbar">
                              <dbp-loading-button
                                  class="reload-button"
                                  @click=${this._fetchWorkflows}>
                                  ${this._i18n.t('reload')}
                              </dbp-loading-button>
                          </div>
                          ${this._renderWorkflows()}
                      `}
            </div>
        `;
    }

    static get styles() {
        // language=css
        return css`
            ${commonStyles.getThemeCSS()}
            ${commonStyles.getGeneralCSS(false)}

            * {
                box-sizing: border-box;
            }

            .portfolio {
                padding: 1em;
            }

            .login-required {
                color: var(--dbp-muted);
            }

            .toolbar {
                margin-bottom: 1em;
            }

            .workflow-list {
                list-style: none;
                margin: 0;
                padding: 0;
                border: 1px solid var(--dbp-content-surface);
                overflow: hidden;
            }

            .workflow-item {
                border-bottom: 1px solid var(--dbp-content-surface);
            }

            .workflow-item:last-child {
                border-bottom: none;
            }

            .workflow-row {
                display: flex;
                align-items: center;
                width: 100%;
                padding: 0.75em 1em;
                background: none;
                border: none;
                cursor: pointer;
                color: var(--dbp-content);
                font: inherit;
                text-align: left;
                gap: 1em;
            }

            .workflow-row:hover {
                background-color: var(--dbp-hover-background-color, rgba(0, 0, 0, 0.05));
            }

            .workflow-item.active > .workflow-row {
                background-color: var(--dbp-hover-background-color, rgba(0, 0, 0, 0.05));
                font-weight: bold;
            }

            .workflow-name {
                flex: 1;
            }

            .workflow-state {
                font-size: 0.8em;
                padding: 0.2em 0.6em;
                border-radius: 999px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.04em;
                background-color: var(--dbp-muted-surface, #eee);
                color: var(--dbp-muted, #666);
            }

            .state-active {
                background-color: #d4edda;
                color: #155724;
            }

            .state-done {
                background-color: #cce5ff;
                color: #004085;
            }

            .workflow-detail {
                padding: 0.75em 1em 1em 1em;
                border-top: 1px solid var(--dbp-content-surface);
                background-color: var(--dbp-background);
            }

            .status-display {
                margin: 0 0 0.75em 0;
                color: var(--dbp-content);
            }

            .workflow-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 0.5em;
            }

            .action-button {
                padding: 0.4em 1em;
                background-color: var(--dbp-primary-surface, #007bff);
                color: var(--dbp-on-primary-surface, #fff);
                border: none;
                cursor: pointer;
                font: inherit;
            }

            .action-button:hover {
                opacity: 0.85;
            }

            .action-link {
                padding: 0.4em 1em;
                background-color: var(--dbp-secondary-surface, #6c757d);
                color: var(--dbp-on-secondary-surface, #fff);
                text-decoration: none;
                font: inherit;
                border-color: var(--dbp-on-secondary-surface, #6c757d);
                border-width: 1px;
                border-style: solid;
            }

            .action-link:hover {
                opacity: 0.85;
            }

            .no-actions,
            .empty {
                color: var(--dbp-muted);
                margin: 0;
            }
        `;
    }
}

commonUtils.defineCustomElement('dbp-portfolio', DbpPortfolio);
