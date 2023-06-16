import { useCallback, useEffect, useState } from 'react';

import { Task } from '../models/Task';

const { useQuery, useRealm, useUser } = await import('@realm/react');

/**
 * Manages changes to the tasks in the realm.
 */
export function useTaskManager() {
  const realm = useRealm();
  const user = useUser();
  const [requeryFlag, setRequeryFlag] = useState(false); // Temporary flag
  const tasks = useQuery(Task, (collection) => collection, [requeryFlag]);

  useEffect(() => {
    // Temporary solution for making `useQuery` update the `tasks` reference.
    // (The value doesn't matter, only that it is different from the initial value.)
    setRequeryFlag(true);
  }, []);

  const addTask = useCallback((description: string) => {
    realm.write(() => {
      realm.create(Task, { description, userId: user.id } as Task);
    });
  }, [realm, user.id]);

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
    deleteTask,
  };
}
