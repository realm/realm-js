# Realm Object Store

Cross-platform code used accross bindings. Binding developers can choose to use some or all the included functionality
- `object_store`/`schema`/`object_schema`/`property` - contains the structures and logic used to setup and modify realm files and their schema.
- `shared_realm` - wraps the object_store apis to provide transactions, notifications, realm caching, migrations, and other higher level functionality.
- `object_accessor`/`results`/`list` - accessor classes, object creation/update pipeline, and helpers for creating platform specific property getters and setters.
- `parser`/`query_builder` - cross platform query parser and query builder - requires and object_accessor specialization for argument support. Depends on https://github.com/ColinH/PEGTL

## Building

TBD

## Testing

TBD
