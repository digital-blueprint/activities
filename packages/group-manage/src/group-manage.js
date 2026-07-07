import {html} from 'lit';
import DBPLitElement from '@dbp-toolkit/common/dbp-lit-element';
import {ScopedElementsMixin, LangMixin, AuthMixin} from '@dbp-toolkit/common';
import {classMap} from 'lit/directives/class-map.js';
import {createInstance} from './i18n.js';
import {Icon, Button, IconButton, LoadingButton, InlineNotification} from '@dbp-toolkit/common';
import * as commonStyles from '@dbp-toolkit/common/styles';
import {getGroupManageCSS} from './styles.js';
import {send as notify} from '@dbp-toolkit/common/notification';
import {ResourceSelect} from '@dbp-toolkit/resource-select';
import {getPersonFullName, getIdFromIri} from './utils.js';
import {GroupManageApi, ApiError} from './api.js';
import {computePosition, autoPlacement, offset, shift} from '@floating-ui/dom';

/**
 * @class
 * @augments {DBPLitElement}
 */
export class GroupManage extends AuthMixin(
    LangMixin(ScopedElementsMixin(DBPLitElement), createInstance),
) {
    constructor() {
        super();

        this._api = new GroupManageApi(this);
        /** @type {string | null} */
        this.entryPointUrl = null;
        /** @type {boolean} */
        this.isFirstUpdated = false;
        /** @type {Array} */
        this.authGroups = [];
        /** @type {object | null} */
        this.targetGroup = null;
        /** @type {object | null} */
        this.groupMember = null;
        /** @type {string | null} */
        this.groupIdentifier = null;
        /** @type {Map<string, Promise<string>>} */
        this.userNameCache = new Map();
        /** @type {boolean} */
        this.listIsLoaded = false;
        /** @type {HTMLElement | null} */
        this.createGroupPopover = null;
        /** @type {HTMLElement | null} */
        this.deleteGroupPopover = null;
        /** @type {HTMLElement | null} */
        this.deleteGroupMemberPopover = null;
        /** @type {HTMLElement | null} */
        this.addGroupMemberPopover = null;

        /** @type {ResourceSelect} */
        this.personSelector = null;
        /** @type {Button | null} */
        this.addToGroupButton = null;
        /** @type {Button | null} */
        this.listGroupButton = null;

        /** @type {HTMLElement | null} */
        this.activeButton = null;
        /** @type {HTMLElement | null} */
        this.activePopover = null;
        /** @type {string | null} */
        this.activeItemName = null;
        /** @type {string | null} */
        this.query = null;
        /** @type {boolean} */
        this.searchIsActive = false;
        /** @type {boolean} */
        this.searchNotFound = false;
        /** @type {boolean} */
        this.showNoSourceError = false;
        /** @type {boolean} */
        this.showNoTargetError = false;
        /** @type {boolean} */
        this.clickOverlayVisible = false;
        /** @type {boolean} */
        this.allGroupsExpanded = false;
        /** @type {boolean} */
        this.groupNameInputValid = false;
        /** @type {Set<string>} */
        this.openGroupIds = new Set();
        /** @type {Set<string>} */
        this.foundRowIds = new Set();
        /** @type {string | null} */
        this.hoveredRowId = null;
    }

    static get scopedElements() {
        return {
            'dbp-icon': Icon,
            'dbp-button': Button,
            'dbp-icon-button': IconButton,
            'dbp-loading-button': LoadingButton,
            'dbp-resource-select': ResourceSelect,
            'dbp-inline-notification': InlineNotification,
        };
    }

    static get properties() {
        return {
            ...super.properties,
            entryPointUrl: {type: String, attribute: 'entry-point-url'},
            authGroups: {type: Array, attribute: false},
            targetGroup: {type: Object, attribute: false},
            groupMember: {type: Object, attribute: false},
            activeItemName: {type: Array, attribute: false},
            query: {type: String, attribute: false},
            searchIsActive: {type: Boolean, attribute: false},
            listIsLoaded: {type: Boolean, attribute: false},
            searchNotFound: {type: Boolean, attribute: false},
            showNoSourceError: {type: Boolean, attribute: false},
            showNoTargetError: {type: Boolean, attribute: false},
            clickOverlayVisible: {type: Boolean, attribute: false},
            allGroupsExpanded: {type: Boolean, attribute: false},
            groupNameInputValid: {type: Boolean, attribute: false},
            openGroupIds: {type: Object, attribute: false},
            foundRowIds: {type: Object, attribute: false},
            hoveredRowId: {type: String, attribute: false},
        };
    }

    connectedCallback() {
        super.connectedCallback();
        window.addEventListener('resize', this.updatePosition.bind(this));
    }

    firstUpdated() {
        this.isFirstUpdated = true;
        this.personSelector = this._('#person-to-add-selector');
        this.addToGroupButton = this._('#add-to-group-button');
        this.listGroupButton = this._('#list-group-button');

        this.createGroupPopover = this._('#create-group-popover');
        this.createGroupPopover.addEventListener('beforetoggle', this.positionPopover.bind(this));

        this.deleteGroupPopover = this._('#delete-group-popover');
        this.deleteGroupPopover.addEventListener('beforetoggle', this.positionPopover.bind(this));

        this.addGroupMemberPopover = this._('#add-group-member-popover');
        this.addGroupMemberPopover.addEventListener(
            'beforetoggle',
            this.positionPopover.bind(this),
        );

        this.deleteGroupMemberPopover = this._('#delete-group-member-popover');
        this.deleteGroupMemberPopover.addEventListener(
            'beforetoggle',
            this.positionPopover.bind(this),
        );

        if (!this.listIsLoaded && this.isLoggedIn()) {
            this.fetchGroups();
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        window.removeEventListener('resize', this.updatePosition);

        this.deleteGroupPopover.removeEventListener('beforetoggle', this.positionPopover);
        this.deleteGroupMemberPopover.addEventListener('beforetoggle', this.positionPopover);
        this.addGroupMemberPopover.removeEventListener('beforetoggle', this.positionPopover);
    }

    loginCallback() {
        if (this.isFirstUpdated && !this.listIsLoaded) {
            this.fetchGroups();
        }
    }

    logoutCallback() {
        this.authGroups = [];
        this.listIsLoaded = false;
    }

    // MARK: PROCESS
    /**
     * Sets the needed properties for rendering. Full usernames, identifiers and css classes.
     * @param {Array} authGroups an array of "AuthorizationGroup" objects
     * @returns {Promise<any[]>}
     */
    async processAuthGroups(authGroups) {
        // console.log('Processing auth groups', authGroups);

        this.listByGroupFirst(authGroups);

        let authGroupToRender = await Promise.all(
            authGroups.map(async (item) => {
                if (item['@type'] === 'AuthorizationGroup') {
                    let memberCount = this.getAllMembersCount(item.members);
                    return {
                        id: item.identifier,
                        name: item.name,
                        type: item['@type'],
                        cssClass: 'root-group',
                        memberCount: memberCount,
                        members:
                            memberCount > 0 ? await this.processAuthGroups(item.members) : null,
                    };
                }
                if (item['@type'] === 'AuthorizationGroupMember') {
                    let name, id, cssClass, itemType, rootId;

                    if (item.userIdentifier !== null) {
                        name = await this.fetchFullnameFromUserid(item.userIdentifier);
                        id = item.identifier;
                        itemType = 'user';
                        // TODO: fix html class names and markup.
                        cssClass = 'user-name-icon';
                    }
                    if (item.childGroup !== null) {
                        name = item.childGroup.name;
                        id = item['identifier'];
                        rootId = item.childGroup.identifier;
                        itemType = 'groupMember';
                        // TODO: fix html class names and markup.
                        cssClass = 'child-group-icon';
                    }

                    let memberCount =
                        item.childGroup !== null &&
                        item.childGroup.members !== null &&
                        item.childGroup.members.length > 0
                            ? this.getAllMembersCount(item.childGroup.members)
                            : null;

                    return {
                        name: name,
                        id: id,
                        rootId: rootId,
                        type: item['@type'],
                        cssClass: cssClass,
                        itemType: itemType,
                        memberCount: memberCount,
                        childGroup: memberCount
                            ? await this.processAuthGroups(item.childGroup.members)
                            : null,
                    };
                }
            }),
        );

        return authGroupToRender;
    }

    /**
     * Count all members of a group recursively.
     * @param {Array} groups
     * @returns {number}
     */
    getAllMembersCount(groups) {
        if (!Array.isArray(groups) || groups.length === 0) {
            return 0;
        }

        /**
         * Do the recursion.
         * @param {object} group
         * @returns {number}
         */
        function countRecursive(group) {
            let count = 0;
            if (group.userIdentifier) {
                count += 1;
            }
            if (group.childGroup) {
                count += 1;
                for (const member of group.childGroup.members || []) {
                    count += countRecursive(member);
                }
            }
            return count;
        }

        let totalCount = 0;
        for (const member of groups) {
            totalCount += countRecursive(member);
        }

        return totalCount;
    }

    // MARK: Render Groups
    /**
     * Render authGroups to html.
     * @param {Array<object>} authGroups
     * @param {number} level
     * @param {string | null} parentId
     * @returns {import('lit').TemplateResult}
     */
    renderAuthGroups(authGroups, level = 0, parentId = null) {
        if (!Array.isArray(authGroups)) return html``;

        const firstIteration = level === 0;
        level++;

        return html`
            <ul
                class="${classMap({
                    'group-member-list': !firstIteration,
                    open: !firstIteration && parentId !== null && this.openGroupIds.has(parentId),
                })}"
                data-level="${level}">
                ${authGroups.map(
                    (item) => html`
                        <li
                            class="${classMap({
                                row: true,
                                'root-row': level == 1,
                                found: this.foundRowIds.has(item.id),
                                hover: this.hoveredRowId === item.id,
                            })}"
                            data-item-id="${item.id}">
                            ${
                                item.type === 'AuthorizationGroup'
                                    ? html`
                                          <div
                                              class="${classMap({
                                                  'group-header': firstIteration,
                                                  'group-header group-member': !firstIteration,
                                                  'found-item': this.foundRowIds.has(item.id),
                                              })}"
                                              style="--data-level:${level}">
                                              <span
                                                  class="group-name ${item.cssClass}"
                                                  data-identifier=${item.id}
                                                  @click="${this.toggleGroupHeader}">
                                                  ${item.name}
                                                  ${
                                                      item.memberCount
                                                          ? html`
                                                                <span class="member-count-badge">
                                                                    ${item.memberCount}
                                                                </span>
                                                            `
                                                          : null
                                                  }
                                              </span>
                                              <span class="group-controls">
                                                  ${this.renderDeleteGroupButton(item.id, item.name)}
                                                  ${this.renderAddGroupMemberButton(item.id, item.name)}
                                              </span>
                                          </div>
                                          ${
                                              item.members
                                                  ? this.renderAuthGroups(
                                                        item.members,
                                                        level,
                                                        item.id,
                                                    )
                                                  : ''
                                          }
                                      `
                                    : html`
                                          <div
                                              class="${classMap({
                                                  'group-header group-member': !firstIteration,
                                                  'found-item': this.foundRowIds.has(item.id),
                                              })}"
                                              style="--data-level:${level}">
                                              <span
                                                  class="group-name ${item.cssClass}"
                                                  data-identifier=${item.id}
                                                  @click="${this.toggleGroupHeader}">
                                                  ${item.name}
                                                  ${
                                                      item.memberCount
                                                          ? html`
                                                                <span class="member-count-badge">
                                                                    ${item.memberCount}
                                                                </span>
                                                            `
                                                          : null
                                                  }
                                              </span>
                                              <span class="group-controls">
                                                  ${this.renderDeleteGroupMemberButton(
                                                      item.id,
                                                      item.name,
                                                  )}
                                                  ${
                                                      item.itemType === 'groupMember'
                                                          ? this.renderAddGroupMemberButton(
                                                                item.rootId,
                                                                item.name,
                                                            )
                                                          : ''
                                                  }
                                              </span>
                                          </div>
                                          ${
                                              item.childGroup
                                                  ? this.renderAuthGroups(
                                                        item.childGroup,
                                                        level,
                                                        item.id,
                                                    )
                                                  : ''
                                          }
                                      `
                            }
                        </li>
                    `,
                )}
            </ul>
        `;
    }

    // MARK: Event handlers
    /**
     *
     * @param {Event} event
     */
    groupListButtonEventHandler(event) {
        /** @type {HTMLElement} */
        let button;

        if (event.target instanceof HTMLElement) {
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
            }
        }
    }

    /**
     * Open / close rows containing group members.
     * @param {Event} event
     */
    toggleGroupHeader(event) {
        event.stopPropagation();
        if (event.target) {
            const target = /** @type {HTMLElement} */ (event.target);
            const identifier = target.dataset.identifier;
            if (!identifier) return;
            const openGroupIds = new Set(this.openGroupIds);
            if (openGroupIds.has(identifier)) {
                openGroupIds.delete(identifier);
            } else {
                openGroupIds.add(identifier);
            }
            this.openGroupIds = openGroupIds;
        }
    }

    // MARK: BUTTONS
    /**
     *
     * @param {string} groupIdentifier - The identifier of the group to be deleted.
     * @param {string} groupName - The name of the group to be deleted.
     */
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
                ${i18n.t('group-manage.delete-group-button-text')}
            </dbp-button>
        `;
    }

    /**
     * Renders a delete group member button with the specified group identifier and group name.
     *
     * @param {string} groupIdentifier - The identifier of the group member to be deleted.
     * @param {string} groupName - The name of the group member to be deleted.
     */
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
                ${i18n.t('group-manage.delete-group-member-button-text')}
            </dbp-button>
        `;
    }

    /**
     * Renders a add group member button with the specified group identifier and group name.
     *
     * @param {string} groupIdentifier - The identifier of the group member to be added.
     * @param {string} groupName - The name of the group member to be added.
     */
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
                ${i18n.t('group-manage.assign-to-group-button-text')}
            </dbp-button>
        `;
    }

    // MARK: POP POSITION
    /**
     *
     * @param {CustomEvent} event
     */
    positionPopover(event) {
        const popover = this.activePopover;
        const invoker = this.activeButton;
        if (!popover || !invoker) return;

        // @ts-ignore
        if (event.newState === 'open') {
            console.log('popover opening');
            this.clickOverlayVisible = true;

            const rowEl = this.activeButton.closest('[data-item-id]');
            if (rowEl) {
                this.hoveredRowId = rowEl.getAttribute('data-item-id');
            }

            if (Array.isArray(this.activePopover.querySelectorAll('dbp-button'))) {
                this.activePopover.querySelectorAll('dbp-button').forEach((popoverButton) => {
                    popoverButton.removeAttribute('disabled');
                });
            }

            this.updatePosition();
        }

        // @ts-ignore
        if (event.newState === 'closed') {
            this.activeButton.removeAttribute('disabled');
            this.hoveredRowId = null;
            this.activeButton = null;

            this.activePopover.querySelectorAll('dbp-button').forEach((popoverButton) => {
                popoverButton.removeAttribute('disabled');
            });
            this.activePopover = null;

            this.clickOverlayVisible = false;
        }
    }

    /**
     * Update the position of the popover relative to the trigger button.
     */
    updatePosition() {
        const popover = this.activePopover;
        const invoker = this.activeButton;
        if (!popover || !invoker) return;

        computePosition(invoker, popover, {
            middleware: [
                offset(16),
                autoPlacement({
                    alignment: 'end',
                    allowedPlacements: ['top-end'],
                }),
                shift({padding: 16}),
            ],
        }).then(({x, y, middlewareData}) => {
            Object.assign(popover.style, {
                left: `${x}px`,
                top: `${y}px`,
            });
        });
    }

    // MARK: API methods

    async fetchGroupsButtonHandler() {
        await this.fetchGroups(true);
    }

    /**
     * Fetches the groups from the API and processes them for rendering.
     * @param {boolean} buttonTriggered - is the fetching triggered by the "list groups" button or not.
     */
    async fetchGroups(buttonTriggered = false) {
        this.userNameCache = new Map();
        this.listGroupButton.start();
        try {
            const response = await this._api.getGroups();
            const groups = response['hydra:member'];
            if (Array.isArray(groups) && groups.length > 0) {
                this.authGroups = await this.processAuthGroups(groups);
                this.listIsLoaded = true;
            } else {
                this.authGroups = [];
                this.listIsLoaded = true;
                if (buttonTriggered) {
                    notify({
                        summary: 'Warning!',
                        body: `No groups found in response.`,
                        type: 'danger',
                        timeout: 10,
                    });
                }
            }
        } catch (e) {
            if (e instanceof ApiError) {
                console.log('Error: ', e);
                notify({
                    summary: 'Error!',
                    body: `Could not fetch resource. Status: ${e.status}`,
                    type: 'danger',
                    timeout: 30,
                });
            } else {
                throw e;
            }
        } finally {
            this.listGroupButton.stop();
        }
    }

    fetchFullnameFromUserid(userIdentifier) {
        if (this.userNameCache.has(userIdentifier)) {
            return this.userNameCache.get(userIdentifier);
        }

        // Store the promise immediately (before any await) so concurrent callers
        // for the same userIdentifier share the same in-flight request.
        const promise = (async () => {
            try {
                const data = await this._api.getPerson(userIdentifier);
                return getPersonFullName(data);
            } catch (e) {
                if (e instanceof ApiError) {
                    if (e.status === 404) {
                        return userIdentifier;
                    }
                    console.log('Error: ', e);
                    notify({
                        summary: 'Error!',
                        body: `Could not fetch user details. Status: ${e.status}`,
                        type: 'danger',
                        timeout: 30,
                    });
                } else {
                    throw e;
                }
            }
        })();
        this.userNameCache.set(userIdentifier, promise);
        return promise;
    }

    async createGroup() {
        let groupName;
        const groupNameInput = this._('#input-group-name');
        if (groupNameInput instanceof HTMLInputElement) {
            groupName = groupNameInput.value;
        }

        if (!groupName) {
            notify({
                summary: 'Error!',
                body: `Name can not be empty`,
                type: 'danger',
                timeout: 30,
            });
            return;
        }
        try {
            const data = await this._api.createGroup(groupName);
            // Reset input field.
            if (groupNameInput instanceof HTMLInputElement) {
                groupNameInput.value = '';
            }
            // Re-fetch group list.
            this.fetchGroups();
            notify({
                summary: 'Success!',
                body: `Group "${data.name}" created successfully`,
                type: 'info',
                timeout: 5,
            });
        } catch (e) {
            if (e instanceof ApiError) {
                console.log('Error: ', e);
                notify({
                    summary: 'Error!',
                    body: `Could not create group. Status: ${e.status}`,
                    type: 'danger',
                    timeout: 30,
                });
            } else {
                throw e;
            }
        } finally {
            this.closeCreateGroupPopover();
        }
    }

    async deleteGroup() {
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
            await this._api.deleteGroup(groupIdentifier);
            notify({
                summary: 'Success!',
                body: 'The group has been deleted successfully',
                type: 'info',
                timeout: 5,
            });
        } catch (e) {
            if (e instanceof ApiError) {
                console.log('Error: ', e);
                notify({
                    summary: 'Error!',
                    body: `Could not delete group. Status: ${e.status}`,
                    type: 'danger',
                    timeout: 30,
                });
            } else {
                throw e;
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
            await this._api.deleteGroupMember(groupIdentifier);
            notify({
                summary: 'Success!',
                body: 'Group member has been deleted successfully',
                type: 'info',
                timeout: 5,
            });
        } catch (e) {
            if (e instanceof ApiError) {
                console.log('Error: ', e);
                notify({
                    summary: 'Error!',
                    body: `Could not delete group member. Status: ${e.status}`,
                    type: 'danger',
                    timeout: 30,
                });
            } else {
                throw e;
            }
        } finally {
            // Re-render the group list.
            this.fetchGroups();
            // if (this.searchIsActive) {
            //     this.searchGroups();
            // }
        }
    }

    /**
     *
     * @param {Event} event
     */
    async addGroupMemberButtonHandler(event) {
        /** @type {Button} */
        let button = event.target;
        button.start();
        await this.addGroupMember();
    }

    // MARK: ADD GROUP MEMBER
    async addGroupMember() {
        if (!this.groupMember) {
            this.showNoSourceError = true;
            setTimeout(() => {
                this.showNoSourceError = false;
            }, 3000);
            /**
             * @type {Button}
             */
            this.addToGroupButton.stop();
            this.addToGroupButton.removeAttribute('disabled');
            return;
        }
        if (!this.targetGroup) {
            // Never in use in normal case.
            this.showNoTargetError = true;
            setTimeout(() => {
                this.showNoTargetError = false;
            }, 3000);
            return;
        }
        const groupMemberName = this.groupMember['name'];
        const groupMemberId = this.groupMember['identifier'];
        const targetGroupId = this.targetGroup['identifier'];
        const groupName = this.targetGroup['name'];
        const data = {
            group: `/authorization/groups/${targetGroupId}`,
        };

        if (this.groupMember.type === 'person') {
            data.userIdentifier = groupMemberId;
        }
        if (this.groupMember.type === 'group') {
            data.childGroup = groupMemberId;
        }

        try {
            await this._api.addGroupMember(data);
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
        } catch (e) {
            if (e instanceof ApiError) {
                console.log('Error: ', e);
                notify({
                    summary: 'Error!',
                    body: `Could not add to group. Status: ${e.status}`,
                    type: 'danger',
                    timeout: 30,
                });
            } else {
                throw e;
            }
        } finally {
            this.resetSelectors();
            // this.closeAddGroupMemberPopover();
        }
    }

    // MARK: SOURCE CHANGE
    /**
     * Set groupMember from the User ID text input.
     * Clears the person selector to keep the two inputs mutually exclusive.
     * @param {Event} event
     */
    onUserIdInput(event) {
        const value = /** @type {HTMLInputElement} */ (event.target).value.trim();
        this.personSelector.reset();
        if (value) {
            this.groupMember = {type: 'person', identifier: value, name: value};
        } else {
            this.groupMember = null;
        }
    }

    /**
     * Set groupMember object on person selector change.
     * @param {CustomEvent} event
     */
    async onSourceSelectorChange(event) {
        if (!event.detail.value) return;
        const personIri = event.detail.value;
        const personIdentifier = getIdFromIri(personIri);
        const name = await this.fetchFullnameFromUserid(personIdentifier);
        this._('#user-id-input').value = '';
        this.groupMember = {
            type: 'person',
            identifier: personIdentifier,
            name: name,
        };
    }

    // MARK: POPOVERS
    renderCreateGroupPopover() {
        const i18n = this._i18n;

        return html`
            <div
                id="create-group-popover"
                class="create-group-popover tooltip"
                popover="manual"
                aria-labelledby="">
                <div class="dialog-inner">
                    <header class="dialog-header">
                        <h3 id="add-group-dialog-title">
                            ${i18n.t('group-manage.assign-to-group-modal-title')}
                        </h3>
                        <dbp-icon name="close" @click="${this.closeCreateGroupPopover}"></dbp-icon>
                    </header>
                    <div slot="content">
                        <div id="create-group-form" class="form">
                            <label for="input-group-name" class="form-label">
                                ${i18n.t('group-manage.group-name-label')}
                                <input
                                    type="text"
                                    id="input-group-name"
                                    required
                                    autocomplete="off"
                                    spellcheck="false"
                                    autocorrect="off"
                                    name="group-name"
                                    placeholder="Enter group name"
                                    @keydown="${(event) => {
                                        const groupNameField = event.target;
                                        // Enable submit form with Enter keys.
                                        if (
                                            event.code === 'Enter' ||
                                            event.code === 'NumpadEnter'
                                        ) {
                                            if (groupNameField.validity.valid) {
                                                this.createGroup();
                                            } else {
                                                groupNameField.blur();
                                            }
                                        }
                                    }}"
                                    @input="${(event) => {
                                        this.groupNameInputValid = event.target.validity.valid;
                                    }}" />
                                <span class="form-error">
                                    ${i18n.t('group-manage.field-is-required')}
                                </span>
                            </label>
                            <dbp-loading-button
                                ?disabled="${!this.groupNameInputValid}"
                                id="create-group-button"
                                class="create-group-button"
                                @click="${this.createGroup}"
                                type="is-primary">
                                <dbp-icon name="plus" aria-hidden="true"></dbp-icon>
                                ${i18n.t('group-manage.create-groups-button-text')}
                            </dbp-loading-button>
                        </div>
                    </div>
                </div>
                <div class="arrow"></div>
            </div>
        `;
    }

    /**
     *
     * @param {Event} event
     */
    openCreateGroupPopover(event) {
        if (!(event.target instanceof HTMLElement)) return;

        this.groupNameInputValid = false;

        if (event.target.tagName === 'DBP-ICON') {
            this.activeButton = event.target.parentElement;
        } else {
            this.activeButton = event.target;
        }

        this.activePopover = this.createGroupPopover;
        this.activePopover.showPopover();

        // Focus on the input field.
        const inputGroupName = /** @type {HTMLInputElement} */ (
            this.activePopover.querySelector('#input-group-name')
        );
        inputGroupName.focus();
    }

    closeCreateGroupPopover() {
        this.activePopover.hidePopover();
    }

    renderGroupDeleteConfirmationPopover() {
        const i18n = this._i18n;

        return html`
            <div id="delete-group-popover" popover="manual" class="tooltip" role="tooltip">
                <p class="tooltip-title">
                    ${i18n.t('group-manage.delete-group-confirmation', {
                        itemName: this.activeItemName,
                    })}
                </p>
                <div class="tooltip-button-container">
                    <dbp-button
                        type="is-danger"
                        id="confirm-delete-button"
                        class="confirm-delete-button"
                        @click="${() => this.deleteGroup()}">
                        <dbp-icon name="trash" aria-hidden="true"></dbp-icon>
                        ${i18n.t('group-manage.yes-delete')}
                    </dbp-button>
                    <dbp-button
                        type="is-secondary"
                        id="cancel-delete-button"
                        class="cancel-delete-button"
                        @click="${() => this.closeDeleteGroup()}">
                        <dbp-icon name="close" aria-hidden="true"></dbp-icon>
                        ${i18n.t('group-manage.cancel')}
                    </dbp-button>
                </div>
                <div class="arrow"></div>
            </div>
        `;
    }

    closeDeleteGroup() {
        this.activePopover.hidePopover();
    }

    renderGroupMemberDeleteConfirmationPopover() {
        const i18n = this._i18n;

        return html`
            <div id="delete-group-member-popover" popover="manual" class="tooltip" role="tooltip">
                <p class="tooltip-title">
                    ${i18n.t('group-manage.delete-group-member-confirmation', {
                        itemName: this.activeItemName,
                    })}
                </p>
                <div class="tooltip-button-container">
                    <dbp-button
                        type="is-danger"
                        id="confirm-delete-member-button"
                        class="confirm-delete-member-button"
                        @click="${(event) => this.deleteGroupMember(event)}">
                        <dbp-icon name="trash" aria-hidden="true"></dbp-icon>
                        ${i18n.t('group-manage.yes-delete')}
                    </dbp-button>
                    <dbp-button
                        type="is-secondary"
                        id="cancel-delete-member-button"
                        class="cancel-delete-member-button"
                        @click="${() => this.closeDeleteGroupMember()}">
                        <dbp-icon name="close" aria-hidden="true"></dbp-icon>
                        ${i18n.t('group-manage.cancel')}
                    </dbp-button>
                </div>
                <div class="arrow"></div>
            </div>
        `;
    }

    closeDeleteGroupMember() {
        this.activePopover.hidePopover();
    }

    renderAddGroupMemberPopover() {
        const i18n = this._i18n;

        return html`
            <div
                id="add-group-member-popover"
                class="add-group-member-popover tooltip"
                popover="manual"
                aria-labelledby="add-group-member-dialog-title">
                <div class="dialog-inner">
                    <header class="dialog-header">
                        <h3 id="add-group-member-dialog-title" tabindex="1">
                            ${i18n.t('group-manage.assign-to-group-modal-title')}
                            ${this.targetGroup?.name ? `"${this.targetGroup.name}"` : null}
                        </h3>
                        <dbp-icon
                            name="close"
                            @click="${() => {
                                this.closeAddGroupMemberPopover();
                            }}"></dbp-icon>
                    </header>
                    <div class="content">
                        <div id="add-group-member-form" class="add-group-member-form form">
                            <div class="person-resource-select-row">
                                <label for="person-to-add-selector">
                                    ${i18n.t('group-manage.person-label')}
                                </label>
                                <dbp-resource-select
                                    id="person-to-add-selector"
                                    subscribe="auth"
                                    entry-point-url="${this.entryPointUrl}"
                                    resource-path="/base/people"
                                    fetch-mode="search"
                                    lang="${this.lang}"
                                    .formatResource="${this.formatUserResource}"
                                    .getSearchQueryParameters="${this.getUserSearchQueryParameters}"
                                    .getItemQueryParameters="${this.getUserItemQueryParameters}"
                                    @change="${(event) =>
                                        this.onSourceSelectorChange(event)}"></dbp-resource-select>
                            </div>
                            <div class="user-id-row">
                                <label for="user-id-input">
                                    ${i18n.t('group-manage.user-id-label')}
                                </label>
                                <input
                                    type="text"
                                    id="user-id-input"
                                    @input="${(event) => this.onUserIdInput(event)}" />
                            </div>
                        </div>
                    </div>
                    <footer>
                        <dbp-loading-button
                            id="add-to-group-button"
                            class="add-to-group-button"
                            @click="${(event) => this.addGroupMemberButtonHandler(event)}"
                            type="is-primary">
                            <dbp-icon name="users" aria-hidden="true"></dbp-icon>
                            ${i18n.t('group-manage.add-to-groups-button-text')}
                        </dbp-loading-button>
                        <dbp-button
                            type="is-secondary"
                            id="cancel-add-to-group-button"
                            class="cancel-add-to-group-button"
                            @click="${() => this.closeAddGroupMemberPopover()}">
                            <dbp-icon name="close" aria-hidden="true"></dbp-icon>
                            ${i18n.t('group-manage.cancel')}
                        </dbp-button>
                    </footer>
                    <dbp-inline-notification
                        id="notification-no-source-error"
                        class="${classMap({show: this.showNoSourceError})}"
                        summary="Error"
                        body="You must select a source first."
                        type="danger"></dbp-inline-notification>
                    <dbp-inline-notification
                        id="notification-no-target-error"
                        class="${classMap({show: this.showNoTargetError})}"
                        summary="Error"
                        body="You must select a target."
                        type="danger"></dbp-inline-notification>
                </div>
                <div class="arrow"></div>
            </div>
        `;
    }

    closeAddGroupMemberPopover() {
        this.activePopover.hidePopover();
        /**
         * @type {Button}
         */
        this.addToGroupButton.stop();
        // Reset selectors states.
        this.resetSelectors();
    }

    // MARK: SEARCH
    /**
     * Update the group list when search query changes.
     * @param {Event} event
     */
    updateSearchQuery(event) {
        if (event.target instanceof HTMLInputElement) {
            this.query = event.target.value.toLowerCase();
            this.searchGroups();
        }
    }

    clearSearch() {
        this.query = null;
        const searchField = /** @type {HTMLInputElement} */ (this._('#group-search'));
        searchField.value = '';
        this.searchGroups();
    }

    /**
     * Hide rows not matching search query.
     */
    searchGroups() {
        if (this.query && this.query.length >= 3) {
            this.searchIsActive = true;

            const matchingIds = this.findMatchingIds(this.query, this.authGroups);

            if (matchingIds.length > 0) {
                this.searchNotFound = false;

                const openGroupIds = new Set();
                for (const id of matchingIds) {
                    const ancestors = this.findAncestors(id, this.authGroups);
                    if (ancestors) {
                        for (const ancestorId of ancestors) {
                            openGroupIds.add(ancestorId);
                        }
                    }
                }

                this.foundRowIds = new Set(matchingIds);
                this.openGroupIds = openGroupIds;
            } else {
                this.searchNotFound = true;
                this.foundRowIds = new Set();
                this.openGroupIds = new Set();
            }
        } else {
            this.searchIsActive = false;
            this.searchNotFound = false;
            this.foundRowIds = new Set();
            this.openGroupIds = new Set();
        }
    }

    /* utils */

    /**
     * Collect IDs of all groups/members that have children.
     * @param {Array} groups
     * @returns {Set<string>}
     */
    getAllGroupIds(groups) {
        const ids = new Set();
        for (const item of groups) {
            const children = item.members || item.childGroup;
            if (children && children.length > 0) {
                ids.add(item.id);
                for (const id of this.getAllGroupIds(children)) {
                    ids.add(id);
                }
            }
        }
        return ids;
    }

    /**
     * Find all item IDs whose names match the search query.
     * @param {string} query
     * @param {Array} groups
     * @returns {Array<string>}
     */
    findMatchingIds(query, groups) {
        const ids = [];
        for (const item of groups) {
            if (item.name && item.name.toLowerCase().match(query)) {
                ids.push(item.id);
            }
            const children = item.members || item.childGroup;
            if (children) {
                ids.push(...this.findMatchingIds(query, children));
            }
        }
        return ids;
    }

    /**
     * Find ancestor IDs for a given item ID in the group tree.
     * @param {string} targetId
     * @param {Array} groups
     * @param {Array<string>} path
     * @returns {Array<string> | null}
     */
    findAncestors(targetId, groups, path = []) {
        for (const item of groups) {
            if (item.id === targetId) {
                return path;
            }
            const children = item.members || item.childGroup;
            if (children) {
                const result = this.findAncestors(targetId, children, [...path, item.id]);
                if (result !== null) return result;
            }
        }
        return null;
    }

    formatGroupResource(resource) {
        return resource['name'];
    }

    formatUserResource(select, person) {
        let text = `${person['givenName']} ${person['familyName']}`;
        const email = person.localData?.email;
        if (email) {
            text += ` (${email})`;
        }
        return text;
    }

    /**
     * @param {object} select
     * @param {string} searchTerm
     * @returns {object}
     */
    getUserSearchQueryParameters(select, searchTerm) {
        return {
            includeLocal: 'email',
            search: searchTerm.trim(),
            sort: 'familyName',
        };
    }

    /**
     * @returns {object}
     */
    getUserItemQueryParameters() {
        return {includeLocal: 'email'};
    }

    resetSelectors() {
        this.personSelector.reset();
        this._('#user-id-input').value = '';
    }

    collapseAllGroups() {
        this.openGroupIds = new Set();
    }

    /**
     * Toggle expand/collapse state for all groups.
     */
    expandCollapseAllGroups() {
        this.allGroupsExpanded = !this.allGroupsExpanded;
        this.openGroupIds = this.allGroupsExpanded
            ? this.getAllGroupIds(this.authGroups)
            : new Set();
    }

    /**
     * Sort group members, childgroups first then users (like in a file manager).
     * @param {Array} groupMembers
     */
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
        const showComponent = this.isLoggedIn();

        return html`
            <div class="group-manager">
                <section class="list-groups section">
                    <h2 class="section-heading">Authorization groups</h2>
                    <div class="component-container ${classMap({hidden: !showComponent})}">
                        <div class="button-container">
                            <dbp-loading-button
                                id="list-group-button"
                                class="list-group-button"
                                @click="${() => this.fetchGroupsButtonHandler()}"
                                type="is-primary">
                                <dbp-icon name="reload" aria-hidden="true"></dbp-icon>
                                ${i18n.t('group-manage.list-groups-button-text')}
                            </dbp-loading-button>
                            <dbp-loading-button
                                id="open-create-group-button"
                                class="open-create-group-button"
                                popovertarget="create-group-popover"
                                @click="${(event) => this.openCreateGroupPopover(event)}"
                                type="is-primary">
                                <dbp-icon name="plus" aria-hidden="true"></dbp-icon>
                                ${i18n.t('group-manage.create-groups-button-text')}
                            </dbp-loading-button>
                        </div>
                        <div
                            class="${classMap({
                                'group-list-container': true,
                                visible: this.listIsLoaded,
                            })}">
                            <div class="list-header">
                                <div
                                    class="${classMap({
                                        'search-container': true,
                                        active: this.searchIsActive,
                                    })}">
                                    <input
                                        type="text"
                                        id="group-search"
                                        class="${classMap({'not-found': this.searchNotFound})}"
                                        placeholder="Search by name"
                                        autocomplete="off"
                                        spellcheck="false"
                                        autocorrect="off"
                                        @input="${(event) => this.updateSearchQuery(event)}" />
                                    <dbp-icon name="close" @click="${this.clearSearch}"></dbp-icon>
                                </div>
                                <dbp-icon-button
                                    id="expand-collapse-all"
                                    class="expand-collapse-button"
                                    icon-name="chevron-down"
                                    title="${
                                        this.allGroupsExpanded ? 'Collapse All' : 'Expand All'
                                    }"
                                    aria-label="${
                                        this.allGroupsExpanded
                                            ? 'Collapse all groups'
                                            : 'Expand all groups'
                                    }"
                                    @click="${() =>
                                        this.expandCollapseAllGroups()}"></dbp-icon-button>
                            </div>
                            <div
                                class="group-list ${classMap({
                                    'search-is-active': this.searchIsActive,
                                })}"
                                @click="${(event) => this.groupListButtonEventHandler(event)}">
                                ${this.renderAuthGroups(this.authGroups)}
                            </div>
                        </div>

                        <div id="modal-container">
                            ${this.renderGroupDeleteConfirmationPopover()}
                            ${this.renderGroupMemberDeleteConfirmationPopover()}
                            ${this.renderCreateGroupPopover()} ${this.renderAddGroupMemberPopover()}
                        </div>
                        <div
                            id="prevent-click-overlay"
                            class="prevent-click-overlay ${classMap({
                                visible: this.clickOverlayVisible,
                            })}"></div>
                    </div>
                    <p class="login-required ${classMap({hidden: showComponent})}">
                        ${i18n.t('group-manage.login-required')}
                    </p>
                </section>
            </div>
        `;
    }
}
