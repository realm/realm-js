# Work with Realm Files - Node.js SDK
Realms are the core data structure used to organize data in Realm Database. At
its core, a realm is a collection of the objects that you use in your
application, called Realm objects, as well as additional metadata that describe
the objects.

## Realm Files
Realm stores a binary encoded version of every object and type in a
realm in a single `.realm` file. The file is located at a specific path that
you define when you open the realm.

> **TIP:**
> Every production application should implement a `shouldCompactOnLaunch`
callback to periodically reduce the realm file size.
>

### Auxiliary Files
Realm creates additional files for each realm:

- **realm files**, suffixed with "realm", e.g. default.realm:
contain object data.
- **lock files**, suffixed with "lock", e.g. default.realm.lock:
keep track of which versions of data in a realm are
actively in use. This prevents realm from reclaiming storage space
that is still used by a client application.
- **note files**, suffixed with "note", e.g. default.realm.**NOTE:**
enable inter-thread and inter-process notifications.
- **management files**, suffixed with "management", e.g. default.realm.management:
internal state management.

If you delete a realm file or any of its auxiliary files while one or
more instances of the realm are open, you might corrupt the realm or
disrupt sync.

You may safely delete these files when all instances of a realm are
closed.

### In-Memory Realms
You can also open a realm entirely in memory, which will not create a `.realm`
file or its associated auxiliary files. Instead the SDK stores objects in memory
while the realm is open and discards them immediately when all instances are
closed.
