////////////////////////////////////////////////////////////////////////////
//
// Copyright 2021 Realm Inc.
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
import React, { memo } from "react";
import { View, Text, Pressable, Platform, StyleSheet } from "react-native";

import colors from "../styles/colors";

interface TaskItemProps {
  description: string;
  isComplete: boolean;
  onToggleStatus: () => void;
  onDelete: () => void;
}

function TaskItem({ description, isComplete, onToggleStatus, onDelete }: TaskItemProps) {
  return (
    <View style={styles.task}>
      <Pressable onPress={onToggleStatus} style={[styles.status, isComplete && styles.completed]}>
        <Text style={styles.icon}>{isComplete ? "✓" : "○"}</Text>
      </Pressable>
      <View style={styles.descriptionContainer}>
        <Text numberOfLines={1} style={styles.description}>
          {description}
        </Text>
      </View>
      <Pressable onPress={onDelete} style={styles.deleteButton}>
        <Text style={styles.deleteText}>Delete</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  task: {
    height: 50,
    alignSelf: "stretch",
    flexDirection: "row",
    marginVertical: 8,
    backgroundColor: colors.white,
    borderRadius: 5,
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.7,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  descriptionContainer: {
    flex: 1,
    justifyContent: "center",
  },
  description: {
    paddingHorizontal: 10,
    color: colors.black,
    fontSize: 17,
  },
  status: {
    width: 50,
    height: "100%",
    justifyContent: "center",
    borderTopLeftRadius: 5,
    borderBottomLeftRadius: 5,
    backgroundColor: colors.gray,
  },
  completed: {
    backgroundColor: colors.purple,
  },
  deleteButton: {
    justifyContent: "center",
  },
  deleteText: {
    marginHorizontal: 10,
    color: colors.gray,
    fontSize: 17,
  },
  icon: {
    color: colors.white,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "bold",
  },
});

// We want to make sure only tasks that change are rerendered
const shouldNotRerender = (prevProps: TaskItemProps, nextProps: TaskItemProps) =>
  prevProps.description === nextProps.description && prevProps.isComplete === nextProps.isComplete;

export default memo(TaskItem, shouldNotRerender);
