import { Realm, createRealmContext } from '@realm/react';

export class Task {
  constructor({id = new Realm.BSON.ObjectId(), description, isComplete = false}) {
    this.description = description;
    this.isComplete = isComplete;
    this.createdAt = new Date();
    this._id = id;
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

export default createRealmContext({
  schema: [Task.schema],
  deleteRealmIfMigrationNeeded: true,
});