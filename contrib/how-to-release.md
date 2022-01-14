# How to release Realm JavaScript

In order to release Realm JavaScript, you need to be added as a collaborator at [npm](https://npmjs.com) and you need to log in when publishing the package. Moreover, you will need to be member of the [Realm organization at Github](https://github.com/realm).

You will have to build locally for Android and iOS since we are distributing binaries for these platforms within the [`realm`](https://www.npmjs.com/package/realm) package.

It is possible to release from any branch and add a specific tag for this release on npm, for example to release a `beta` version without affecting the `latest` version users will install by default.

The procedure is:

- Determine the correct version number, following [semantic versioning](https://semver.org/). This will be referred to as `X.Y.Z` in this document.
    - For a normal release from master, this will be of the form `X.Y.Z`, e.g. `10.12.0`
    - For a tagged release from a branch, this will be of the form `X.Y.Z-<tag name>.<tag release version>`, e.g. `10.12.0-beta.0`. You should use the full string including the tag part wherever `X.Y.Z` is used in this document.
- Set the version number: `npm run set-version X.Y.Z`
    - For clarity, when releasing from a tagged release, this will be like: `npm run set-version 10.12.0-beta.0`
- Open `dependencies.list` and change `VERSION` to `X.Y.Z`
- It is recommended that you proof-read and mildly edit `CHANGELOG.md`.
    - Verify that all fixes are linked to the associated pull request.
    - If you are releasing from a branch with a tag, note that the version number in the `CHANGELOG` needs updating to match the one used in step 1 – the script will not add the `-beta.0` part automatically.
- Add changes: `git add CHANGELOG.md package.json package-lock.json dependencies.list react-native/ios/RealmReact.xcodeproj/project.pbxproj`
- Commit the changes: `git commit -m "[X.Y.Z] Bump version"`
- Tag the commit: `git tag vX.Y.Z`
- Push the changes: `git push origin --tag master`
    - If you are releasing from another branch, then use that instead of `master`, e.g. `git push origin --tag new_feature`
- Our CI system will build and push binaries for node.js. You can follow the progress at https://ci.realm.io. Once the "Publish" stage is completed, the binaries are uploaded.
    - If you are releasing from a branch, there will need to be an open pull request (draft is fine) for the branch to trigger CI.
- **IMPORTANT**: you must wait for for this CI build to be complete before publishing, or the release will be broken.
- Build Android binaries: `node ./scripts/build-android.js`
- Build iOS binaries: `./scripts/build-ios.sh`
- Publish the package: `npm publish`
    - If you are publishing a tagged release from a branch, use `npm publish --tag <tag_name>`, e.g. `npm publish --tag beta`
- Manually create a new release on Github
    - Find the tag pushed in the previous step.  Click the `...` and select `Create release`
    - Copy text from changelog
    - Click `Publish release`
- Post to `#realm-releases` Slack channel
    - Create post in Slack and copy text from changelog (format the text to Slack markdown (bold is `*bold*`))
    - Share to `#realm-releases` channel
- Apply the changelog template: `./scripts/changelog-header.sh`
- Stage the template: `git add CHANGELOG.md`
- Commit the template: `git commit -m "Adding changelog template"`
- Push the template: `git push origin master`
    - If you are releasing from another branch, then use that instead of `master`

## Troubleshooting

### I accidentally published a release as `latest` when it should have been a tagged release

- Reset the `latest` tag to point to the correct version (the last published version): `npm dist-tag add realm@X.Y.Z latest`, e.g. `npm dist-tag add realm@10.11.0 latest`
- Set the tag to point to your version: `npm dist-tag add realm@X.Y.Z-tag.n <tag_name>`, e.g. `npm dist-tag add realm@10.12.0-beta.0 beta`

Note that npm caches versions for a short period of time so you may need to wait a minute for your changes to take effect.
