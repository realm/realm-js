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

var Demo = React.createClass({
  buttonClicked: function() {
    RealmReactAndroid.show("Hello Zepp");
  },
  render: function() {
    return (
    <View style={styles.container}>
      <Text style={styles.welcome}>
        Calling JNI String from Javascript.
      </Text>
      <TouchableNativeFeedback
        style={styles.button}
        onPress={this.buttonClicked.bind(this)}>
        <View style={{backgroundColor: 'red'}}>
          <Text style={{margin: 5}}>Click Me :)</Text>
        </View>
      </TouchableNativeFeedback>        
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
