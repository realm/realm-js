import React, {useCallback, useState} from 'react';
import {View, Text, StyleSheet, TextInput, Pressable} from 'react-native';
import colors from '../styles/colors';
import {shadows} from '../styles/shadows';
import {buttonStyles} from '../styles/button';

export let AuthState;

(function (AuthState) {
  AuthState[(AuthState['None'] = 0)] = 'None';
  AuthState[(AuthState['Loading'] = 1)] = 'Loading';
  AuthState[(AuthState['LoginError'] = 2)] = 'LoginError';
  AuthState[(AuthState['RegisterError'] = 3)] = 'RegisterError';
})(AuthState || (AuthState = {}));

export const LoginScreen = ({onLogin, onRegister, authState}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = useCallback(() => {
    onLogin(email, password);
  }, [onLogin, email, password]);

  const handleRegister = useCallback(() => {
    onRegister(email, password);
  }, [onRegister, email, password]);

  return (
    <View style={styles.content}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCompleteType="email"
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
          autoCompleteType="password"
          textContentType="password"
          placeholder="Password"
        />
      </View>

      {authState === AuthState.LoginError && (
        <Text style={[styles.error]}>
          There was an error logging in, please try again
        </Text>
      )}
      {authState === AuthState.RegisterError && (
        <Text style={[styles.error]}>
          There was an error registering, please try again
        </Text>
      )}

      <View style={styles.buttons}>
        <Pressable
          onPress={handleLogin}
          style={[
            styles.button,
            authState === AuthState.Loading && styles.buttonDisabled,
          ]}
          disabled={authState === AuthState.Loading}>
          <Text style={buttonStyles.text}>Login</Text>
        </Pressable>

        <Pressable
          onPress={handleRegister}
          style={[
            styles.button,
            authState === AuthState.Loading && styles.buttonDisabled,
            styles.registerButton,
          ]}
          disabled={authState === AuthState.Loading}>
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
