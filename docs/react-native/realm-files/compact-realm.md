# Reduce Realm File Size - React Native SDK
Over time, the storage space used by Realm might become fragmented
and take up more space than necessary. To rearrange the internal storage and
potentially reduce the file size, the realm file needs to be compacted.

Realm's default behavior is to automatically compact a realm file
to prevent it from growing too large. You can use manual compaction strategies when
automatic compaction is not sufficient for your use case.

## Automatic Compaction
> Version added: 11.3.0

The SDK automatically compacts Realm files in the background by continuously reallocating data
within the file and removing unused file space. Automatic compaction is sufficient for minimizing the Realm file size
for most applications.

## Manual Compaction Options
Manual compaction can be used for applications that
require stricter management of file size or that use an older version
of the SDK that does not support automatic compaction.

Realm reduces the file size by writing a new (compact) version of the file and
then replacing the original with the newly-written file. Therefore, to compact,
you must have free storage space equivalent to the original realm file size.

You can configure Realm to automatically compact the database each time a
realm is opened, or you can compact the file without first obtaining a
realm instance.

### Realm Configuration File
You can configure Realm to check the realm file each time it is opened
by specifying a `shouldCompact` function
for the configuration. The following code example shows how to do this:

```javascript

    const shouldCompact = (totalBytes, usedBytes) => {
      // totalBytes refers to the size of the file on disk in bytes (data + free space)
      // usedBytes refers to the number of bytes used by data in the file

      // Compact if the file is over 100MB in size and less than 50% 'used'
      const oneHundredMB = 100 * 1024 * 1024;
      return totalBytes > oneHundredMB && usedBytes / totalBytes < 0.5;
    };
    const config = { shouldCompact };

    let realm = await Realm.open(config);

```

### Realm.compact() Method
Alternatively, you can compact a realm file without first obtaining an instance
of the realm by calling the `compact()`
method:

```javascript
const realm = new Realm("my.realm");
realm.compact();

```

The `compact()` method will return true if the operation is successful.

### Make a Compacted Copy
You can save a compacted (and optionally encrypted)
copy of a realm to another file location with the `Realm.writeCopyTo()`
method. The destination file cannot already exist.

> **IMPORTANT:**
> Avoid calling `writeCopyTo()` within a write transaction.
If called within a write transaction, this
method copies the absolute latest data. This includes any
**uncommitted** changes you made in the transaction before this
method call.
>

### Tips for Manually Compacting a Realm
Manually compacting a realm can be a resource-intensive operation.
Your application should not compact every time you open
a realm. Instead, try to optimize compacting so your application does
it just often enough to prevent the file size from growing too large.
If your application runs in a resource-constrained environment,
you may want to compact when you reach a certain file size or when the
file size negatively impacts performance.

These recommendations can help you start optimizing compaction for your
application:

- Set the max file size to a multiple of your average realm state
size. If your average realm state size is 10MB, you might set the max
file size to 20MB or 40MB, depending on expected usage and device
constraints.
- As a starting point, compact realms when more than 50% of the realm file
size is no longer in use. Divide the currently used bytes by the total
file size to determine the percentage of space that is currently used.
Then, check for that to be less than 50%. This means that greater than
50% of your realm file size is unused space, and it is a good time to
compact. After experimentation, you may find a different percentage
works best for your application.

These calculations might look like this:

```javascript
// Set a maxFileSize equal to 20MB in bytes
const maxFileSize = 20 * 1024 * 1024;

/* Check for the realm file size to be greater than the max file size,
 * and the amount of bytes currently used to be less than 50% of the
 * total realm file size */
return (totalBytes > (double)maxFileSize) &&
   ((double)usedBytes / totalBytes < 0.5);
```

Experiment with conditions to find the right balance of how often to
compact realm files in your application.
