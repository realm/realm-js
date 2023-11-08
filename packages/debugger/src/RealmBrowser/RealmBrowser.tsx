import React, { useState } from "react";
import { Button, View, StyleSheet } from "react-native";
import { useQuery, useRealm } from "@realm/react";
import { CanonicalObjectSchema } from "realm";

import { ClassSelector } from "./ClassSelector";
import { ObjectTable } from "./ObjectTable";
import { CreateObjectModal } from "./CreateObjectModal";
import { EditObjectModal } from "./EditObjectModal";

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

type ClassTableProps = {
  className: string;
  onObjectSelected: (object: Realm.Object<any>) => void;
};

function ClassTable({ className, onObjectSelected }: ClassTableProps) {
  const objects = useQuery(className, undefined, [className]);
  return <ObjectTable objects={objects} onObjectSelected={onObjectSelected} />;
}

type ClassControlsProps = {
  objectSchema: CanonicalObjectSchema;
};

function ClassControls({ objectSchema }: ClassControlsProps) {
  const [createModalVisible, setCreateModalVisible] = useState(false);
  return (
    <View>
      <CreateObjectModal
        objectSchema={objectSchema}
        visible={createModalVisible}
        onCreate={() => {
          setCreateModalVisible(false);
        }}
        onCancel={() => setCreateModalVisible(false)}
      />
      <Button title={`Create ${objectSchema.name}`} onPress={() => setCreateModalVisible(true)} />
    </View>
  );
}

export function RealmBrowser() {
  const realm = useRealm();
  const [objectSchema, setObjectSchema] = useState<CanonicalObjectSchema | undefined>();
  const [selectedObject, setSelectedObject] = useState<Realm.Object<any> | undefined>();

  return (
    <View style={styles.container}>
      <ClassSelector
        value={objectSchema?.name}
        onChange={(className) => {
          setObjectSchema(realm.schema.find(({ name }) => name === className));
        }}
      />
      {objectSchema ? <ClassTable className={objectSchema.name} onObjectSelected={setSelectedObject} /> : null}
      {objectSchema ? <ClassControls objectSchema={objectSchema} /> : null}
      <EditObjectModal
        object={selectedObject}
        onEdit={() => {
          setSelectedObject(undefined);
        }}
        onCancel={() => {
          setSelectedObject(undefined);
        }}
      />
    </View>
  );
}
