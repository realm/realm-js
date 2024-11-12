# Guide: Testing Exclude iCloud Backup

## Prerequisites

- macOS
- iOS Simulator

## Testing

Ensure you have booted a simulator and execute the integration tests on iOS:

```sh
MOCHA_REMOTE_GREP='icloud' npm run test:ios --workspace @realm/react-native-test-app-tests
```

In the command above, we're explicitly grepping for the icloud backup tests.

To verify if a file has been successfully excluded from iCloud backup, you need to check the file's attributes.
We provide an easy script to do so:

```sh
./contrib/scripts/check-exclude-icloud-backup.sh
```

## Testing in your own app

Before starting the testing process, you need to configure your Realm database to either include or exclude files from iCloud backup. This is done by setting the `excludeFromIcloudBackup` property in your Realm configuration. Here is an example of how to set this property:

```javascript
const realmConfig = {
  schema: [
    /* your schema */
  ],
  path: "default.realm",
  excludeFromIcloudBackup: true, // Set to true to exclude from iCloud backup, false to include, defaults to false
};

const realm = new Realm(realmConfig);
```

Make sure to replace the schema and path with your actual Realm schema and desired file path. Once you have configured this property, you can proceed with the following steps to test if the exclusion from iCloud backup is working correctly.

First, get the path of the Realm files from the simulator's Documents folder by running:

```sh
open `xcrun simctl get_app_container booted com.your.app.bundleId data`/Documents
```

This will open a Finder window with the files. Drag and drop each file to the terminal after adding `xattr`:

```sh
xattr <realm file simulator path>
```

If this command returns:

```sh
com.apple.metadata:com_apple_backup_excludeItem
```

It means the file has been successfully marked as excluded from backup 🎉. If it returns nothing, the file has no attributes and is not excluded from backup.
