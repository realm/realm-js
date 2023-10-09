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
import {FlatList, StyleSheet, View} from 'react-native';
import type Realm from 'realm';

import {Task} from '../models/Task';
import {TaskItem} from './TaskItem';

type TaskListProps = {
  tasks: Realm.Results<Task>;
  onToggleTaskStatus: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
};

/**
 * Displays a list of tasks.
 */
export function TaskList({
  tasks,
  onToggleTaskStatus,
  onDeleteTask,
}: TaskListProps) {
  return (
    <View style={styles.listContainer}>
      <FlatList
        data={tasks}
        keyExtractor={task => task._id.toString()}
        renderItem={({item: task}) => (
          <TaskItem
            task={task}
            onToggleStatus={onToggleTaskStatus}
            onDelete={onDeleteTask}
            // Don't spread the Realm item as such: {...item}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    flex: 1,
  },
});
