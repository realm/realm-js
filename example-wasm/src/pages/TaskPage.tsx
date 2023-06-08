import { AddTaskForm } from '../components/AddTaskForm';
import { IntroText } from '../components/IntroText';
import { TaskList } from '../components/TaskList';
import { useTaskManager } from '../hooks/useTaskManager';
import styles from '../styles/TaskPage.module.css';

export function TaskPage() {
  const {
    tasks,
    addTask,
    toggleTaskStatus,
    deleteTask,
  } = useTaskManager();

  return (
    <div className={styles.container}>
      <AddTaskForm onSubmit={addTask} />
      {tasks.length === 0 ? (
        <IntroText />
      ) : (
        <TaskList
          tasks={tasks}
          onToggleTaskStatus={toggleTaskStatus}
          onDeleteTask={deleteTask}
        />
      )}
    </div>
  );
}
