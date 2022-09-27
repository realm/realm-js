import {Realm} from '@realm/react';

// To use a class as a Realm object type in Typescript with the @realm/babel-plugin plugin,
// simply define the properties on the class with the correct type and the plugin will convert
// it to a Realm schema automatically.
export class Task extends Realm.Object<Task> {
  _id: Realm.BSON.ObjectId = new Realm.BSON.ObjectId();
  description!: string;
  isComplete: boolean = false;
  createdAt: Date = new Date();
  userId!: string;

  static primaryKey = '_id';

  constructor(realm: Realm, description: string, userId?: string) {
    super(realm, {description, userId: userId || '_SYNC_DISABLED_'});
  }

  // static generate(description: string, userId?: string) {
  //   return {
  //     _id: new Realm.BSON.ObjectId(),
  //     description,
  //     isComplete: false,
  //     createdAt: new Date(),
  //     userId: userId || '_SYNC_DISABLED_',
  //   };
  // }
}
