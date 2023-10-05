## Sync Logging

![Logger](https://github.com/realm/realm-js/blob/main/contrib/logger/assets/sync_logging.png)

The logs can be configured using two functions: 

```js
   Realm.App.Sync.setLogLevel()
   Realm.App.Sync.setLogger()
```

These two functions are the entry point to configure the sync behaviour which is handled natively. Then in C++ land, we use the ``logger.hpp`` class to isolate our JS engine (``js_sync.hpp``) from the other two frameworks we depend on which are ``object-store`` and `realm-core`.
