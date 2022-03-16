<p align="center">
  <img height="140" src="logo.svg" alt="Realm React Logo"/>
</p>

<h1 align="center">
  Realm React
</h1>

A better way to use Realm with React Native applications.

## Introduction
Setting up Realm in a React Native application has historically been complex. Re-rendering of components when objects in the database change requires manually adding and removing listeners, which produce a lot of boilerplate code and is error-prone (if listeners properly removed on unmount). This library alleviates that by providing [React hooks](https://reactjs.org/docs/hooks-intro.html) which return Realm data that is state aware. As a consequence, any change to the Realm data will cause components using the hook to re-render.

## Installation

This library requires `react-native` >= 0.59 and `realm` >= 10

npm:

```
npm install realm @realm/react
```

yarn:

```
yarn add realm @realm/react
```


## Usage
### Setup the RealmContext and Provider

Create a Realm context object with `createRealmContext`.  It takes a Realm configuration and returns a RealmProvider and contextual hooks.

```typescript
// realm.ts
import {Realm, createRealmContext} from '@realm/react';

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

export default createRealmContext({schema: [Task]});
```

Wrap the component needing access to Realm (possibly your entire application) with the `RealmProvider` componenet.
The `RealmProvider` also accepts Realm configuration properties.

```tsx
import RealmContext from './realm';

const {RealmProvider} = RealmContext

function AppWrapper() {
  return (
    <RealmProvider>
      <App />
    </RealmProvider>
  );
};
```
### Implement Hooks in Child Components

The hooks created by `createRealmContext` can now be used by any child component.

```tsx
import RealmContext from './realm';

const {useRealm, useQuery, useObject} = RealmContext

function MyComponent({someId}){
  const realm = useRealm();
  const tasks = useQuery(Task);
  const singleTask = useObject(Task, taskId);

  // sort collection with useMemo
  const sortedTasks = useMemo( () => tasks.sorted("createdAt"), [tasks])

  // make sure the data is there
  if(!sortedTasks || !someObject){
    return null
  }

  return ...
}
```

### Dynamically Updating a Realm Configuration

It is possible to update the realm configuration by setting props on the RealmProvider.  The RealmProvider takes props for all possible realm configuration properties.

For example, one could setup the sync configuration based on a user state:

```tsx
const [user, setUser] = useState()

//... some logic to get user state

<RealmProvider sync={user, parition}>
```
