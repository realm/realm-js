<<<<<<< HEAD:packages/realm-react/testApp/App.tsx
import React, { useCallback, useMemo } from "react";
import { SafeAreaView, View, StyleSheet } from "react-native";
=======
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
import React, { useCallback, useEffect, useState } from "react";
import { SafeAreaView, View, StyleSheet, Button, Text } from "react-native";
>>>>>>> andrew/realmreact-docs:packages/realm-react/example/App.tsx

import TaskContext, { Task } from "./app/models/Task";
import IntroText from "./app/components/IntroText";
import AddTaskForm from "./app/components/AddTaskForm";
import TaskList from "./app/components/TaskList";
import colors from "./app/styles/colors";

const { useRealm, useQuery, RealmProvider } = TaskContext;

const actions = ["insert", "delete", "toggle"];

function App() {
  const realm = useRealm();
  const result = useQuery(Task);
  const [runRandom, setRunRandom] = useState(false);

  const tasks = result; //useMemo(() => result.sorted("description"), [result]);

  const handleAddTask = useCallback(
    (description: string): void => {
      if (!description) {
        return;
      }

      // Everything in the function passed to "realm.write" is a transaction and will
      // hence succeed or fail together. A transcation is the smallest unit of transfer
      // in Realm so we want to be mindful of how much we put into one single transaction
      // and split them up if appropriate (more commonly seen server side). Since clients
      // may occasionally be online during short time spans we want to increase the probability
      // of sync participants to successfully sync everything in the transaction, otherwise
      // no changes propagate and the transaction needs to start over when connectivity allows.
      realm.write(() => {
        realm.create("Task", Task.generate(description));
      });
    },
    [realm],
  );

  const handleToggleTaskStatus = useCallback(
    (task: Task): void => {
      realm.write(() => {
        // Normally when updating a record in a NoSQL or SQL database, we have to type
        // a statement that will later be interpreted and used as instructions for how
        // to update the record. But in RealmDB, the objects are "live" because they are
        // actually referencing the object's location in memory on the device (memory mapping).
        // So rather than typing a statement, we modify the object directly by changing
        // the property values. If the changes adhere to the schema, Realm will accept
        // this new version of the object and wherever this object is being referenced
        // locally will also see the changes "live".
        task.isComplete = !task.isComplete;
      });

      // Alternatively if passing the ID as the argument to handleToggleTaskStatus:
      // realm?.write(() => {
      //   const task = realm?.objectForPrimaryKey('Task', id); // If the ID is passed as an ObjectId
      //   const task = realm?.objectForPrimaryKey('Task', Realm.BSON.ObjectId(id));  // If the ID is passed as a string
      //   task.isComplete = !task.isComplete;
      // });
    },
    [realm],
  );

  const handleDeleteTask = useCallback(
    (task: Task): void => {
      realm.write(() => {
        realm.delete(task);

        // Alternatively if passing the ID as the argument to handleDeleteTask:
        // realm?.delete(realm?.objectForPrimaryKey('Task', id));
      });
    },
    [realm],
  );

  useEffect(() => {
    let intervalId: NodeJS.Timer | null = null;
    if (runRandom) {
      intervalId = setInterval(() => {
        const actionIndex = Math.floor(Math.random() * actions.length);
        const taskIndex = Math.floor(Math.random() * tasks.length);
        switch (actions[actionIndex]) {
          case "insert":
            realm.write(() => realm.create(Task, Task.generate(`${taskIndex}`)));
            //console.log("inserting: ", taskIndex);
            break;
          case "delete":
            if (tasks.length > 0) {
              realm.write(() => realm.delete(tasks[taskIndex]));
              //console.log("deleting: ", taskIndex);
            }
            break;
          case "toggle":
            if (tasks.length > 0) {
              realm.write(() => {
                tasks[taskIndex].isComplete = !tasks[taskIndex].isComplete;
              });
              //console.log("toggling: ", taskIndex);
            }
            break;
        }
      }, 100);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [runRandom, realm, tasks]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Button title={runRandom ? "pause" : "start"} onPress={() => setRunRandom(!runRandom)} />
        <Button
          title={"fill"}
          onPress={() => {
            realm.write(() => {
              for (let i = 0; i < 100; i++) {
                realm.create(Task, Task.generate(`${i}`));
              }
            });
          }}
        />
        <Button
          title={"delete random"}
          onPress={() => {
            realm.write(() => {
              for (let i = 0; i < 100; i++) {
                if (tasks.length > 0) {
                  const t = realm.objects(Task);
                  const rand = Math.floor(Math.random() * t.length);
                  const randT = t[rand];
                  realm.delete(randT);
                }
              }
            });
          }}
        />
        <Button
          title={"toggle random"}
          onPress={() => {
            realm.write(() => {
              for (let i = 0; i < tasks.length / 4; i++) {
                if (tasks.length > 0) {
                  const t = realm.objects(Task);
                  const rand = Math.floor(Math.random() * t.length);
                  const randT = t[rand];
                  randT.isComplete = !randT.isComplete;
                }
              }
            });
          }}
        />
        <Button
          title={"delete all"}
          onPress={() => {
            setRunRandom(false);
            realm.write(() => {
              realm.deleteAll();
            });
          }}
        />
        <Text style={{ color: "white" }}>{tasks.length}</Text>
        <AddTaskForm onSubmit={handleAddTask} />
        {tasks.length === 0 ? (
          <IntroText />
        ) : (
          <TaskList tasks={tasks} onToggleTaskStatus={handleToggleTaskStatus} onDeleteTask={handleDeleteTask} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.darkBlue,
  },
  content: {
    flex: 1,
    paddingTop: 20,
    paddingHorizontal: 20,
  },
});

function AppWrapper() {
  const [showApp1, setShowApp1] = useState(true);
  const [showApp2, setShowApp2] = useState(true);

  if (!RealmProvider) {
    return null;
  }
  return (
    <RealmProvider>
      <SafeAreaView>
        <Button title={`${showApp1 ? "hide" : "show"} App 1`} onPress={() => setShowApp1(!showApp1)} />
        <Button title={`${showApp2 ? "hide" : "show"} App 2`} onPress={() => setShowApp2(!showApp2)} />
      </SafeAreaView>
      {showApp1 && <App />}
      {showApp2 && <App />}
    </RealmProvider>
  );
}

export default AppWrapper;
