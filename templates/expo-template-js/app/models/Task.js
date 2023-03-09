// This JS version of the Task model shows how to create Realm objects by
// defining a schema on the class, which is required if your project does not
// use TypeScript. If you are using TypeScript, we recommend using
// `@realm/babel-plugin` (https://github.com/realm/realm-js/blob/main/packages/babel-plugin/),
// which allows you to define your models using TypeScript syntax.
//
// See `Task.ts` in the Realm example app for an example of using the plugin.

import {Realm} from '@realm/react';

export class Task extends Realm.Object {
  constructor(realm, description, userId) {
    super(realm, {description, userId: userId || '_SYNC_DISABLED_'});
  }

  // To use a class as a Realm object type in JS, define the object schema on the static property "schema".
  static schema = {
    name: 'Task',
    primaryKey: '_id',
    properties: {
      _id: {type: 'objectId', default: () => new Realm.BSON.ObjectId()},
      description: 'string',
      isComplete: {type: 'bool', default: false},
      createdAt: {type: 'date', default: () => new Date()},
      userId: 'string',
    },
  };
}
