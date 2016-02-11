/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 */
'use strict';
var React = require('react-native');
var {
  AppRegistry,
  StyleSheet,
  Image,
  Text,
  View,
  TouchableNativeFeedback,
} = React;

var RealmReactAndroid = require('NativeModules').RealmReactAndroid;
var Realm = require('realm');
var RealmTests = require('realm-tests');
var builder = require('xmlbuilder');
var RNFS = require('react-native-fs');

function runTests() {
    var rootXml = builder.create('testsuites');
    let testNames = RealmTests.getTestNames();

    for (let suiteName in testNames) {
        var itemTestsuite = rootXml.ele('testsuite');
        let nbrTests = 0;
        let nbrFailures = 0;

        let testSuite = RealmTests[suiteName];

        console.log('Starting suite ' + suiteName);

        var suiteTestNames = testNames[suiteName];
        for (var index in suiteTestNames) {
            nbrTests++;
            var testName = suiteTestNames[index];

            var itemTest = itemTestsuite.ele('testcase');
            itemTest.att('name', testName);

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

                itemTest.ele('error', {'message': ''}, e.message);
                nbrFailures++;
            }
            finally {
                if (testSuite.afterEach) {
                    testSuite.afterEach();
                }
            }
        }

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
