import {Realm} from '@realm/react';

export class Task extends Realm.Object {
  _id!: Realm.BSON.ObjectId;
  description!: string;
  isComplete!: boolean;
  createdAt!: Date;
  userId!: string;

  static generate(description: string, userId?: string) {
    return {
      _id: new Realm.BSON.ObjectId(),
      description,
      isComplete: false,
      createdAt: new Date(),
      userId: userId || '_SYNC_DISABLED_',
    };
  }
}
