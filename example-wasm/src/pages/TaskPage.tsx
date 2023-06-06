import React from 'react';

import { AddTaskForm } from '../components/AddTaskForm';
import { IntroText } from '../components/IntroText';
import { TaskList } from '../components/TaskList';
import { useTaskManager } from '../hooks/useTaskManager';

export function TaskPage() {
  const {
    tasks,
    addTask,
    toggleTaskStatus,
    deleteTask,
  } = useTaskManager();

  return (
    <div>
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
