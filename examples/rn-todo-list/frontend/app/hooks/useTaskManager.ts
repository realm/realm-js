////////////////////////////////////////////////////////////////////////////
//
// Copyright 2023 Realm Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
////////////////////////////////////////////////////////////////////////////

import {useCallback, useState} from 'react';
import {useQuery, useRealm} from '@realm/react';

import {Task} from '../models/Task';

/**
 * Provides functions for managing changes to the tasks in the Realm,
 * such as adding, updating, and deleting tasks.
 *
 * @param userId The App user's ID if sync is enabled.
 */
export function useTaskManager(userId = 'SYNC_DISABLED') {
  const realm = useRealm();
  const [showCompleted, setShowCompleted] = useState(true);
  const tasks = useQuery(
    Task,
    collection =>
      showCompleted
        ? collection.sorted('createdAt')
        : collection.filtered('isComplete == false').sorted('createdAt'),
    [showCompleted],
  );

  /**
   * Adds a task to the database.
   *
   * @note
   * Everything in the function passed to `realm.write()` is a transaction and will
   * hence succeed or fail together. A transaction is the smallest unit of transfer
   * in Realm so we want to be mindful of how much we put into one single transaction
   * and split them up if appropriate (more commonly seen server side). Since clients
   * may occasionally be online during short time spans we want to increase the probability
   * of sync participants to successfully sync everything in the transaction, otherwise
   * no changes propagate and the transaction needs to start over when connectivity allows.
   */
  const addTask = useCallback(
    (description: string) => {
      if (!description) {
        return;
      }
      realm.write(() => {
        realm.create(Task, {description, userId});
      });
    },
    [realm, userId],
  );

  /**
   * Updates a task by toggling its `isComplete` status.
   *
   * @note
   * Normally when updating a record in a NoSQL or SQL database, we have to type
   * a statement that will later be interpreted and used as instructions for how
   * to update the record. But in Realm, the objects are "live" because they are
   * actually referencing the object's location in memory on the device (memory mapping).
   * So rather than typing a statement, we modify the object directly by changing
   * the property values. If the changes adhere to the schema, Realm will accept
   * this new version of the object and wherever this object is being referenced
   * locally will also see the changes "live".
   */
  const toggleTaskStatus = useCallback(
    (task: Task) => {
      realm.write(() => {
        task.isComplete = !task.isComplete;
      });

      // Alternatively if passing the ID as the argument to toggleTaskStatus:
      // realm.write(() => {
      //   // If the ID is passed as an ObjectId:
      //   const task = realm.objectForPrimaryKey('Task', id);
      //   // Or, if the ID is passed as a string:
      //   const task = realm.objectForPrimaryKey('Task', Realm.BSON.ObjectId(id));
      //   task.isComplete = !task.isComplete;
      // });
    },
    [realm],
  );

  /**
   * Deletes a task from the database.
   */
  const deleteTask = useCallback(
    (task: Task) => {
      realm.write(() => {
        realm.delete(task);

        // Alternatively if passing the ID as the argument to handleDeleteTask:
        // realm.delete(realm.objectForPrimaryKey('Task', id));
      });
    },
    [realm],
  );

  const toggleShowCompleted = useCallback(() => {
    setShowCompleted(!showCompleted);
  }, [showCompleted]);

  return {
    tasks,
    addTask,
    toggleTaskStatus,
    deleteTask,
    showCompleted,
    toggleShowCompleted,
  };
}
