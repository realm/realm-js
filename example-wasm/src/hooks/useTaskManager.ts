import React, { useCallback } from 'react';
import { Task } from '../models/Task';
const { createRealmContext } = await import('@realm/react');

const realmConfig = { schema: [Task.schema] }; // TODO: Add sync config w/ subscriptions
export const TaskContext = createRealmContext(realmConfig);
const { useRealm, useQuery } = TaskContext;

/**
 * Manages changes to the tasks in the realm.
 */
export function useTaskManager() {
  const tasks = useQuery(Task);
  const realm = useRealm();

  const addTask = useCallback((description: string) => {
    realm.write(() => {
      // TODO: Add user id
      realm.create(Task, { description } as Task);
    });
  }, [realm, /* TODO: Add user id */]);

  const toggleTaskStatus = useCallback((task: Task) => {
    realm.write(() => {
      task.isComplete = !task.isComplete;
    });
  }, [realm]);

  const deleteTask = useCallback((task: Task) => {
    realm.write(() => {
      realm.delete(task);
    });
  }, [realm]);

  return {
    tasks,
    addTask,
    toggleTaskStatus,
    deleteTask
  };
}
