# Activity showcase

## Overview

This repository uses workspaces to link multiple separate packages together and
to hoist all shared dependencies to the top level node_modules.

In addition, we use [lerna](https://lerna.js.org/) for running commands for all contained packages.

## Local development

```bash
# get the source
git clone git@github.com:digital-blueprint/activities.git
cd activities
git submodule update --init

# install dependencies
npm install

# constantly build activity-showcase and run a local web-server on port 8001 
cd ./activity-showcase && npm run watch

# run tests
npm test
```

Jump to <https://localhost:8001>, and you should get the Activity Showcase page.

`cd packges/some-package` and continue development with `npm run watch` etc.

> [!TIP]
> Make sure that the `activity-showcase` package has your package as dependency!

## Other commands

* `npm run test` -  Run test for all packages
* `npm run clean` - Removes all `node_modules` directories.
