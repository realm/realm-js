# How to release Realm JavaScript

In order to release Realm JavaScript, you need to be added as a collaborator at [npm](https://npmjs.com) and you need to log in when publishing the package. Moreover, you will need to be member of the [Realm organization at Github](https://github.com/realm).

You will have to build locally for Android and iOS since we are distributing binaries for these platforms within the [`realm`](https://www.npmjs.com/package/realm) package.

It is possible to release from any branch.

Please remember that we follow [semantic versioning](https://semver.org/). Prior to release, you will have to determine the version. In the following, the version will be `X.Y.Z`.

The procedure is:

* Set the version number: `npm run set-version X.Y.Z`
* Open `dependencies.list` and change `VERSION` to `X.Y.Z`
* It is recommended that you proof-read and mildly edit `CHANGELOG.md`.
* Add changes: `git add CHANGELOG.md package.lock package-lock.json dependencies.list react-native/ios/RealmReact.xcodeproj/project.pbxproj`
* Tag the commit: `git tag vX.Y.Z`
* Commit the changes: `git commit -m "[X.Y.Z] Bump version"`
* Push the changes: `git push origin --tag master` (if you are releasing from another branch, then use that instead of `master`)
* Our CI system will build and push binaries for node.js. You can follow the progress at https://ci.realm.io. Once the "Publish" stage is completed, the binaries are uploaded.
* Build Android binaries: `node ./scripts/build-android.js`
* Build iOS binaries: `./scripts/build-ios.sh`
* Publish the package: `npm publish`
* Apply the changelog template: `./scripts/changelog-header.sh`
* Stage the template: `git add CHANGELOG.md`
* Commit the template: `git commit -m "Adding changelog template"`
* Push the template: `npm push origin master` (if you are releasing from another branch, then use that instead of `master`)
