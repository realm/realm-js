/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 */
'use strict';

var React = require('react-native');
var {
  AppRegistry,
  StyleSheet,
  Text,
  View,
  TouchableNativeFeedback,
} = React;

var RealmReactAndroid = require('NativeModules').RealmReactAndroid;
//var Realm = require('realm');
//var RealmTests = require('realm-tests');

var Demo = React.createClass({
  render: function() {
    return (
    <View style={styles.container}>
      <Text style={styles.welcome}>
        Trying to inject Realm JS Context
      </Text>
    </View>    
    );
  }
});   

var styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
});

AppRegistry.registerComponent('Demo', () => Demo);
