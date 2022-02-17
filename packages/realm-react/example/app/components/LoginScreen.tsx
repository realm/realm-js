////////////////////////////////////////////////////////////////////////////
//
// Copyright 2022 Realm Inc.
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
import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, Button } from "react-native";
import colors from "../styles/colors";

interface LoginScreenProps {
  onLogin: (email: string, password: string) => void;
  onRegister: (email: string, password: string) => void;
  loginError: boolean;
}

export default function LoginScreen(props: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <View style={styles.content}>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCompleteType="email"
          textContentType="emailAddress"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCompleteType="password"
          textContentType="password"
        />
      </View>

      {props.loginError && <Text style={styles.error}>There was an error logging in, please try again</Text>}

      <Button title="Login" onPress={() => props.onLogin(email, password)} />
      <Button title="Register" onPress={() => props.onRegister(email, password)} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  inputContainer: {
    padding: 10,
  },

  label: { textAlign: "center", marginBottom: 10 },

  error: { textAlign: "center", margin: 10, color: "#f00" },

  input: { borderWidth: 1, borderColor: colors.gray, padding: 10, width: 250 },
});
