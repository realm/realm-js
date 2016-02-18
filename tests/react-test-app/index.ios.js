////////////////////////////////////////////////////////////////////////////
//
// Copyright 2016 Realm Inc.
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
