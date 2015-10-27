/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

'use strict';

var Realm = require('realm');

exports.TestObject = {
  name: 'TestObject',
  properties: [
    {name: 'doubleCol', type: Realm.Types.DOUBLE},
  ]
};

function PersonObject() {}
PersonObject.prototype.schema = {
  name: 'PersonObject',
  properties: [
    {name: 'name', type: Realm.Types.STRING},
    {name: 'age',  type: Realm.Types.DOUBLE},
  ]
};
PersonObject.prototype.description = function() {
    return this.name + ' ' + this.age;
};
exports.PersonObject = PersonObject;

exports.BasicTypes = {
    name: 'BasicTypesObject',
    properties: [
        {name: 'boolCol',   type: Realm.Types.BOOL},
        {name: 'intCol',    type: Realm.Types.INT},
        {name: 'floatCol',  type: Realm.Types.FLOAT},
        {name: 'doubleCol', type: Realm.Types.DOUBLE},
        {name: 'stringCol', type: Realm.Types.STRING},
        {name: 'dateCol',   type: Realm.Types.DATE},
        {name: 'dataCol',   type: Realm.Types.DATA},
    ]
};

exports.NullableBasicTypes = {
    name: 'NullableBasicTypesObject',
    properties: [
        {name: 'boolCol',   type: Realm.Types.BOOL,   optional: true},
        {name: 'intCol',    type: Realm.Types.INT,    optional: true},
        {name: 'floatCol',  type: Realm.Types.FLOAT,  optional: true},
        {name: 'doubleCol', type: Realm.Types.DOUBLE, optional: true},
        {name: 'stringCol', type: Realm.Types.STRING, optional: true},
        {name: 'dateCol',   type: Realm.Types.DATE,   optional: true},
        {name: 'dataCol',   type: Realm.Types.DATA,   optional: true},
    ]
};

exports.LinkTypes = {
    name: 'LinkTypesObject',
    properties: [
        {name: 'objectCol',  type: 'TestObject'},
        {name: 'objectCol1', type: Realm.Types.OBJECT, objectType: 'TestObject'},
        {name: 'arrayCol',   type: Realm.Types.LIST, objectType: 'TestObject'},
    ]
};

exports.IntPrimary = {
  name: 'IntPrimaryObject',
  primaryKey: 'primaryCol',
  properties: [
    {name: 'primaryCol', type: Realm.Types.INT},
    {name: 'valueCol',   type: Realm.Types.STRING},
  ]
};

exports.AllTypes = {
  name: 'AllTypesObject',
  primaryKey: 'primaryCol',
  properties: [
    {name: 'primaryCol',type: Realm.Types.STRING},
    {name: 'boolCol',   type: Realm.Types.BOOL},
    {name: 'intCol',    type: Realm.Types.INT},
    {name: 'floatCol',  type: Realm.Types.FLOAT},
    {name: 'doubleCol', type: Realm.Types.DOUBLE},
    {name: 'stringCol', type: Realm.Types.STRING},
    {name: 'dateCol',   type: Realm.Types.DATE},
    {name: 'dataCol',   type: Realm.Types.DATA}, 
    {name: 'objectCol', type: 'TestObject'},
    {name: 'arrayCol',  type: Realm.Types.LIST, objectType: 'TestObject'},
  ]
};

exports.DefaultValues = {
  name: 'DefaultValuesObject',
  properties: [
    {name: 'boolCol',   type: Realm.Types.BOOL,   default: true},
    {name: 'intCol',    type: Realm.Types.INT,    default: -1},
    {name: 'floatCol',  type: Realm.Types.FLOAT,  default: -1.1},
    {name: 'doubleCol', type: Realm.Types.DOUBLE, default: -1.11},
    {name: 'stringCol', type: Realm.Types.STRING, default: 'defaultString'},
    {name: 'dateCol',   type: Realm.Types.DATE,   default: new Date(1.111)},
    {name: 'dataCol',   type: Realm.Types.DATA,   default: 'defaultData'}, 
    {name: 'objectCol', type: 'TestObject',     default: [1]},
    {name: 'nullObjectCol', type: 'TestObject', default: null},
    {name: 'arrayCol',  type: Realm.Types.LIST, objectType: 'TestObject', default: [[2]]},
  ]
};
