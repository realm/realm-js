import React from 'react';
import {View, FlatList, StyleSheet} from 'react-native';

import TaskItem from './TaskItem';

function TaskList({tasks, onToggleTaskStatus, onDeleteTask}) {
  return (
    <View style={styles.listContainer}>
      <FlatList
        data={tasks}
        keyExtractor={task => task._id.toString()}
        renderItem={({item}) => (
          <TaskItem
            description={item.description}
            isComplete={item.isComplete}
            onToggleStatus={() => onToggleTaskStatus(item)}
            onDelete={() => onDeleteTask(item)}
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
    justifyContent: 'center',
  },
});

export default TaskList;
