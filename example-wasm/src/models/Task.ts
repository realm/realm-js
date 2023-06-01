import Realm, { BSON } from 'realm';

export class Task extends Realm.Object<Task> {
  _id!: BSON.ObjectId;
  description!: string;
  isComplete!: boolean;
  createdAt!: Date;
  userId?: BSON.ObjectId;

  // Note: Can either use a 'generate()' method to create the default
  //       values or put them as default in the schema.
  // static generate(description: string, userId?: BSON.ObjectId): Task {
  //   return {
  //     _id: new BSON.ObjectId(),
  //     description,
  //     isComplete: false,
  //     createdAt: new Date(),
  //     userId,
  //   };
  // }

  static schema: Realm.ObjectSchema = {
    name: 'Task',
    primaryKey: '_id',
    properties: {
      _id: { type: 'objectId', default: () => new BSON.ObjectId() },
      description: 'string',
      isComplete: { type: 'bool', default: false },
      createdAt: { type: 'date', default: () => new Date() },
      userId: 'objectId?',
    },
  };
}
