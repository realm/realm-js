import { Task } from '../models/Task';

type TaskItemProps = {
  task: Task;
  onToggleStatus: () => void;
  onDelete: () => void;
};

// TODO: Memoize
export function TaskItem({ task, onToggleStatus, onDelete }: TaskItemProps) {
  return (
    <div>
      <button onClick={onToggleStatus}>
        {task.isComplete ? '✓' : '○'}
      </button>
      <p>
        {task.description}
      </p>
      <button onClick={onDelete}>
        Delete
      </button>
    </div>
  );
}
