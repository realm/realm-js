import React from 'react';
import {View, FlatList, StyleSheet} from 'react-native';
import {Realm} from '@realm/react';

import {Task} from '../models/Task';
import {TaskItem} from './TaskItem';

type TaskListProps = {
  tasks: Realm.Results<Task & Realm.Object>;
  onToggleTaskStatus: (task: Task & Realm.Object) => void;
  onDeleteTask: (task: Task & Realm.Object) => void;
};

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  onToggleTaskStatus,
  onDeleteTask,
}) => {
  return (
    <View style={styles.listContainer}>
      <FlatList
        data={tasks}
        keyExtractor={task => task._id.toString()}
        renderItem={({item}) => (
          <TaskItem
            task={item}
            onToggleStatus={() => onToggleTaskStatus(item)}
            onDelete={() => onDeleteTask(item)}
            // Don't spread the Realm item as such: {...item}
          />
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  listContainer: {
    flex: 1,
    justifyContent: 'center',
  },
});

export default TaskList;
