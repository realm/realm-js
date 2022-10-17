# Internal dependencies of the SDK

This document is an attempt at codifying the expected internal dependencies between units of the package.
We need this to control the way classes are exposed to each other in the case that two classes (indirectly) depend on each other.

* Realm
  * Collection
  * OrderedCollection (has `Results` and `Object` injected)
  * Results
  * List
  * Set
  * Dictionary
  * Object
