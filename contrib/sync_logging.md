## Sync Logging

![Logger](https://raw.githubusercontent.com/realm/realm-js/08b031dc7b4b85bcbd433bd4b766e86405bd04f2/contrib/assets/sync_logging.png)

The logs can be configured using two functions: 

```js
   Realm.App.Sync.setLogLevel()
   Realm.App.Sync.setLogger()
```

This two functions are the entry point to configure the sync behaviour which is handled natively. Then in C++ land, we use the ``logger.hpp`` class to isolate our JS engine (``js_sync.hpp``) from the other two frameworks we depend on which are ``object-store`` and ``realm-core``.  


This is important because we don't want changes on ``realm-core`` or ``object-store`` to break other parts of our JS engine and leave our self clueless, we want that if any related to logging breaks we can locate it inside the ``logger`` class.
