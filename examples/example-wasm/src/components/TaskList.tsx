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
