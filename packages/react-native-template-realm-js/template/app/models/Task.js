import { BSON } from 'realm';

class Task {
  constructor({ id = new BSON.ObjectId(), description, isComplete = false }) {
    this._id = id;
    this.description = description;
    this.isComplete = isComplete;
  }

  // To use a class as a Realm object type, define the object schema on the static property "schema".
  static schema = {
    name: 'Task',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      description: 'string',
      isComplete: { type: 'bool', default: false }
    }
  };
}

export default Task;
