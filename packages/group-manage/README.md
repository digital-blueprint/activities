# Group Manage Web Component

You can install this component via npm:

```bash
npm i @dbp-toolkit/group-manage
```

## Usage

```html
<dbp-group-manage></dbp-group-manage>
<script
    type="module"
    src="node_modules/@dbp-toolkit/group-manage/dist/dbp-group-manage.js"></script>
```

Or directly via CDN:

```html
<dbp-group-manage></dbp-group-manage>
<script
    type="module"
    src="https://unpkg.com/@dbp-toolkit/group-manage@0.1.0/dist/dbp-group-manage.js"></script>
```

## Attributes

- `lang` (optional, default: `de`): set to `de` or `en` for German or English
    - example `<dbp-group-manage lang="de"></dbp-group-manage>`
- `entry-point-url` (optional, default is the TU Graz entry point url): entry point url to access the api
    - example `<dbp-group-manage entry-point-url="http://127.0.0.1:8000"></dbp-group-manage>`
- `auth` object: you need to set that object property for the auth token
    - example auth property: `{token: "THE_BEARER_TOKEN"}`
    - note: most often this should be an attribute that is not set directly, but subscribed at a provider
- `disabled` (optional): if set the component will be disabled

## Override Properties

## Local development

```bash
# get the source
git clone git@github.com:digital-blueprint/toolkit.git
cd toolkit/packages/group-manage

# install dependencies
npm install

# constantly build dist/bundle.js and run a local web-server on port 8002
npm run watch

# run tests
npm test

# build local packages in dist directory
npm run build
```

Jump to <http://localhost:8002> and you should get a Single Sign On login page.
