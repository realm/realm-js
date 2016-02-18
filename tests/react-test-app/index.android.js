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
const RealmTests = require('realm-tests');
const builder = require('xmlbuilder');
const RNFS = require('react-native-fs');

const {
    AppRegistry,
    StyleSheet,
    Image,
    Text,
    View,
    TouchableNativeFeedback,
} = React;

RealmTests.registerTests({
    ListViewTest: require('./tests/listview-test'),
});

function runTests() {
    let rootXml = builder.create('testsuites');
    let testNames = RealmTests.getTestNames();

    for (let suiteName in testNames) {
        let itemTestsuite = rootXml.ele('testsuite');
        let nbrTests = 0;
        let nbrFailures = 0;

        console.log('Starting suite ' + suiteName);

        testNames[suiteName].forEach((testName) => {
            nbrTests++;

            let itemTest = itemTestsuite.ele('testcase');
            itemTest.att('name', testName);

            console.log('Starting ' + testName);
            RealmTests.runTest(suiteName, 'beforeEach');

            try {
                RealmTests.runTest(suiteName, testName);
                console.log('+ ' + testName);
            }
            catch (e) {
                console.log('- ' + testName);
                console.warn(e.message);

                itemTest.ele('error', {'message': ''}, e.message);
                nbrFailures++;
            }
            finally {
                RealmTests.runTest(suiteName, 'afterEach');
            }
        });

        // update Junit XML report
        itemTestsuite.att('name', suiteName);
        itemTestsuite.att('tests', nbrTests);
        itemTestsuite.att('failures', nbrFailures);
        itemTestsuite.att('timestamp', "2016-01-22T14:40:44.874443-05:00");//TODO use real timestamp

    }
    // export unit tests results
    var xmlString = rootXml.end({ pretty: true, indent: '  ', newline: '\n' });
    var path = '/sdcard/tests.xml';

    // write the unit tests reports
    RNFS.writeFile(path, xmlString , 'utf8')
      .then((success) => {
        console.log('__REALM_REACT_ANDROID_TESTS_COMPLETED__');
      })
      .catch((err) => {
        console.log(err.message);
      });

}

class ReactTests extends React.Component {
  render() {
    return (
      <View style={styles.container}>
          <Text style={styles.button} onPress={runTests}>
              Running Tests...
          </Text>

          <Image
            style={styles.icon}
            source={require('image!ic_launcher')}
            onLoad={() => runTests()}
          />
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
