import Realm from 'realm';

export class Task extends Realm.Object<Task> {
  _id!: Realm.BSON.ObjectId;
  description!: string;
  isComplete!: boolean;
  createdAt!: Date;
  userId!: string;

  static schema: Realm.ObjectSchema = {
    name: 'Task',
    primaryKey: '_id',
    properties: {
      _id: { type: 'objectId', default: () => new Realm.BSON.ObjectId() },
      description: 'string',
      isComplete: { type: 'bool', default: false },
      createdAt: { type: 'date', default: () => new Date() },
      userId: 'string',
    },
  };
}
