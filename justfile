# Use `just <recipe>` to run a recipe
# https://just.systems/man/en/

import ".shared/common.just"
import ".shared/dbp-app.just"

# By default, run the `--list` command
default:
    @just --list

# Variables

zellijSession := "activity-showcase"

# Open a terminal with the activity-showcase session
[group('dev')]
watch-activity-showcase: kill
    cd activity-showcase && npm run watch
