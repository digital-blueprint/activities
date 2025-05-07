/**
 * Send a fetch to given url with given options
 * @param {string} url
 * @param {object} options
 * @returns {Promise<any>} response (error or result)
 */
export async function httpGetAsync(url, options) {
    let response = await fetch(url, options)
        .then((result) => {
            if (!result.ok) throw result;
            return result;
        })
        .catch((error) => {
            return error;
        });

    return response;
}
/**
 * Return a person full name from a person object
 * @param {object} person
 * @returns {string} person full name
 */
export function getPersonFullName(person) {
    const givenName = person['givenName'];
    const familyName = person['familyName'];

    return `${givenName} ${familyName}`;
}

/**
 * Return the last part of an IRI the identifier
 * @param {string} iri
 * @returns {string} id
 */
export function getIdFromIri(iri) {
    const segments = iri.split('/');
    const filteredSegments = segments.filter((segment) => segment.length > 0);
    return filteredSegments[filteredSegments.length - 1];
}
