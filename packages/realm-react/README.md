# Realm React ⚛️ 

A better way to use Realm with React Native applications.

## Introduction
Setting up Realm in a React-Native application has been historically complex. Developers had been forced to develop their own methods to handle changes to Realm state.  This can be error-prone an difficult to handle.  This library alleviates that by providing hooks which return Realm data that is state aware.  Any changes to the Realm data will cause components using the hook to rerender.

## Installation

This library requires `react-native` >= 0.59 and `realm` >= 10.0.0

npm:
```npm install @realm.io/react```

yarn:
```yarn add @realm.io/react```


## Usage
### Setup the RealmContext and Provider

Create a Realm context object with `createRealmContext`.  It takes a Realm configuration and returns a RealmProvider and contextual hooks.

```
// RealmContext.tsx
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
    },
  };
}

export const {RealmProvider, useRealm, useObject, useQuery} =
  createRealmContext({schema: [Task.schema]});
```

Wrap the component needing access to Realm (possible your entire application) with the RealmProvider componenet.

```
import {RealmProvider} from './createRealmContext';

function AppWrapper() {
  if (!RealmProvider) {
    return null;
  }
  return (
    <RealmProvider>
      <App />
    </RealmProvider>
  );
};
```
### Implement Hooks in Child Components

The hooks created by `createRealmContext` can now be used by any child component.

```
function MyComponent({someId}){
	const realm = useRealm();
	const {data: tasks, error: tasksError} = useQuery<Task>('Task');
	const {data: someObject, error: someObjectError} = useQuery<SomeObject>('Objects');

	if(tasksError || someObjectError){
		console.error(`${tasksError} ${someObjectError});
		return null
	}

	return ...
}
```
