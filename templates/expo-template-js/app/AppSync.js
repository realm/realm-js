import React, { useEffect, useMemo } from "react";

import TaskContext, { Task } from "./models/Task";
import { TaskManager } from "./components/TaskManager";

const { useRealm, useQuery } = TaskContext;

export const AppSync = ({ currentUserId }) => {
  const realm = useRealm();
  const result = useQuery(Task);

  const tasks = useMemo(() => result.sorted("createdAt"), [result]);

  useEffect(() => {
    realm.subscriptions.update((mutableSubs) => {
      mutableSubs.add(result);
    });
  }, [realm, result]);

  return <TaskManager tasks={tasks} userId={currentUserId} />;
};
