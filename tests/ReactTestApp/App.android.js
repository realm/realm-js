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

import {AppRegistry, StyleSheet, Image, Text, View} from 'react-native';

import builder from 'xmlbuilder';
import React from 'react';
import RNExitApp from 'react-native-exit-app';
import RNFS from 'react-native-fs';

const tests = require('./tests');
const getTestNames = tests.getTestNames;
const runTest = tests.runTest;

//split a string into multiple strings limited to a max length
function split(str) {
  const splits = [];
  const splitSize = 250;
  for (let i = 0, len = str.length; i < len; i += splitSize) {
    splits.push(str.substring(i, i + splitSize));
  }
  return splits;
}

async function runTests() {
  let testNames = getTestNames();
  let rootXml = builder.create('testsuites');
  let failingTests = [];
  for (let suiteName in testNames) {
    let itemTestsuite = rootXml.ele('testsuite');
    let nbrTests = 0;
    let nbrFailures = 0;

    console.log('Starting ' + suiteName);

    for (let testName of testNames[suiteName]) {
      nbrTests++;

      let itemTest = itemTestsuite.ele('testcase');
      itemTest.att('name', testName);

      try {
        await runTest(suiteName, testName);
      } catch (e) {
        failingTests.push(`${suiteName}: ${testName} : Error ${e.message}`);
        itemTest.ele(
          'error',
          {message: e.message, stacktrace: e.stack},
          e.toString(),
        );
        nbrFailures++;
      }
    }

    // update Junit XML report
    itemTestsuite.att('name', suiteName);
    itemTestsuite.att('tests', nbrTests);
    itemTestsuite.att('failures', nbrFailures);
    itemTestsuite.att('timestamp', '2016-01-22T14:40:44.874443-05:00'); //TODO use real timestamp
  }
  // export unit tests results
  let xmlString = rootXml.end({
    pretty: true,
    indent: '  ',
    newline: '\n',
  });

  // write the unit tests reports
  try {
    const resultsFile = RNFS.DocumentDirectoryPath + '/tests.xml';
    await RNFS.writeFile(resultsFile, xmlString, 'utf8');
    console.log(`Test results file path ${resultsFile}`);
    console.log('Test Results ==============================================');
    const lines = xmlString.split(/\r?\n/);
    // console.log has max string limits so write each line one by one
    lines.forEach(line => split(line).forEach(str => console.log(str)));
  } catch (e) {
    console.error(e);
  } finally {
    if (failingTests.length !== 0) {
      console.log('__REALM_JS_TESTS_FAILED__');
      console.error('\n\nREALM_FAILING_TESTS\n');
      console.error(failingTests);
    } else {
      console.log('__REALM_JS_TESTS_SUCCEEDED__');
    }

    console.log(
      'Realm Tests App finished. Exiting. Disable this to debug the app locally',
    );
    RNExitApp.exitApp();
  }
}

export default class ReactTests extends React.Component {
  render() {
    runTests();
    return (
      <View style={styles.container}>
        <Text style={styles.button} onPress={runTests}>
          Click To Run Tests Again.
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

//AppRegistry.registerComponent('ReactTests', () => ReactTests);
