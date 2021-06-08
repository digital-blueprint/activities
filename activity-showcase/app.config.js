export default {
    local: {
        basePath: '/dist/',
        entryPointURL: 'http://127.0.0.1:8000',
        keyCloakBaseURL: 'https://auth-dev.tugraz.at/auth',
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
        entryPointURL: 'https://mw-dev.tugraz.at',
        keyCloakBaseURL: 'https://auth-dev.tugraz.at/auth',
        keyCloakClientId: 'common-dev_tugraz_at-COMMON',
        matomoUrl: 'https://analytics.tugraz.at/',
        matomoSiteId: 131,
        nextcloudBaseURL: 'https://nc-dev.tugraz.at/pers',
        nextcloudName: 'TU Graz cloud',
        siteName: 'TU Graz',
        siteSubName: 'Graz University of Technology'
    },
};