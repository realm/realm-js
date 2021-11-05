# Realm React ⚛️ 

A better way to use Realm with React Native applications.

## Introduction
Setting up Realm in a React Native application has historically been complex. Re-rendering of components when objects in the database change requires manually adding and removing listeners, which produce a lot of boilerplate code and is error-prone (if listeners properly removed on unmount). This library alleviates that by providing [React hooks](https://reactjs.org/docs/hooks-intro.html) which return Realm data that is state aware. As a consequence, any change to the Realm data will cause components using the hook to re-render.

## Installation

This library requires `react-native` >= 0.59 and `realm` >= 10.0.0

npm:
```npm install @realm.io/react```

yarn:
```yarn add @realm.io/react```


## Usage
### Setup the RealmContext and Provider

Create a Realm context object with `createRealmContext`.  It takes a Realm configuration and returns a RealmProvider and contextual hooks.

```typescript
import {createRealmContext} from '@realm.io/react';

class Task extends Realm.Object {
  _id!: Realm.BSON.ObjectId;
  description!: string;
  isComplete!: boolean;

  static generate(description: string) {
    return {
      _id: new Realm.BSON.ObjectId(),
      description,
      isComplete: false,
      createdAt: new Date()
    };
  }

  // To use a class as a Realm object type, define the object schema on the static property "schema".
  static schema = {
    name: 'Task',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      description: 'string',
      isComplete: {type: 'bool', default: false},
      createdAt: 'date'
    },
  };
}

export const {RealmProvider, useRealm, useObject, useQuery} =
  createRealmContext({schema: [Task.schema]});
```

Wrap the component needing access to Realm (possibly your entire application) with the `RealmProvider` componenet.
The `RealmProvider` also accepts Realm configuration properties.

```tsx
import {RealmProvider} from './createRealmContext';

function AppWrapper() {
  if (!RealmProvider) {
    return null;
  }
  return (
    <RealmProvider path={"customPath"}>
      <App />
    </RealmProvider>
  );
};
```
### Implement Hooks in Child Components

The hooks created by `createRealmContext` can now be used by any child component.

```tsx
function MyComponent({someId}){
  const realm = useRealm();
  const tasks = useQuery<Task>('Task');
  const someObject = useObject<SomeObject>('Objects', someId);

  // sort collection with useMemo
  const sortedTasks = useMemo( () => tasks.sorted("createdAt"), [tasks])

  // make sure the data is there
  if(!sortedTasks || !someObject){
    return null
  }

  return ...
}
```


