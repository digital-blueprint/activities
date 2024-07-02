import { html } from 'lit';
// import { property } from 'lit/decorators.js';
import DBPLitElement from '@dbp-toolkit/common/dbp-lit-element';
import { ScopedElementsMixin } from '@open-wc/scoped-elements';
import { classMap } from "lit/directives/class-map.js";
import { createInstance } from './i18n.js';
import { Icon, Button, IconButton, LoadingButton, InlineNotification } from '@dbp-toolkit/common';
import * as commonStyles from '@dbp-toolkit/common/styles';
import { getGroupManageCSS } from './styles.js';
import { send as notify } from '@dbp-toolkit/common/notification';
import { PersonSelect } from '@dbp-toolkit/person-select';
import { ResourceSelect } from '@dbp-toolkit/resource-select';
import { getPersonFullName, getIdFromIri } from './utils.js';
import { computePosition, autoPlacement, offset } from '@floating-ui/dom';

export class GroupManage extends ScopedElementsMixin(DBPLitElement) {
    constructor() {
        super();
        this.auth = {};
        this._i18n = createInstance();
        this.lang = this._i18n.language;
        this.entryPointUrl = null;

        this.authGroups = [];
        this.targetGroup = null;
        this.groupMember = null;
        this.groupIdentifier = null;

        this.userNameCache = new Map();
        this.listIsLoaded = false;

        this.deleteGroupPopover = null;
        this.deleteGroupMemberPopover = null;
        this.addGroupMemberPopover = null;

        this.activeButton = null;
        this.activePopover = null;
        this.activeItemName = null;

        this.query = null;
        this.searchIsActive = false;
    }

    static get scopedElements() {
        return {
            'dbp-icon': Icon,
            'dbp-button': Button,
            'dbp-icon-button': IconButton,
            'dbp-loading-button': LoadingButton,
            'dbp-person-select': PersonSelect,
            'dbp-resource-select': ResourceSelect,
            'dbp-inline-notification': InlineNotification,
        };
    }

    static get properties() {
        return {
            ...super.properties,
            auth: { type: Object },
            lang: { type: String },
            entryPointUrl: { type: String, attribute: 'entry-point-url' },
            authGroups: { type: Array, attribute: false },
            targetGroup: { type: Object, attribute: false },
            groupMember: { type: Object, attribute: false },
            activeItemName: { type: Array, attribute: false },
            query: { type: String, attribute: false },
            searchIsActive: { type: Boolean, attribute: false },
        };
    }

    connectedCallback() {
        super.connectedCallback();
        // window.addEventListener('resize', this.positionPopover.bind(this));
    }

    firstUpdated() {
        this.createGroupPopover = this._('#create-group-popover');
        this.createGroupPopover.addEventListener('beforetoggle', this.positionPopover.bind(this));

        this.deleteGroupPopover = this._('#delete-group-popover');
        this.deleteGroupPopover.addEventListener('beforetoggle', this.positionPopover.bind(this));

        this.addGroupMemberPopover = this._('#add-group-member-popover');
        this.addGroupMemberPopover.addEventListener('beforetoggle', this.positionPopover.bind(this));

        this.deleteGroupMemberPopover = this._('#delete-group-member-popover');
        this.deleteGroupMemberPopover.addEventListener('beforetoggle', this.positionPopover.bind(this));
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        // window.removeEventListener('resize', this.positionPopover);

        this.deleteGroupPopover.removeEventListener('beforetoggle', this.positionPopover);
        this.deleteGroupMemberPopover.addEventListener('beforetoggle', this.positionPopover);
        this.addGroupMemberPopover.removeEventListener('beforetoggle', this.positionPopover);
    }

    authenticated() {
        return (this.auth.token || '') !== '';
    }

    update(changedProperties) {
        changedProperties.forEach((oldValue, propName) => {
            // console.log(`Property changed: ${propName}`);
            switch (propName) {
                case 'lang':
                    this._i18n.changeLanguage(this.lang);
                    break;
                case 'auth':
                    if (this.auth['login-status'] === 'logged-in') {
                        console.log('logged in');
                        if (!this.listIsLoaded) {
                            this.fetchGroups();
                        }
                    }
                    break;
            }
        });
        super.update(changedProperties);
    }

