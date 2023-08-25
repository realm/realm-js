import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, TextInput, Pressable} from 'react-native';
import colors from '../styles/colors';
import {shadows} from '../styles/shadows';
import {buttonStyles} from '../styles/button';
import {AuthOperationName, useAuth, useEmailPasswordAuth} from '@realm/react';

export const LoginScreen = () => {
  const {result, logInWithEmailPassword} = useAuth();
  const {register} = useEmailPasswordAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Automatically log in after registration
  useEffect(() => {
    if (result.success && result.operation === AuthOperationName.Register) {
      logInWithEmailPassword({email, password});
    }
  }, [result, logInWithEmailPassword, email, password]);

  return (
    <View style={styles.content}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoComplete="email"
          textContentType="emailAddress"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Email"
        />
      </View>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          textContentType="password"
          placeholder="Password"
        />
      </View>

      {result?.error?.operation === AuthOperationName.LogInWithEmailPassword && (
        <Text style={[styles.error]}>
          There was an error logging in, please try again{' '}
        </Text>
      )}

      {result?.error?.operation === AuthOperationName.Register && (
        <Text style={[styles.error]}>
          There was an error registering, please try again
        </Text>
      )}

      <View style={styles.buttons}>
        <Pressable
          onPress={() => logInWithEmailPassword({email, password})}
          style={[styles.button, result.pending && styles.buttonDisabled]}
          disabled={result.pending}>
          <Text style={buttonStyles.text}>Login</Text>
        </Pressable>

        <Pressable
          onPress={() => register({email, password})}
          style={[
            styles.button,
            result.pending && styles.buttonDisabled,
            styles.registerButton,
          ]}
          disabled={result.pending}>
          <Text style={buttonStyles.text}>Register</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.darkBlue,
  },

  inputContainer: {
    padding: 10,
    alignSelf: 'stretch',
    marginHorizontal: 10,
  },

  error: {
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 10,
    fontSize: 14,
    color: colors.white,
  },

  input: {
    borderWidth: 1,
    borderColor: colors.gray,
    padding: 10,
    height: 50,
    marginVertical: 8,
    backgroundColor: colors.white,
    borderRadius: 5,
    ...shadows,
  },

  buttons: {
    marginTop: 16,
    flexDirection: 'row',
  },

  button: {
    ...buttonStyles.button,
    ...shadows,
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  registerButton: {
    backgroundColor: colors.purpleDark,
  },
});
