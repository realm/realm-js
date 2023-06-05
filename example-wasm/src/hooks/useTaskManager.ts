import React, { useCallback } from 'react';

import { Task } from '../models/Task';

const { useQuery, useRealm, useUser } = await import('@realm/react');

/**
 * Manages changes to the tasks in the realm.
 */
export function useTaskManager() {
  const realm = useRealm();
  const user = useUser();
  const tasks = useQuery(Task); // TODO: Fix rerendering

  const addTask = useCallback((description: string) => {
    console.log('Adding task:', description);
    realm.write(() => {
      realm.create(Task, { description, userId: user.id } as Task);
    });
  }, [realm, user]);

  const toggleTaskStatus = useCallback((task: Task) => {
    console.log('Toggling task status:', task.isComplete, '->', !task.isComplete);
    realm.write(() => {
      task.isComplete = !task.isComplete;
    });
  }, [realm]);

  const deleteTask = useCallback((task: Task) => {
    console.log('Deleting task:', task.description);
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