    // MARK: PROCESS
    async processAuthGroups(authGroups) {
        // console.log('Processing auth groups', authGroups);

        this.listByGroupFirst(authGroups);

        let authGroupToRender = await Promise.all(authGroups.map(async (item) => {
            if (item['@type'] === 'AuthorizationGroup') {
                return {
                    iri: item['@id'],
                    id: item.identifier,
                    name: item.name,
                    type: item['@type'],
                    cssClass: 'root-group',
                    memberCount: item.members.length,
                    members: item.members.length > 0 ? await this.processAuthGroups(item.members) : null
                };
            }
            if (item['@type'] === 'AuthorizationGroupMember') {
                let name, id, cssClass, itemType, rootId;

                if (item.userIdentifier !== null) {
                    name = await this.fetchFullnameFromUserid(item.userIdentifier);
                    id = getIdFromIri(item['@id']);
                    itemType = 'user';
                    // TODO: fix html class names and markup.
                    cssClass = 'user-name-icon';
                }
                if (item.childGroup !== null) {
                    name = item.childGroup.name;
                    id = getIdFromIri(item['@id']);
                    rootId = item.childGroup.identifier;
                    itemType = 'groupMember';
                    // TODO: fix html class names and markup.
                    cssClass = 'child-group-icon';
                }

                const memberCount = item.childGroup !== null &&
                    item.childGroup.members !== null &&
                    item.childGroup.members.length > 0 ? item.childGroup.members.length : null;

                return {
                    name: name,
                    id: id,
                    rootId: rootId,
                    type: item['@type'],
                    cssClass: cssClass,
                    itemType: itemType,
                    memberCount: memberCount,
                    childGroup: memberCount ? await this.processAuthGroups(item.childGroup.members) : null
                };
            }
        }));

        return authGroupToRender;
    }

    // MARK: Render Groups
    renderAuthGroups(authGroups, level = 0) {
        // console.log('renderDirectory', authGroups);

        if (!Array.isArray(authGroups)) return;

        const firstIteration = (level === 0);
        level++;

        return html`
            <ul class="${classMap({ 'group-member-list': !firstIteration })}" data-level="${level}">

                ${authGroups.map(item => html`
                    <li class="row ${level == 1 ? 'root-row' : null}">
                        ${item.type === 'AuthorizationGroup'
                            ? html`
                                <div class="${classMap({ 'group-header': firstIteration, 'group-header group-member': !firstIteration })}" style="--data-level:${level}">
                                    <span class="group-name ${item.cssClass}" data-identifier=${item.id} @click="${this.toggleGroupHeader}">
                                        ${item.name}
                                        ${item.memberCount ? html`<span class="member-count-badge">${item.memberCount}</span>` : null}
                                    </span>
                                    <span class="group-controls">
                                        ${this.renderDeleteGroupButton(item.id, item.name)}
                                        ${this.renderAddGroupMemberButton(item.id, item.name)}
                                    </span>
                                </div>
                                ${item.members ? this.renderAuthGroups(item.members, level) : ''}
                            `
                            : html`
                                <div class="${classMap({ 'group-header group-member': !firstIteration })}" style="--data-level:${level}">
                                    <span class="group-name ${item.cssClass}" data-identifier=${item.id} @click="${this.toggleGroupHeader}">
                                        ${item.name}
                                        ${item.memberCount ? html`<span class="member-count-badge">${item.memberCount}</span>` : null}
                                    </span>
                                    <span class="group-controls">
                                        ${this.renderDeleteGroupMemberButton(item.id, item.name)}
                                        ${item.itemType === 'groupMember' ? this.renderAddGroupMemberButton(item.rootId, item.name) : ''}
                                    </span>
                                </div>
                                ${item.childGroup ? this.renderAuthGroups(item.childGroup, level) : ''}
                            `
                        }
                    </li>
                `)}
            </ul>
        `;
    }

    // MARK: Event handlers
    groupListButtonEventHandler(event) {
        let button;

        if (event.target.tagName !== 'DBP-BUTTON') {
            button = event.target.closest('dbp-button');
        } else {
            button = event.target;
        }

        this.activeButton = button;

        if (button.classList.contains('delete-group-button')) {
            this.groupIdentifier = button.getAttribute('data-group-id');

            this.activeItemName = button.getAttribute('data-group-name');
            this.activePopover = this.deleteGroupPopover;
            this.activePopover.showPopover();
        }

        if (button.classList.contains('delete-group-member-button')) {
            this.groupIdentifier = button.getAttribute('data-group-id');

            this.activeItemName = button.getAttribute('data-group-name');
            this.activePopover = this.deleteGroupMemberPopover;
            this.activePopover.togglePopover();
        }

        if (button.classList.contains('add-group-member-button')) {
            this.resetSelectors();

            this.targetGroup = {};
            this.targetGroup.identifier = button.getAttribute('data-group-id');
            this.targetGroup.name = button.getAttribute('data-group-name');

            this.activePopover = this.addGroupMemberPopover;
            this.activePopover.showPopover();
            // Give focus to the popover to keyboard accessibility.
            // :( Not working.
            this._('#add-group-member-dialog-title').focus();

            // Redraw the modal title.
            this.requestUpdate();
        }
    }

    toggleGroupHeader(event) {
        event.stopPropagation();
        const members = event.target.closest('.row');
        const memberList = members.querySelector('.group-member-list');
        if (memberList) {
            memberList.classList.toggle('open');
        }
    }

