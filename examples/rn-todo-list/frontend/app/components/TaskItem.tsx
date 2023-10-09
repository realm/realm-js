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

import React, {memo} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import type {Task} from '../models/Task';
import {colors} from '../styles/colors';

type TaskItemProps = {
  task: Task;
  onToggleStatus: (task: Task) => void;
  onDelete: (task: Task) => void;
};

/**
 * Displays a task list item with options to update or delete it.
 */
export const TaskItem = memo<TaskItemProps>(
  ({task, onToggleStatus, onDelete}) => {
    return (
      <View style={[styles.task, task.isComplete && styles.taskCompleted]}>
        <Pressable
          accessibilityLabel={`Mark task as ${
            task.isComplete ? 'not done' : 'done'
          }`}
          onPress={() => onToggleStatus(task)}
          style={[styles.status, task.isComplete && styles.statusCompleted]}>
          <Text style={styles.statusIcon}>{task.isComplete ? '✓' : '○'}</Text>
        </Pressable>
        <View style={styles.descriptionContainer}>
          <Text
            numberOfLines={1}
            style={[
              styles.description,
              task.isComplete && styles.descriptionCompleted,
            ]}>
            {task.description}
          </Text>
        </View>
        <Pressable
          accessibilityLabel="Delete task"
          onPress={() => onDelete(task)}
          style={styles.deleteButton}>
          <Text style={styles.deleteIcon}>x</Text>
        </Pressable>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  task: {
    height: 55,
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.grayMedium,
    backgroundColor: colors.white,
  },
  taskCompleted: {
    borderColor: colors.purple,
    backgroundColor: colors.purple,
  },
  descriptionContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  description: {
    paddingHorizontal: 10,
    fontSize: 15,
    color: colors.grayDark,
  },
  descriptionCompleted: {
    color: colors.white,
  },
  status: {
    width: 50,
    height: '100%',
    justifyContent: 'center',
    borderRadius: 5,
    borderRightWidth: 1,
    borderColor: colors.grayMedium,
    backgroundColor: colors.white,
  },
  statusCompleted: {
    borderColor: colors.purple,
  },
  statusIcon: {
    textAlign: 'center',
    fontSize: 17,
    color: colors.purple,
  },
  deleteButton: {
    width: 30,
    height: 30,
    marginRight: 10,
    justifyContent: 'center',
    borderWidth: 0.5,
    borderRadius: 30,
    borderColor: colors.white,
    backgroundColor: colors.red,
  },
  deleteIcon: {
    marginTop: -2,
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 12,
    color: colors.white,
  },
});
