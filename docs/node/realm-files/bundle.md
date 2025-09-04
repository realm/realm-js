# Bundle a Realm File - Node SDK
Realm supports **bundling** realm files. When you bundle
a realm file, you include a database and all of its data in your
application download.

This allows users to start applications for the first time with a set of
initial data.

## Overview
To create and bundle a realm file with your application:

1. Create a realm file that
contains the data you'd like to bundle.
2. Add the bundled realm file
to your production application.
3. In your production application,
open the realm from the bundled asset file.

## Create a Realm File for Bundling
1. Build a temporary realm app that shares the data model of your
application.
2. Open a realm and add the data you wish to bundle.
3. Use the `writeCopyTo()`
method to copy the realm to a new file:
```javascript
const originalPath = path.join(__dirname, "original.realm");
const originalConfig = {
  schema: [Car],
  path: originalPath,
};
const originalRealm = await Realm.open(originalConfig);

const copyPath = path.join(__dirname, "copy.realm");
originalRealm.writeCopyTo(copyPath);
```
`writeCopyTo()` automatically compacts your realm to the smallest
possible size before copying.

4. Note the filepath of the bundled realm file, which can be found at the location specified in the argument
passed to `writeCopyTo()` in the previous step. You'll need this file to use
the bundled realm in your production application, as described in the next
section.

```text
.
├── copyOfDefault.realm
... rest of files in _temp_ application
```

## Bundle a Realm File in Your Production Application
Now that you have a copy of the realm that contains the initial data,
bundle it with your production application.

Add the bundled realm file made in the previous section to your production
application.

```text
.
├── copyOfDefault.realm
... rest of files in _prod_ application
```

## Open a Realm from a Bundled Realm File
Now that you have a copy of the realm included with your production
application, you need to add code to use it.

Create a `Configuration` with the path
to the bundled realm as the value for the `path` field. Pass that configuration
to the `Realm.open()` method. Now you can work with the data
from your bundled realm in the realm you've just opened.

```javascript
const copyConfig = {
  schema: [Car],
  path: "path/to/bundled/file.realm"
};
const copyRealm = await Realm.open(copyConfig);

```
