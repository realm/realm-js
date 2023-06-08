import Realm from 'realm';

import { Task } from '../models/Task';
import { TaskItem } from './TaskItem';
import styles from '../styles/TaskList.module.css';

type TaskListProps = {
  tasks: Realm.Results<Task>;
  onToggleTaskStatus: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
};

export function TaskList({ tasks, onToggleTaskStatus, onDeleteTask }: TaskListProps) {
  return (
    <div className={styles.tasks}>
      {tasks.map((task) => (
        <TaskItem
          key={task._id.toHexString()}
          task={task}
          onToggleStatus={onToggleTaskStatus}
          onDelete={onDeleteTask}
        />
      ))}
    </div>
  );
}
