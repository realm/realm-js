/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 */
'use strict';

var React = require('react-native');
var Realm = require('realm');
var RealmTests = require('realm-tests');

var {
  AppRegistry,
  StyleSheet,
  Text,
  View,
} = React;

function runTests() {
    let specialMethodNames = {'beforeEach': true, 'afterEach': true};

    for (let suiteName in RealmTests) {
        let testSuite = RealmTests[suiteName];

        console.log('Starting suite:', suiteName);

        for (let testName in testSuite) {
            if (testName in specialMethodNames || typeof testSuite[testName] != 'function') {
                continue;
            }

            if (testSuite.beforeEach) {
                testSuite.beforeEach();
            }

            try {
                testSuite[testName]();
                console.log('+ ' + testName);
            }
            catch (e) {
                console.log('- ' + testName);
                console.warn(e);
            }
            finally {
                if (testSuite.afterEach) {
                    testSuite.afterEach();
                }
            }
        }
    }
}

var ReactTests = React.createClass({
    componentDidMount() {
        runTests();
    },

    render() {
        return (
            <View style={styles.container}>
                <Text style={styles.welcome}>
                    Welcome to React Native!
                </Text>
                <Text style={styles.instructions}>
                    To get started, edit index.ios.js
                </Text>
                <Text style={styles.instructions}>
                    Press Cmd+R to reload,{'\n'}
                    Cmd+D or shake for dev menu
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

AppRegistry.registerComponent('ReactTests', () => ReactTests);
