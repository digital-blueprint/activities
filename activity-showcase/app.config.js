export default {
    local: {
        basePath: '/dist/',
        entryPointURL: 'http://127.0.0.1:8000',
        keyCloakBaseURL: 'https://auth-dev.tugraz.at/auth',
        keyCloakRealm: 'tugraz-vpu',
        keyCloakClientId: 'auth-dev-mw-frontend-local',
        matomoUrl: 'https://analytics.tugraz.at/',
        matomoSiteId: 131,
        nextcloudBaseURL: 'http://localhost:8081',
        nextcloudName: 'TU Graz cloud',
        siteName: 'TU Graz',
        siteSubName: 'Graz University of Technology'
    },
    development: {
        basePath: '/apps/common/',
        entryPointURL: 'https://api-dev.tugraz.at',
        keyCloakBaseURL: 'https://auth-dev.tugraz.at/auth',
        keyCloakRealm: 'tugraz-vpu',
        keyCloakClientId: 'dbp-common',
        matomoUrl: 'https://analytics.tugraz.at/',
        matomoSiteId: 131,
        nextcloudBaseURL: 'https://cloud-dev.tugraz.at',
        nextcloudName: 'TU Graz cloud',
        siteName: 'TU Graz',
        siteSubName: 'Graz University of Technology'
    },
};