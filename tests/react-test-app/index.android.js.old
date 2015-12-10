/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
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
    let testNames = RealmTests.getTestNames();

    for (let suiteName in testNames) {
        let testSuite = RealmTests[suiteName];

        console.log('Starting ' + suiteName);

        for (let testName of testNames[suiteName]) {
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
    render() {
        return (
            <View style={styles.container}>
                <Text style={styles.button} onPress={runTests}>
                    Tap to Run Tests
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
    button: {
        borderColor: '#cccccc',
        borderRadius: 4,
        borderWidth: 1,
        fontSize: 20,
        textAlign: 'center',
        margin: 20,
        padding: 10,
    },
    instructions: {
        textAlign: 'center',
        color: '#333333',
        marginBottom: 5,
    },
});

AppRegistry.registerComponent('ReactTests', () => ReactTests);
