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

import React from 'react';
import {StyleSheet, Switch, Text, View} from 'react-native';

import {AddTaskForm} from '../components/AddTaskForm';
import {IntroText} from '../components/IntroText';
import {TaskList} from '../components/TaskList';
import {shadows} from '../styles/shadows';
import {useTaskManager} from '../hooks/useTaskManager';

/**
 * Displays the list of tasks and a form to add new tasks.
 */
export function TaskScreen() {
  const {
    tasks,
    addTask,
    toggleTaskStatus,
    deleteTask,
    showCompleted,
    toggleShowCompleted,
  } = useTaskManager();

  return (
    <>
      <View style={styles.content}>
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
      </View>
      <View style={styles.switchPanel}>
        <Text style={styles.switchPanelText}>Show Completed?</Text>
        <Switch value={showCompleted} onValueChange={toggleShowCompleted} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  switchPanel: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 5,
    marginHorizontal: 10,
    marginBottom: 10,
    ...shadows,
  },
  switchPanelText: {
    flex: 1,
    fontSize: 16,
    padding: 5,
  },
});