    // MARK: BUTTONS
    renderDeleteGroupButton(groupIdentifier, groupName) {
        const i18n = this._i18n;
        return html`
            <dbp-button
                type="is-secondary"
                class="delete-group-button"
                popovertarget="delete-group-popover"
                data-group-name="${groupName}"
                data-group-id="${groupIdentifier}">
                <dbp-icon name="trash" aria-hidden="true"></dbp-icon>
                ${i18n.t('group-manage.delete-group-button-text')}</dbp-button>
        `;
    }

    renderDeleteGroupMemberButton(groupIdentifier, groupName) {
        const i18n = this._i18n;
        return html`
            <dbp-button
                type="is-secondary"
                class="delete-group-member-button"
                popovertarget="delete-group-member-popover"
                data-group-name="${groupName}"
                data-group-id="${groupIdentifier}">
                <dbp-icon name="trash" aria-hidden="true"></dbp-icon>
                ${i18n.t('group-manage.delete-group-member-button-text')}</dbp-button>
        `;
    }

    renderAddGroupMemberButton(groupIdentifier, groupName) {
        const i18n = this._i18n;
        return html`
            <dbp-button
                type="is-secondary"
                class="add-group-member-button"
                popovertarget="add-group-member-popover"
                data-group-name="${groupName}"
                data-group-id="${groupIdentifier}">
                <dbp-icon name="users" aria-hidden="true"></dbp-icon>
                ${i18n.t('group-manage.assign-to-group-button-text')}</dbp-button>
        `;
    }

        // MARK: POP POSITION
    positionPopover(event) {
        const popover = this.activePopover;
        const invoker = this.activeButton;
        if (!popover || !invoker) return;

        if (event.newState === 'open') {
            console.log('popover opening');
            this.enableClickOverlay();

            if (this.activeButton.closest('.row')) {
                // this.activeButton.closest('.group-header').classList.add('hover');
                this.activeButton.closest('.row').classList.add('hover');
            }

            if (Array.isArray(this.activePopover.querySelectorAll('dbp-button'))) {
                this.activePopover.querySelectorAll('dbp-button').forEach(popoverButton => {
                    popoverButton.removeAttribute('disabled');
                });
            }

            this.updatePosition();
        }

        if (event.newState === 'closed') {
            this.activeButton.removeAttribute('disabled');
            if (this.activeButton.closest('.row')) {
                this.activeButton.closest('.row').classList.remove('hover');
            }
            this.activeButton = null;

            this.activePopover.querySelectorAll('dbp-button').forEach(popoverButton => {
                popoverButton.removeAttribute('disabled');
            });
            this.activePopover = null;

            this.disableClickOverlay();
        }
    }

    updatePosition() {
        const popover = this.activePopover;
        const invoker = this.activeButton;
        if (!popover || !invoker) return;

        computePosition(invoker, popover, {
            middleware: [offset(16), autoPlacement({
                alignment: 'end',
                allowedPlacements: ['top-end'],
            })],
        }).then(({ x, y, middlewareData }) => {
            Object.assign(popover.style, {
                left: `${x}px`,
                top: `${y}px`,
            });
        });
    }

    // MARK: API methods

    async fetchGroupsButtonHandler() {
        await this.fetchGroups();
    }

    async fetchGroups() {
        this._('#list-group-button').start();
        try {
            const response = await fetch(this.entryPointUrl + '/authorization/groups', {
                headers: {
                    'Content-Type': 'application/ld+json',
                    Authorization: 'Bearer ' + this.auth.token,
                },
            });

            if (!response.ok) {
                console.log('Error: ', response);
                notify({
                    summary: 'Error!',
                    body: `Could not fetch resource. Status: ${response.status}`,
                    type: 'danger',
                    timeout: 30,
                });
            } else {
                const authGroupsResponse = await response.json();
                if (Array.isArray(authGroupsResponse['hydra:member']) && authGroupsResponse['hydra:member'].length > 0) {
                    this.authGroups = await this.processAuthGroups(authGroupsResponse['hydra:member']);
                    const groupListContainer = this._('.group-list-container');
                    groupListContainer.classList.add('visible');
                    return;
                } else {
                    notify({
                        summary: 'Warning!',
                        body: `No groups found in response.`,
                        type: 'danger',
                        timeout: 10,
                    });
                }
            }
        } finally {
            this._('#list-group-button').stop();
        }
    }

    async fetchFullnameFromUserid(userIdentifier) {
        if (this.userNameCache.has(userIdentifier)) {
            return this.userNameCache.get(userIdentifier);
        } else {
            try {
                const response = await fetch(this.entryPointUrl + `/base/people/${userIdentifier}`, {
                    headers: {
                        'Content-Type': 'application/ld+json',
                        Authorization: 'Bearer ' + this.auth.token,
                    },
                });
                if (!response.ok) {
                    console.log('Error: ', response);
                    notify({
                        summary: 'Error!',
                        body: `Could not fetch user details. Status: ${response.status}`,
                        type: 'danger',
                        timeout: 30,
                    });
                } else {
                    const data = await response.json();
                    const fullName = getPersonFullName(data);
                    this.userNameCache.set(userIdentifier, fullName);
                    return fullName;
                }
            } finally {
                // console.log('End fetchFullnameFromUserid');
            }
        }
    }

