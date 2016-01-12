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
var Realm = require('realm');
var RealmTests = require('realm-tests');

function runTests() {
    let testNames = RealmTests.getTestNames();

    for (let suiteName in testNames) {
        let testSuite = RealmTests[suiteName];

        console.log('Starting ' + suiteName);

        var suiteTestNames = testNames[suiteName];
        for (var index in suiteTestNames) {
            var testName = suiteTestNames[index];
            console.log('Starting ' + testName);

            if (testSuite.beforeEach) {
                testSuite.beforeEach();
            }

            try {
                testSuite[testName]();
                console.log('+ ' + testName);
            }
            catch (e) {
                console.log('- ' + testName);
                console.warn(e.message);
            }
            finally {
                if (testSuite.afterEach) {
                    testSuite.afterEach();
                }
            }
        }
    }
}

var Demo = React.createClass({
  render: function() {
    return (
    <View style={styles.container}>
        <Text style={styles.button} onPress={runTests}>
            Tap to Run Tests
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
