import { Task } from '../models/Task';
import styles from '../styles/TaskItem.module.css';

type TaskItemProps = {
  task: Task;
  onToggleStatus: () => void;
  onDelete: () => void;
};

// TODO: Memoize
export function TaskItem({ task, onToggleStatus, onDelete }: TaskItemProps) {
  return (
    <div className={task.isComplete ? [styles.task, styles.completed].join(' ') : styles.task}>
      <p className={styles.description}>
        {task.description}
      </p>
      <div className={styles.buttons}>
        <button
          className={[styles.button, styles.toggleBtn].join(' ')}
          onClick={onToggleStatus}
        >
          ✓
        </button>
        <button
          className={[styles.button, styles.deleteBtn].join(' ')}
          onClick={onDelete}
        >
          x
        </button>
      </div>
    </div>
  );
}
