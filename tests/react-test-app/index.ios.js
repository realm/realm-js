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

import {
    AppRegistry,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import React from 'react';


//FIX: Remove this when test app is upgraded to RN >= 0.60:
//RN version < 0.60 does not have an AbortController implementation. Define an empty one so require('realm') does not throw 
//////////////
if (global && global.window) {
    global.window.AbortController = { 
        signal: {},
        abort : () => {}
    }
}
const runTests = require('./tests');
// import { runTests } from './tests';
////////////

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

const styles = StyleSheet.create({
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
