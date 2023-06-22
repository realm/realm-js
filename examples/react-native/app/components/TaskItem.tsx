import React from 'react';
import Realm from 'realm';
import {View, Text, Pressable, StyleSheet} from 'react-native';

import {shadows} from '../styles/shadows';
import colors from '../styles/colors';
import {Task} from '../models/Task';

type TaskItemProps = {
  task: Task & Realm.Object;
  onToggleStatus: () => void;
  onDelete: () => void;
};

export const TaskItem = React.memo<TaskItemProps>(
  ({task, onToggleStatus, onDelete}) => {
    return (
      <View style={styles.task}>
        <Pressable
          onPress={onToggleStatus}
          style={[styles.status, task.isComplete && styles.completed]}>
          <Text style={styles.icon}>{task.isComplete ? '✓' : '○'}</Text>
        </Pressable>
        <View style={styles.descriptionContainer}>
          <Text numberOfLines={1} style={styles.description}>
            {task.description}
          </Text>
        </View>
        <Pressable onPress={onDelete} style={styles.deleteButton}>
          <Text style={styles.deleteText}>Delete</Text>
        </Pressable>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  task: {
    height: 50,
    alignSelf: 'stretch',
    flexDirection: 'row',
    marginVertical: 8,
    backgroundColor: colors.white,
    borderRadius: 5,
    ...shadows,
  },
  descriptionContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  description: {
    paddingHorizontal: 10,
    color: colors.black,
    fontSize: 17,
  },
  status: {
    width: 50,
    height: '100%',
    justifyContent: 'center',
    borderTopLeftRadius: 5,
    borderBottomLeftRadius: 5,
    backgroundColor: colors.gray,
  },
  completed: {
    backgroundColor: colors.purple,
  },
  deleteButton: {
    justifyContent: 'center',
  },
  deleteText: {
    marginHorizontal: 10,
    color: colors.gray,
    fontSize: 17,
  },
  icon: {
    color: colors.white,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: 'bold',
  },
});
