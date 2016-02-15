/* Copyright 2016 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

'use strict';

const React = require('react-native');
const Realm = require('realm');
const tests = require('./tests');

const {
    AppRegistry,
    StyleSheet,
    Text,
    TouchableHighlight,
    View,
} = React;

class ReactTests extends React.Component {
    render() {
        return (
            <View style={styles.container}>
                <Text style={styles.button} onPress={tests.runTests}>
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
