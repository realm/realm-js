# CRUD - React Native SDK
Within a `RealmProvider`, you can access a realm with
the `useRealm()` hook. Then, you can create Realm objects
using a `Realm.write()`
transaction block.

All operations within a write transaction are [atomic](https://en.wikipedia.org/wiki/Atomicity_(database_systems)).
If an operation in the write transaction fails, the whole transaction fails,
Realm throws an error, and no changes from the transaction block are applied to the realm.

Every write operation must occur in a write transaction.

```typescript
const CreatePersonInput = () => {
  const [name, setName] = useState('');
  const realm = useRealm();

  const handleAddPerson = () => {
    realm.write(() => {
      realm.create('Person', {_id: PERSON_ID, name: name, age: 25});
    });
  };

  return (
    <>
      <TextInput value={name} onChangeText={setName}  />
      <Button
        onPress={() => handleAddPerson()}
        title='Add Person'
      />
    </>
  );
};

```

## Transaction Lifecycle
A given realm only processes one write transaction at a time. When you
make a write transaction, the realm adds the transaction to a queue. The
realm evaluates each transaction in the order it arrived.

After processing a transaction, Realm either **commits** it or
**cancels** it:

- After a **commit**, the realm applies all operations in the transaction.
Once applied, the realm automatically updates live queries. It notifies listeners of created, modified,
and deleted objects. After a commit, objects and collections returned by `useQuery` or
`useObject` rerender to include relevant changes.
- Realm does not apply any operations in a **cancelled**
transaction. Realm cancels a transaction if an operation
fails or is invalid.