    async createGroup() {
        const groupName = this._('#input-group-name').value;
        if (!groupName) {
            notify({
                summary: 'Error!',
                body: `Name can not be empty`,
                type: 'danger',
                timeout: 30,
            });
            return;
        }
        const data = {
            name: groupName
        };
        try {
            const response = await fetch(this.entryPointUrl + '/authorization/groups', {
                method: "POST",
                headers: {
                    'Content-Type': 'application/ld+json',
                    Authorization: 'Bearer ' + this.auth.token,
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                console.log('Error: ', response);
                notify({
                    summary: 'Error!',
                    body: `Could not create group. Status: ${response.status}`,
                    type: 'danger',
                    timeout: 30,
                });
            } else {
                const data = await response.json();
                // Reset input field.
                this._('#input-group-name').value = '';
                // Re-fetch group list.
                this.fetchGroups();
                notify({
                    summary: 'Success!',
                    body: `Group "${data.name}" created successfully`,
                    type: 'info',
                    timeout: 5,
                });
            }
        } finally {
            this.closeCreateGroupPopover();
        }
    }

    async deleteGroup(event) {
        this.deleteGroupPopover.hidePopover();

        if (!this.groupIdentifier) {
            notify({
                summary: 'Error!',
                body: 'No group identifier received',
                type: 'danger',
                timeout: 30,
            });
            return;
        }

        const groupIdentifier = this.groupIdentifier;

        try {
            const response = await fetch(this.entryPointUrl + `/authorization/groups/${groupIdentifier}`, {
                method: "DELETE",
                headers: {
                    'Content-Type': 'application/ld+json',
                    Authorization: 'Bearer ' + this.auth.token,
                },
            });

            if (response.status !== 204) {
                console.log('Error: ', response);
                notify({
                    summary: 'Error!',
                    body: `Could not delete group. Status: ${response.status}`,
                    type: 'danger',
                    timeout: 30,
                });
            } else {
                notify({
                    summary: 'Success!',
                    body: 'The group has been deleted successfully',
                    type: 'info',
                    timeout: 5,
                });
            }
        } finally {
            this.fetchGroups();
            // if (this.searchIsActive) {
            //     this.searchGroups();
            // }
        }
    }

    async deleteGroupMember(event) {
        this.deleteGroupMemberPopover.hidePopover();

        if (!this.groupIdentifier) {
            notify({
                summary: 'Error!',
                body: 'No group member identifier received',
                type: 'danger',
                timeout: 30,
            });
            return;
        }

        const groupIdentifier = this.groupIdentifier;

        try {
            const response = await fetch(this.entryPointUrl + `/authorization/group-members/${groupIdentifier}`, {
                method: "DELETE",
                headers: {
                    'Content-Type': 'application/ld+json',
                    Authorization: 'Bearer ' + this.auth.token,
                },
            });

            if (response.status !== 204) {
                console.log('Error: ', response);
                notify({
                    summary: 'Error!',
                    body: `Could not delete group member. Status: ${response.status}`,
                    type: 'danger',
                    timeout: 30,
                });
            } else {
                notify({
                    summary: 'Success!',
                    body: 'Group member has been deleted successfully',
                    type: 'info',
                    timeout: 5,
                });
            }
        } finally {
            // Re-render the group list.
            this.fetchGroups();
            // if (this.searchIsActive) {
            //     this.searchGroups();
            // }
        }
    }

    async addGroupMemberButtonHandler(event) {
        let button = event.target;
        button.start();
        await this.addGroupMember();
    }

    // MARK: ADD GROUP MEMBER
    async addGroupMember() {
        if (!this.groupMember) {
            this._('#notification-no-source-error').classList.add('show');
            setTimeout(() => {
                this._('#notification-no-source-error').classList.remove('show');
            }, 3000);
            this._('#add-to-group-button').stop();
            this._('#add-to-group-button').removeAttribute('disabled');
            return;
        }
        if (!this.targetGroup) {
            // Never in use in normal case.
            this._('#notification-no-target-error').classList.add('show');
            setTimeout(() => {
                this._('#notification-no-target-error').classList.remove('show');
            }, 3000);
            return;
        }
        const groupMemberName = this.groupMember['name'];
        const groupMemberId = this.groupMember['identifier'];
        const targetGroupId = this.targetGroup['identifier'];
        const groupName = this.targetGroup['name'];
        const data = {
            "group": `/authorization/groups/${targetGroupId}`,
        };

        if (this.groupMember.type === 'person') {
            data.userIdentifier = groupMemberId;
        }
        if (this.groupMember.type === 'group') {
            data.childGroup = groupMemberId;
        }

        try {
            const response = await fetch(this.entryPointUrl + '/authorization/group-members', {
                method: "POST",
                headers: {
                    'Content-Type': 'application/ld+json',
                    Authorization: 'Bearer ' + this.auth.token,
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                console.log('Error: ', response);
                notify({
                    summary: 'Error!',
                    body: `Could not add to group. Status: ${response.status}`,
                    type: 'danger',
                    timeout: 30,
                });
            } else {
                await response.json();
                this.fetchGroups();
                this.closeAddGroupMemberPopover();
                this.groupMember = null;
                this.targetGroup = null;
                // if (this.searchIsActive) {
                //     this.searchGroups();
                // }
                notify({
                    summary: 'Success!',
                    body: `"${groupMemberName}" added to the group  ${groupName} successfully`,
                    type: 'info',
                    timeout: 5,
                });
            }
        } finally {
            this.resetSelectors();
            // this.closeAddGroupMemberPopover();
        }
    }

    // MARK: SOURCE CHANGE
    async onSourceSelectorChange(event) {
        if (!event.target || !event.detail.value) return;
        const targetId = event.target.id;
        if (targetId === 'person-to-add-selector') {
            const personIri = event.detail.value;
            const personIdenifier = getIdFromIri(personIri);
            const name = await this.fetchFullnameFromUserid(personIdenifier);
            this.groupMember = {
                type: 'person',
                identifier: personIdenifier,
                name: name,
            };
        }
        if (targetId === 'group-to-add-selector') {
            const groupIri = event.detail.value;
            const name = event.detail.object.name;
            this.groupMember = {
                type: 'group',
                identifier: groupIri,
                name: name,
            };
        }
    }

    // MARK: POPOVERS
    renderCreateGroupPopover() {
        const i18n = this._i18n;

        return html`
            <div id="create-group-popover" class="create-group-popover tooltip"
                popover="manual"
                aria-labelledby="">
                <div class="dialog-inner">
                    <header class="dialog-header">
                        <h3 id="add-group-dialog-title">${i18n.t('group-manage.assign-to-group-modal-title')}</h3>
                        <dbp-icon name="close" @click="${this.closeCreateGroupPopover}"></dbp-icon>
                    </header>
                    <div slot="content">
                        <div id="create-group-form" class="form">
                            <label for="group-name" class="form-label">
                                ${i18n.t('group-manage.group-name-label')}
                                <input type="text" id="input-group-name" required
                                    autocomplete='off' spellcheck='false' autocorrect='off'
                                    name="group-name" placeholder="Enter group name"
                                    @keydown="${(event) => {
                                        const groupNameField = event.target;
                                        // Enable submit form with Enter keys.
                                        if (event.code === 'Enter' || event.code === 'NumpadEnter') {
                                            if (groupNameField.validity.valid) {
                                                this._('#create-group-button').removeAttribute('disabled');
                                                this.createGroup();
                                            } else {
                                                groupNameField.blur();
                                            }
                                        }
                                    }}"
                                                            @input="${(event) => {
                                        const groupNameField = event.target;
                                        if (groupNameField.validity.valid) {
                                            this._('#create-group-button').removeAttribute('disabled');
                                        }
                                    }}">
                                <span class="form-error">${i18n.t('group-manage.field-is-required')}</span>
                            </label>
                            <dbp-loading-button
                                disabled
                                id="create-group-button"
                                class="create-group-button"
                                @click="${this.createGroup}"
                                type="is-primary">
                                ${i18n.t('group-manage.create-groups-button-text')}
                            </dbp-loading-button>
                        </div>
                    </div>
                </div>
                <div class="arrow"></div>
            </div>
        `;
    }

    openCreateGroupPopover(event) {
        if (event.target.tagName === 'DBP-ICON') {
            this.activeButton = event.target.parentElement;
        } else {
            this.activeButton = event.target;
        }

        this.activePopover = this.createGroupPopover;
        this.activePopover.showPopover();

        // Focus on the input field.
        this.activePopover.querySelector('#input-group-name').focus();
    }

    closeCreateGroupPopover() {
        this.activePopover.hidePopover();
    }

    renderGroupDeleteConfirmationPopover() {
        const i18n = this._i18n;

        return html`<div id="delete-group-popover" popover="manual" class="tooltip" role="tooltip">
            <p class="tooltip-title">${i18n.t('group-manage.delete-group-confirmation', { itemName: this.activeItemName })}</p>
            <div class="tooltip-button-container">
                <dbp-button type="is-danger"
                    id="confirm-delete-button"
                    @click="${(event) => this.deleteGroup(event)}">${i18n.t('group-manage.yes-delete')}</dbp-button>
                <dbp-button type="is-secondary"
                    id="cancel-delete-button"
                    @click="${() => this.closeDeleteGroup()}">${i18n.t('group-manage.cancel')}</dbp-button>
            </div>
            <div class="arrow"></div>
        </div>`;
    }

    closeDeleteGroup() {
        this.activePopover.hidePopover();
    }

    renderGroupMemberDeleteConfirmationPopover() {
        const i18n = this._i18n;

        return html`<div id="delete-group-member-popover" popover="manual" class="tooltip" role="tooltip">
            <p class="tooltip-title">${i18n.t('group-manage.delete-group-member-confirmation', { itemName: this.activeItemName })}</p>
            <div class="tooltip-button-container">
                <dbp-button type="is-danger"
                    id="confirm-delete-member-button"
                    @click="${(event) => this.deleteGroupMember(event)}">${i18n.t('group-manage.yes-delete')}</dbp-button>
                <dbp-button type="is-secondary"
                    id="cancel-delete-member-button"
                    @click="${() => this.closeDeleteGroupMember()}">${i18n.t('group-manage.cancel')}</dbp-button>
            </div>
            <div class="arrow"></div>
        </div>`;
    }

    closeDeleteGroupMember() {
        this.activePopover.hidePopover();
    }

    renderAddGroupMemberPopover() {
        const i18n = this._i18n;

        return html`
            <div id="add-group-member-popover" class="add-group-member-popover tooltip"
                popover="manual" aria-labelledby="add-group-member-dialog-title">
                <div class="dialog-inner">
                    <header class="dialog-header">
                        <h3 id="add-group-member-dialog-title" tabindex="1">${i18n.t('group-manage.assign-to-group-modal-title')} ${this.targetGroup?.name ? this.targetGroup.name : null}</h3>
                        <dbp-icon name="close" @click="${() => { this.closeAddGroupMemberPopover(); }}"></dbp-icon>
                    </header>
                    <div class="content">
                        <div id="add-group-member-form" class="form">
                            <div class="button-container">
                                <button class="button is-secondary select-user-button" id="select-user-button"
                                    @click="${(event) => {
                                        event.target.classList.add('selected');
                                        this._('#select-group-button').classList.remove('selected');
                                        this._('#person-to-add-selector').removeAttribute('hidden');
                                        this._('#person-to-add-selector').removeAttribute('disabled');
                                        this._('#person-to-add-selector').setAttribute('subscribe', 'auth');

                                        this._('#person-to-add-selector').setAttribute('entry-point-url', this.entryPointUrl);

                                        this._('#group-to-add-selector').setAttribute('hidden');
                                    }}">
                                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
                                            viewBox="0 0 100 100" xml:space="preserve">
                                        <path class="st0" d="M8.5,87.7"/>
                                        <g>
                                            <path d="M50,57c13.2,0,24-10.8,24-24S63.2,9,50,9C36.8,9,26,19.7,26,33S36.8,57,50,57z M50,14.5c10.2,0,18.5,8.3,18.5,18.5
                                            S60.2,51.5,50,51.5S31.5,43.2,31.5,33S39.8,14.5,50,14.5z"/>
                                            <path d="M97.9,86.2C84.7,74.5,67.7,68,50,68S15.3,74.5,2.1,86.2c-1.1,1-1.2,2.7-0.2,3.9c1,1.1,2.7,1.2,3.9,0.2
                                            C17.9,79.5,33.7,73.5,50,73.5s32.1,6,44.3,16.8c0.5,0.5,1.2,0.7,1.8,0.7c0.8,0,1.5-0.3,2.1-0.9C99.2,89,99.1,87.2,97.9,86.2z"/>
                                        </g>
                                    </svg>
                                    ${i18n.t('group-manage.select-person-selector-button-text')}
                                </button>
                                <button class="button is-secondary select-group-button" id="select-group-button"
                                    @click="${(event) => {
                                        event.target.classList.add('selected');
                                        this._('#select-user-button').classList.remove('selected');
                                        this._('#group-to-add-selector').removeAttribute('hidden');
                                        this._('#group-to-add-selector').removeAttribute('disabled');

                                        this._('#group-to-add-selector').setAttribute('entry-point-url', this.entryPointUrl);
                                        this._('#group-to-add-selector').setAttribute('resource-path', '/authorization/groups?getChildGroupCandidatesForGroupIdentifier=' + this.targetGroup['identifier']);
                                        this._('#group-to-add-selector').updateResources();

                                        this._('#person-to-add-selector').setAttribute('hidden');
                                    }}">
                                    <svg version="1.1" id="Layer_2_1_" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
                                        viewBox="0 0 100 100" xml:space="preserve">
                                        <path d="M92.6,15.4H55.3l-2.9-5.3l-0.1-0.2c-1.1-1.7-3.1-2.7-5-2.7H7.4c-3.2,0-5.8,2.6-5.8,5.8v74.1c0,3.2,2.6,5.8,5.8,5.8h85.1
                                            c3.2,0,5.8-2.6,5.8-5.8V43.9v-3V21.1C98.3,18,95.7,15.4,92.6,15.4z M92.6,20.9c0.2,0,0.3,0.2,0.3,0.3v14.1c-0.1,0-0.2,0-0.3,0H66.3
                                            c-0.1,0-0.2,0-0.4-0.2l-7.7-14.1H92.6z M92.8,87.1c0,0.1-0.1,0.3-0.3,0.3H7.4c-0.1,0-0.3-0.1-0.3-0.3V12.9c0-0.1,0.1-0.3,0.3-0.3
                                            l39.8,0c0.1,0,0.3,0.1,0.4,0.2l13.6,24.8l0.1,0.2c1.2,1.8,2.9,2.7,5,2.7h26.2c0.1,0,0.3,0.1,0.3,0.3v3V87.1z"/>
                                    </svg>
                                    ${i18n.t('group-manage.select-group-selector-button-text')}
                                </button>
                            </div>

                            <dbp-person-select
                                hidden
                                disabled
                                id="person-to-add-selector"
                                lang="${this.lang}"
                                @change="${(event) => this.onSourceSelectorChange(event)}"></dbp-person-select>

                            <dbp-resource-select
                                hidden
                                disabled
                                subscribe="auth"
                                id="group-to-add-selector"
                                lang="${this.lang}"
                                resource-path="/authorization/groups"
                                @change="${(event) => this.onSourceSelectorChange(event)}"
                                .formatResource="${this.formatGroupResource}"></dbp-resource-select>
                        </div>
                    </div>
                    <footer>
                        <dbp-loading-button
                            id="add-to-group-button"
                            @click="${(event) => this.addGroupMemberButtonHandler(event)}"
                            type="is-primary">
                            ${i18n.t('group-manage.add-to-groups-button-text')}
                        </dbp-loading-button>
                    </footer>
                    <dbp-inline-notification id="notification-no-source-error" summary="Error" body="You must select a source first." type="danger"></dbp-inline-notification>
                    <dbp-inline-notification id="notification-no-target-error" summary="Error" body="You must select a target." type="danger"></dbp-inline-notification>
                </div>
                <div class="arrow"></div>
            </div>
        `;
    }

    closeAddGroupMemberPopover() {
        this.activePopover.hidePopover();
        this._('#add-to-group-button').stop();
        // Reset button state.
        this._('#select-user-button').classList.remove('selected');
        this._('#select-group-button').classList.remove('selected');
        // Reset selectors states.
        this.resetSelectors();
    }

    // MARK: SEARCH
    updateSearchQuery(event) {
        this.query = event.target.value.toLowerCase();
        this.searchGroups();
    }

    searchGroups() {
        if (this.query && this.query.length >= 3) {
            this.searchIsActive = true;

            const groupNames = this._a('.group-name');

            const matchedGroups = Array.from(groupNames).filter((groupNameElement) => {
                const hasText = Array.from(groupNameElement.childNodes).filter(child => {
                    return child.nodeType === Node.TEXT_NODE && child.nodeValue.trim().toLowerCase().match(this.query);
                });
                return hasText.length > 0;
            });

            const unmatchedGroups = Array.from(groupNames).filter(element => !matchedGroups.includes(element));

            if (matchedGroups.length > 0) {
                this._('#group-search').classList.remove('not-found');

                unmatchedGroups.forEach(groupNotFind => {
                    // Travers up the DOM and CLOSE all parent groups.
                    this.traversUntilRootGroup(groupNotFind, 'remove');
                });

                matchedGroups.forEach(groupFind => {
                    // Highlight find rows.
                    groupFind.closest('.row').classList.add('find');
                    // groupFind.closest('.group-header').classList.remove('hide');
                    // Travers up the DOM and OPEN all parent groups.
                    this.traversUntilRootGroup(groupFind, 'add');
                });

            } else {
                // No results found.
                this._('#group-search').classList.add('not-found');

                this._a('.group-name').forEach((name) => {
                    name.closest('.row').classList.remove('find');
                    // name.closest('.group-header').classList.remove('hide');
                });
                this.collapseAllGroups();
            }
        } else {
            this.searchIsActive = false;
            if (this.query.length >= 3) {
                this._('#group-search').classList.add('not-found');
            } else {
                this._('#group-search').classList.remove('not-found');
            }
            // Remove highlights and collapse all groups.
            this._a('.group-name').forEach((name) => {
                name.closest('.row').classList.remove('find');
            });
            // this.collapseAllGroups();
        }
    }

    traversUntilRootGroup(startElement, action) {
        // .group-name
        let currentElement = startElement;

        while (currentElement) {
            // End condition.
            if (currentElement.closest('.row').classList.contains('root-row')) {
                return currentElement;
            }
            // Travers up the DOM and open all parent groups.
            const parentGroup = currentElement.parentElement.closest('.group-member-list');

            if (action == 'add') {
                parentGroup.classList.add('open');
                // // Hide all elements on the same level expect the found one.
                // parentGroup.querySelectorAll('.row').forEach((row) => {
                //     row.classList.add('hidden');
                // });
                if (currentElement.closest('.group-header')) {
                    currentElement.closest('.group-header').classList.add('find-item');
                }
            } else {
                parentGroup.classList.remove('open');
            }
            currentElement = parentGroup;
        }

        return null;
    }

    /* utils */

    formatGroupResource(select, resource) {
        return resource['name'];
    }

    enableClickOverlay() {
        this._('#prevent-click-overlay').style.display = 'block';
    }

    disableClickOverlay() {
        this._('#prevent-click-overlay').style.display = 'none';
    }

    resetSelectors() {
        this._('#person-to-add-selector').setAttribute('hidden');
        this._('#person-to-add-selector').clear();

        this._('#group-to-add-selector').setAttribute('hidden');
        this._('#group-to-add-selector').setAttribute('value', '');
    }

    collapseAllGroups(event) {
        this._a('.group-member-list').forEach((groupMember) => {
            groupMember.classList.remove('open');
        });
        // this._('#expand-collapse-all').classList.remove('expanded');
    }

    // expandAllGroups(event) {
    //     this._a('.group-member-list').forEach((groupMember) => {
    //         groupMember.classList.add('open');
    //     });
    // }

    expandCollapseAllGroups(event) {
        const button = event.target;

        if (button.classList.contains('expanded')) {
            button.setAttribute('aria-label', 'Expand all groups');
            button.setAttribute('title', 'Expand all groups');
            this._a('.group-member-list').forEach((groupMember) => {
                groupMember.classList.remove('open');
            });
        } else {
            button.setAttribute('aria-label', 'Collapse all groups');
            button.setAttribute('title', 'Collapse all groups');
            this._a('.group-member-list').forEach((groupMember) => {
                groupMember.classList.add('open');
            });
        }

        button.classList.toggle('expanded');
    }

    listByGroupFirst(groupMembers) {
        groupMembers.sort((a, b) => {
            // Sort by childGroup not null first
            if (a.childGroup && !b.childGroup) {
                return -1;
            }
            if (!a.childGroup && b.childGroup) {
                return 1;
            }

            // Sort by userIdentifier not null second
            if (a.userIdentifier && !b.userIdentifier) {
                return -1;
            }
            if (!a.userIdentifier && b.userIdentifier) {
                return 1;
            }
        });
    }

    static get styles() {
        return [
            commonStyles.getThemeCSS(),
            commonStyles.getGeneralCSS(),
            commonStyles.getButtonCSS(),
            getGroupManageCSS(),
        ];
    }

    render() {
        const i18n = this._i18n;
        const showComponent = this.authenticated();

        return html`
            <div class="group-manager">

                <section class="list-groups section">
                    <h2 class="section-heading">Authorization groups</h2>
                        <div class="component-container ${classMap({ hidden: !showComponent })}">
                            <div class="button-container">
                                <dbp-loading-button
                                    id="list-group-button"
                                    @click="${() => this.fetchGroupsButtonHandler()}"
                                    type="is-primary">
                                    <dbp-icon name="reload" aria-hidden="true"></dbp-icon>
                                    ${i18n.t('group-manage.list-groups-button-text')}
                                </dbp-loading-button>
                                <dbp-loading-button
                                    id="open-create-group-button"
                                    popovertarget="create-group-popover"
                                    @click="${(event) => this.openCreateGroupPopover(event)}"
                                    type="is-primary">
                                    <dbp-icon name="plus" aria-hidden="true"></dbp-icon>
                                    ${i18n.t('group-manage.create-groups-button-text')}
                                </dbp-loading-button>
                            </div>
                            <div class="group-list-container">
                                <div class="list-header">
                                    <input type="text" id="group-search" placeholder="Search by name" autocomplete='off' spellcheck='false' autocorrect='off'
                                        @input="${(event) => this.updateSearchQuery(event)}">
                                    <dbp-icon-button id="expand-collapse-all"
                                        class="expand-collapse-button"
                                        icon-name="chevron-down"
                                        title="Expand All"
                                        aria-label="Expand All"
                                        @click="${(event) => this.expandCollapseAllGroups(event)}"></dbp-icon-button>
                                </div>
                                <div class="group-list ${classMap({ 'search-is-active': this.searchIsActive })}" @click="${(event) => this.groupListButtonEventHandler(event)}">
                                    ${this.renderAuthGroups(this.authGroups)}
                                </div>
                            </div>

                            <div id="modal-container">
                                ${this.renderGroupDeleteConfirmationPopover()}
                                ${this.renderGroupMemberDeleteConfirmationPopover()}
                                ${this.renderCreateGroupPopover()}
                                ${this.renderAddGroupMemberPopover()}
                            </div>
                            <div id="prevent-click-overlay"></div>
                        </div>
                        <p class="login-required ${classMap({ hidden: showComponent })}">${i18n.t('group-manage.login-required')}</p>
                </section>
            </div>
        `;
    }
}
