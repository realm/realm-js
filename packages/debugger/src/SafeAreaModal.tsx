import React, { PropsWithChildren } from "react";
import { Modal, SafeAreaView, View, StyleSheet } from "react-native";

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    margin: 10,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#00000005",
  },
  container: {
    margin: 20,
    flex: 1,
    shadowRadius: 10,
    shadowColor: "black",
    shadowOpacity: 0.33,
    backgroundColor: "white",
    borderColor: "#202020",
    borderWidth: 0.5,
    borderRadius: 10,
    padding: 10,
  },
});

export type SafeAreaModalProps = PropsWithChildren<{ visible: boolean }>;

export function SafeAreaModal({ children, visible }: SafeAreaModalProps) {
  return (
    <Modal style={styles.modal} visible={visible} transparent={true}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>{children}</View>
      </SafeAreaView>
    </Modal>
  );
}
