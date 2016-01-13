/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

'use strict';

const React = require('react-native');
const Realm = require('realm');
const RealmTests = require('realm-tests');

const {
    AppRegistry,
    NativeAppEventEmitter,
    NativeModules,
    StyleSheet,
    Text,
    TouchableHighlight,
    View,
} = React;

// Listen for event to run a particular test.
NativeAppEventEmitter.addListener('realm-run-test', (test) => {
    let error;
    try {
        RealmTests.runTest(test.suite, test.name);
    } catch (e) {
        error = '' + e;
    }

    NativeModules.Realm.emit('realm-test-finished', error);
});

// Inform the native test harness about the test suite once it's ready.
setTimeout(() => {
    NativeModules.Realm.emit('realm-test-names', RealmTests.getTestNames());
}, 0);

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

class ReactTests extends React.Component {
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
}

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
