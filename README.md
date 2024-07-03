# Activity showcase

## Overview


This repository uses workspaces to link multiple separate packages together and
to hoist all shared dependencies to the top level node_modules.

In addition, we use [lerna](https://lerna.js.org/) for running commands for all contained packages.

## Setup

```
npm install
```

`cd packges/some-package` and continue development with `npm run watch` etc.

## Other commands

* `npm run test` -  Run test for all packages
* `npm run clean` - Removes all `node_modules` directories.
