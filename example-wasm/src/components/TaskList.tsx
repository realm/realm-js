import React from 'react';
import Realm from 'realm';

import { Task } from '../models/Task';
import { TaskItem } from './TaskItem';

type TaskListProps = {
  tasks: Realm.Results<Task /*& Realm.Object*/>;
  onToggleTaskStatus: (task: Task /*& Realm.Object*/) => void;
  onDeleteTask: (task: Task /*& Realm.Object*/) => void;
};

export function TaskList({ tasks, onToggleTaskStatus, onDeleteTask }: TaskListProps) {
  return (
    <div>
      {tasks.map((task) => (
        <TaskItem
          key={task._id.toHexString()}
          task={task}
          onToggleStatus={() => onToggleTaskStatus(task)}
          onDelete={() => onDeleteTask(task)}
        />
      ))}
    </div>
  );
}
