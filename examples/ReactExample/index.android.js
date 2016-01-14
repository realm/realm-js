/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

'use strict';

var RealmReactAndroid = require('NativeModules').RealmReactAndroid;
var Realm = require('realm');

const React = require('react-native');
const TodoApp = require('./components/todo-app');

React.AppRegistry.registerComponent('ReactExample', () => TodoApp);
