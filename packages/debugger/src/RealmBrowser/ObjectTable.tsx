import React from "react";
import Realm from "realm";
import { VirtualizedList, StyleSheet } from "react-native";

import { ObjectRow } from "./ObjectRow";

const styles = StyleSheet.create({
  list: {
    flexGrow: 1,
  },
});

type AnyRealmObject = Realm.Object<any>;

export type ObjectTableProps = {
  objects: Realm.OrderedCollection<AnyRealmObject>;
  onObjectSelected: (object: Realm.Object<any>) => void;
};

export function ObjectTable({ objects, onObjectSelected }: ObjectTableProps) {
  const ObjectList = VirtualizedList<AnyRealmObject>;
  return (
    <ObjectList
      style={styles.list}
      getItemCount={() => objects.length}
      getItem={(_, index) => objects[index]}
      keyExtractor={(item) => item._objectKey()}
      renderItem={({ item }) => (
        <ObjectRow
          object={item}
          onPress={() => {
            onObjectSelected(item);
          }}
        />
      )}
    />
  );
}
