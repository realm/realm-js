/**
 * @format
 */

import 'react-native-get-random-values';
import {AppRegistry} from 'react-native';
import App from './app/AppWrapper';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
