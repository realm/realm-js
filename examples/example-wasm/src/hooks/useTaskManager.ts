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
