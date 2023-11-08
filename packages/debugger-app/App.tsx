import { View, StyleSheet } from 'react-native';

import Realm from "realm";
import { RealmProvider } from "@realm/react";
import { RealmDebuggerModal } from '@realm/debugger';

const styles = StyleSheet.create({
  container: {
    flex: 1
  }
});

export class Project extends Realm.Object {
  _id!: Realm.BSON.ObjectId;
  name!: string;
  tasks!: Realm.List<Task>;
}

export class Task extends Realm.Object {
  description!: string;
  completed: boolean = false;
  author!: Person;
}

export class Person extends Realm.Object {
  static embedded = true;
  name!: string;
  age!: number;
}

export default function App() {
  return (
    <View style={styles.container}>
      <RealmProvider schema={[Project, Task, Person]} schemaVersion={7}>
        <RealmDebuggerModal />
      </RealmProvider>
    </View>
  );
}
