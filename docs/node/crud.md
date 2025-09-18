# CRUD - Node.js SDK
A write transaction is a function that modifies objects in a realm. Write
transactions let you create, modify, or delete Realm objects. They handle
operations in a single, idempotent update. A transaction is
*all or nothing*. Either:

- All the operations in the transaction succeed, or;
- If any operation fails, none of the operations complete.

> **IMPORTANT:**
> Every write operation must occur in a write transaction.
>

Write transactions are callback functions that you pass to a realm
instance. For examples of specific write operations, see
CRUD - Node.js SDK.

## Transaction Lifecycle
A given realm only processes one write transaction at a time. When you
make a write transaction, the realm adds the transaction to a queue. The
realm evaluates each transaction in the order it arrived.

After processing a transaction, Realm either **commits** it or
**cancels** it:

- After a **commit**, the realm applies all operations in the transaction.
Once applied, the realm automatically updates live queries. It notifies listeners of created, modified, and
deleted objects.
- Realm does not apply any operations in a **cancelled**
transaction. Realm cancels a transaction if an operation
fails or is invalid.
