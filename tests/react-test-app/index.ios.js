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
    Alert,
    AppRegistry,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import builder from 'xmlbuilder';
import React from 'react';
import { getTestNames, runTest } from './tests';
import RNFS from 'react-native-fs';
import RNExitApp from 'react-native-exit-app-no-history';

// import {setJSExceptionHandler} from 'react-native-exception-handler';
// import {setNativeExceptionHandler} from 'react-native-exception-handler/index';

// setNativeExceptionHandler((exceptionString) => {
//     console.error("\nRealm Tests App FAILED. NATIVE ERROR\n");
//     console.error(`\n${exceptionString}\n`);
//     RNExitApp.exitApp();
//   });

// //unhandled JS exceptions handler
// setJSExceptionHandler((error, isFatal) => {
//     console.error("\nRealm Tests App FAILED. JS ERROR\n");
//     console.error(`\n${error}\n`);
//     RNExitApp.exitApp();
// });




async function runTests() {
    try {
        let testNames = getTestNames();
        let rootXml = builder.create('testsuites');
        let failingTests = [];
        for (let suiteName in testNames) {
            let itemTestsuite = rootXml.ele('testsuite');
            let nbrTests = 0;
            let nbrFailures = 0;

            console.error('Starting ' + suiteName);

            for (let testName of testNames[suiteName]) {
                nbrTests++;

                let itemTest = itemTestsuite.ele('testcase');
                itemTest.att('name', testName);

                try {
                    await runTest(suiteName, testName);
                }
                catch (e) {
                    failingTests.push(`${suiteName}: ${testName} : Error ${e.message}`);
                    itemTest.ele('error', {'message': e.message, 'stacktrace': e.stack}, e.toString());
                    nbrFailures++;
                }
            }

            // update Junit XML report
            itemTestsuite.att('name', suiteName);
            itemTestsuite.att('tests', nbrTests);
            itemTestsuite.att('failures', nbrFailures);
            itemTestsuite.att('timestamp', "2016-01-22T14:40:44.874443-05:00");//TODO use real timestamp

        }
        // export unit tests results
        let xmlString = rootXml.end({
            pretty: true,
            indent: '  ',
            newline: '\n',
        });

        // write the unit tests reports
        const path =  RNFS.MainBundlePath + "/tests.xml";
        await RNFS.writeFile(path, xmlString, 'utf8');
        
        //using console.log output is not shown in Release builds. using console.warn
        console.warn(xmlString);
        console.warn('__REALM_JS_TESTS_COMPLETED__');
        if (failingTests.length !== 0) {
            console.error('\n\nREALM_FAILING_TESTS\n');
            console.error(failingTests);
        } 
    }
    catch (e) {
        console.error(e);
    }
    finally {
        console.warn("Realm Tests App finished. Exiting. Disable this to debug the app locally");
        RNExitApp.exitApp();
    }
}

class ReactTests extends React.Component {
    render() {
        runTests();
        return (
            <View style={styles.container}>
                <Text style={styles.instructions}>
                    {'\n'}REALM-JS TESTS{'\n'}

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
