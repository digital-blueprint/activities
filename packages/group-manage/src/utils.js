
/**
 * Send a fetch to given url with given options
 * @param   url
 * @param   options
 * @returns {object} response (error or result)
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

export function getPersonFullName(person) {
    const givenName = person['givenName'];
    const familyName = person['familyName'];

    return `${givenName} ${familyName}`;
}

export function getIdFromIri(iri) {
    const segments = iri.split('/');
    const filteredSegments = segments.filter(segment => segment.length > 0);
    return filteredSegments[filteredSegments.length - 1];
}
