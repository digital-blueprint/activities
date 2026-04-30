import {combineURLs} from '@dbp-toolkit/common';

export class ApiError extends Error {
    /**
     * @param {number} status
     * @param {string} statusText
     * @param {Record<string, any>} body
     */
    constructor(status, statusText, body) {
        super(`[${status}] ${body.title ?? statusText} - ${body.detail}`);

        // Generic
        this.name = 'ApiError';
        /** @member {number} */
        this.status = status;
        /** @member {string} */
        this.statusText = statusText;

        // Problem Details
        /** @member {string} */
        this.detail = body.detail;
        /** @member {string} */
        this.title = body.title ?? null;

        // Relay-specific
        /** @member {string|null} */
        this.errorId = body['relay:errorId'] ?? null;
        /** @member {object} */
        this.errorDetails = body['relay:errorDetails'] ?? {};
    }

    /**
     * @param {Response} response
     * @returns {Promise<ApiError>}
     */
    static async fromResponse(response) {
        const body = await response.json();
        return new ApiError(response.status, response.statusText, body);
    }
}

/**
 * @typedef {object} AuthorizationGroup
 * @property {string} identifier
 * @property {string} name
 * @property {AuthorizationGroupMember[]} members
 */

/**
 * @typedef {object & {'hydra:member': AuthorizationGroup[]}} AuthorizationGroups
 */

/**
 * @typedef {object} AuthorizationGroupMember
 * @property {string} userIdentifier
 * @property {string|null} childGroup
 */

/**
 * @typedef {object} BasePerson
 * @property {string} identifier
 * @property {string} givenName
 * @property {string} familyName
 */

export class GroupManageApi {
    /**
     * @param {import('./group-manage.js').GroupManage} element
     */
    constructor(element) {
        this._element = element;
    }

    /**
     * @returns {Promise<AuthorizationGroups>}
     */
    async getGroups() {
        const apiUrl = combineURLs(
            this._element.entryPointUrl,
            '/authorization/groups?perPage=9999',
        );
        const response = await fetch(apiUrl, {
            headers: {
                'Content-Type': 'application/ld+json',
                Authorization: 'Bearer ' + this._element.auth.token,
            },
        });
        if (!response.ok) {
            throw await ApiError.fromResponse(response);
        }
        return await response.json();
    }

    /**
     * @param {string} name
     * @returns {Promise<AuthorizationGroup>}
     */
    async createGroup(name) {
        const apiUrl = combineURLs(this._element.entryPointUrl, '/authorization/groups');
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/ld+json',
                Authorization: 'Bearer ' + this._element.auth.token,
            },
            body: JSON.stringify({name}),
        });
        if (!response.ok) {
            throw await ApiError.fromResponse(response);
        }
        return await response.json();
    }

    /**
     * @param {string} groupIdentifier
     * @returns {Promise<void>}
     */
    async deleteGroup(groupIdentifier) {
        const apiUrl = combineURLs(
            this._element.entryPointUrl,
            `/authorization/groups/${encodeURIComponent(groupIdentifier)}`,
        );
        const response = await fetch(apiUrl, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/ld+json',
                Authorization: 'Bearer ' + this._element.auth.token,
            },
        });
        if (response.status !== 204) {
            throw await ApiError.fromResponse(response);
        }
    }

    /**
     * @param {string} groupMemberIdentifier
     * @returns {Promise<void>}
     */
    async deleteGroupMember(groupMemberIdentifier) {
        const apiUrl = combineURLs(
            this._element.entryPointUrl,
            `/authorization/group-members/${encodeURIComponent(groupMemberIdentifier)}`,
        );
        const response = await fetch(apiUrl, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/ld+json',
                Authorization: 'Bearer ' + this._element.auth.token,
            },
        });
        if (response.status !== 204) {
            throw await ApiError.fromResponse(response);
        }
    }

    /**
     * @param {{group: string, userIdentifier: string, childGroup?: string}} data
     * @returns {Promise<AuthorizationGroupMember>}
     */
    async addGroupMember(data) {
        const apiUrl = combineURLs(this._element.entryPointUrl, '/authorization/group-members');
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/ld+json',
                Authorization: 'Bearer ' + this._element.auth.token,
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            throw await ApiError.fromResponse(response);
        }
        return await response.json();
    }

    /**
     * @param {string} userIdentifier
     * @returns {Promise<BasePerson>}
     */
    async getPerson(userIdentifier) {
        const apiUrl = combineURLs(
            this._element.entryPointUrl,
            `/base/people/${encodeURIComponent(userIdentifier)}?includeLocal=email`,
        );
        const response = await fetch(apiUrl, {
            headers: {
                'Content-Type': 'application/ld+json',
                Authorization: 'Bearer ' + this._element.auth.token,
            },
        });
        if (!response.ok) {
            throw await ApiError.fromResponse(response);
        }
        return await response.json();
    }
}
