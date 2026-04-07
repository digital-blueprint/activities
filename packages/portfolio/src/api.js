import {combineURLs} from '@dbp-toolkit/common';

export class ApiError extends Error {
    /**
     * @param {number} status
     * @param {string} statusText
     * @param {object} body
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
        let body;
        try {
            body = await response.json();
        } catch {
            body = {detail: response.statusText};
        }
        return new ApiError(response.status, response.statusText, body);
    }
}

/**
 * @typedef {object} PortfolioWorkflowAction
 * @property {string} id
 * @property {string} label
 * @property {"action"|"url"} type
 * @property {string} [url]
 */

/**
 * @typedef {object} PortfolioCurrentStateDisplay
 * @property {string} label
 * @property {string} description
 */

/**
 * @typedef {object} PortfolioWorkflow
 * @property {string} identifier
 * @property {string} type
 * @property {"active"|"done"|"cancelled"|"archived"} state
 * @property {string} name
 * @property {string} description
 * @property {PortfolioCurrentStateDisplay} currentStateDisplay
 * @property {PortfolioWorkflowAction[]} availableActions
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {object} PortfolioWorkflowActionResult
 * @property {string} identifier
 * @property {object} responseData
 */

/**
 * @typedef {object} PortfolioTask
 * @property {string} identifier
 * @property {string} workflowId
 * @property {string} createdAt
 * @property {object} data
 */

export class PortfolioApi {
    constructor(element) {
        this._element = element;
    }

    /**
     * @returns {Promise<PortfolioWorkflow[]>}
     */
    async getWorkflows() {
        const apiUrl = combineURLs(this._element.entryPointUrl, '/portfolio/workflows');

        const result = await fetch(apiUrl, {
            headers: {
                'Content-Type': 'application/ld+json',
                Authorization: 'Bearer ' + this._element.auth.token,
                'Accept-Language': this._element.lang,
            },
        });

        if (!result.ok) {
            throw await ApiError.fromResponse(result);
        }

        const data = await result.json();
        return data['hydra:member'];
    }

    /**
     * @param {string} id
     * @returns {Promise<PortfolioWorkflow>}
     */
    async getWorkflow(id) {
        const apiUrl =
            combineURLs(this._element.entryPointUrl, '/portfolio/workflows') +
            '/' +
            encodeURIComponent(id);

        const result = await fetch(apiUrl, {
            headers: {
                'Content-Type': 'application/ld+json',
                Authorization: 'Bearer ' + this._element.auth.token,
                'Accept-Language': this._element.lang,
            },
        });

        if (!result.ok) {
            throw await ApiError.fromResponse(result);
        }

        return await result.json();
    }

    /**
     * @param {string} workflowId
     * @param {string} action
     * @param {object} [payload={}]
     * @returns {Promise<PortfolioWorkflowActionResult>}
     */
    async triggerWorkflowAction(workflowId, action, payload = {}) {
        const apiUrl = combineURLs(this._element.entryPointUrl, '/portfolio/workflow-actions');

        const result = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/ld+json',
                Authorization: 'Bearer ' + this._element.auth.token,
                'Accept-Language': this._element.lang,
            },
            body: JSON.stringify({workflowId, action, payload}),
        });

        if (!result.ok) {
            throw await ApiError.fromResponse(result);
        }

        return await result.json();
    }

    /**
     * @param {string} workflowId
     * @returns {Promise<PortfolioTask[]>}
     */
    async getTasks(workflowId) {
        const apiUrl =
            combineURLs(this._element.entryPointUrl, '/portfolio/tasks') +
            '?workflowId=' +
            encodeURIComponent(workflowId);

        const result = await fetch(apiUrl, {
            headers: {
                'Content-Type': 'application/ld+json',
                Authorization: 'Bearer ' + this._element.auth.token,
                'Accept-Language': this._element.lang,
            },
        });

        if (!result.ok) {
            throw await ApiError.fromResponse(result);
        }

        const data = await result.json();
        return data['hydra:member'];
    }

    /**
     * @param {string} id
     * @returns {Promise<PortfolioTask>}
     */
    async getTask(id) {
        const apiUrl =
            combineURLs(this._element.entryPointUrl, '/portfolio/tasks') +
            '/' +
            encodeURIComponent(id);

        const result = await fetch(apiUrl, {
            headers: {
                'Content-Type': 'application/ld+json',
                Authorization: 'Bearer ' + this._element.auth.token,
                'Accept-Language': this._element.lang,
            },
        });

        if (!result.ok) {
            throw await ApiError.fromResponse(result);
        }

        return await result.json();
    }
}
