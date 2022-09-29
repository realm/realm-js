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
