import React, {useCallback} from 'react';
import {View, StyleSheet} from 'react-native';

import {Task} from '../models/Task';
import {TaskRealmContext} from '../models';
import {IntroText} from './IntroText';
import {AddTaskForm} from './AddTaskForm';
import TaskList from './TaskList';

const {useRealm} = TaskRealmContext;

export const TaskManager: React.FC<{
  tasks: Realm.Results<Task & Realm.Object>;
  userId?: string;
}> = ({tasks, userId}) => {
  const realm = useRealm();

  const handleAddTask = useCallback(
    (description: string): void => {
      if (!description) {
        return;
      }

      // Everything in the function passed to "realm.write" is a transaction and will
      // hence succeed or fail together. A transcation is the smallest unit of transfer
      // in Realm so we want to be mindful of how much we put into one single transaction
      // and split them up if appropriate (more commonly seen server side). Since clients
      // may occasionally be online during short time spans we want to increase the probability
      // of sync participants to successfully sync everything in the transaction, otherwise
      // no changes propagate and the transaction needs to start over when connectivity allows.
      realm.write(() => {
        return new Task(realm, description, userId);
      });
    },
    [realm, userId],
  );

  const handleToggleTaskStatus = useCallback(
    (task: Task & Realm.Object): void => {
      realm.write(() => {
        // Normally when updating a record in a NoSQL or SQL database, we have to type
        // a statement that will later be interpreted and used as instructions for how
        // to update the record. But in RealmDB, the objects are "live" because they are
        // actually referencing the object's location in memory on the device (memory mapping).
        // So rather than typing a statement, we modify the object directly by changing
        // the property values. If the changes adhere to the schema, Realm will accept
        // this new version of the object and wherever this object is being referenced
        // locally will also see the changes "live".
        task.isComplete = !task.isComplete;
      });

      // Alternatively if passing the ID as the argument to handleToggleTaskStatus:
      // realm?.write(() => {
      //   const task = realm?.objectForPrimaryKey('Task', id); // If the ID is passed as an ObjectId
      //   const task = realm?.objectForPrimaryKey('Task', Realm.BSON.ObjectId(id));  // If the ID is passed as a string
      //   task.isComplete = !task.isComplete;
      // });
    },
    [realm],
  );

  const handleDeleteTask = useCallback(
    (task: Task & Realm.Object): void => {
      realm.write(() => {
        realm.delete(task);

        // Alternatively if passing the ID as the argument to handleDeleteTask:
        // realm?.delete(realm?.objectForPrimaryKey('Task', id));
      });
    },
    [realm],
  );

  return (
    <View style={styles.content}>
      <AddTaskForm onSubmit={handleAddTask} />
      {tasks.length === 0 ? (
        <IntroText />
      ) : (
        <TaskList
          tasks={tasks}
          onToggleTaskStatus={handleToggleTaskStatus}
          onDeleteTask={handleDeleteTask}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingTop: 20,
    paddingHorizontal: 20,
  },
});
