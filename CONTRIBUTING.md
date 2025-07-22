# Contributing

How to contribute to @montonio/montonio-js and make a PR for releasing a new version.

## Getting started

1. Clone the repository: `git clone https://github.com/montonio/montonio-js`
2. Go into the cloned folder: `cd montonio-js/`
3. Install all dependencies: `npm install`

### Linking the local version to your project

1. Make it available to your other project: `npm link`
2. Start the build in watch mode: `npm start`
3. Navigate to your other project and link the local version: `npm link @montonio/montonio-js` (run this in the root of your other project)

## Releasing a new version

To release a new version, code from `develop` branch should be merged as follows for each environment:

1. `develop` -> `prelive` to release the prelive version
2. `prelive` -> `live` to release the live version

The release process for each environment is automated by Github Actions and will be triggered upon merging to the respective branch.

**Important!** Before merging to `prelive`, make sure you have bumped the package version in `develop`. You can do this by running `npm version patch --no-git-tag-version`. This changes the version number in `package.json` and `package-lock.json`. For a minor or major version bump, use `npm version minor` or `npm version major` respectively.

Commit the changes and merge to `develop` before merging to `prelive`. If a package with the same version already exists, PR checks will fail and you will need to bump the version again.
