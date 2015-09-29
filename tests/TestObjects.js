////////////////////////////////////////////////////////////////////////////
//
// Copyright 2015 Realm Inc.
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

var TestObjectSchema = {
  name: 'TestObject',
  properties: [
    {name: 'doubleCol', type: Realm.Type.Double},
  ]
};

function PersonObject() {}
PersonObject.prototype.schema = {
  name: 'PersonObject',
  properties: [
    {name: 'name', type: Realm.Type.String},
    {name: 'age',  type: Realm.Type.Double},
  ]
};
PersonObject.prototype.description = function() {
    return this.name + ' ' + this.age;
};

var BasicTypesObjectSchema = {
    name: 'BasicTypesObject',
    properties: [
        {name: 'boolCol',   type: Realm.Type.Bool},
        {name: 'intCol',    type: Realm.Type.Int},
        {name: 'floatCol',  type: Realm.Type.Float},
        {name: 'doubleCol', type: Realm.Type.Double},
        {name: 'stringCol', type: Realm.Type.String},
        {name: 'dateCol',   type: Realm.Type.Date},
        {name: 'dataCol',   type: Realm.Type.Data},
    ]
};

var LinkTypesObjectSchema = {
    name: 'LinkTypesObject',
    properties: [
        {name: 'objectCol',  type: 'TestObject'},
        {name: 'objectCol1', type: Realm.Type.Object, objectType: 'TestObject'},
        {name: 'arrayCol',   type: Realm.Type.Array, objectType: 'TestObject'},
    ]
};

var IntPrimaryObjectSchema = {
  name: 'IntPrimaryObject',
  primaryKey: 'primaryCol',
  properties: [
    {name: 'primaryCol', type: Realm.Type.Int},
    {name: 'valueCol',   type: Realm.Type.String},
  ]
};

var AllTypesObjectSchema = {
  name: 'AllTypesObject',
  primaryKey: 'primaryCol',
  properties: [
    {name: 'primaryCol',type: Realm.Type.String},
    {name: 'boolCol',   type: Realm.Type.Bool},
    {name: 'intCol',    type: Realm.Type.Int},
    {name: 'floatCol',  type: Realm.Type.Float},
    {name: 'doubleCol', type: Realm.Type.Double},
    {name: 'stringCol', type: Realm.Type.String},
    {name: 'dateCol',   type: Realm.Type.Date},
    {name: 'dataCol',   type: Realm.Type.Data}, 
    {name: 'objectCol', type: 'TestObject'},
    {name: 'arrayCol',  type: Realm.Type.Array, objectType: 'TestObject'}, 
  ]
};

var DefaultValuesObjectSchema = {
  name: 'DefaultValuesObject',
  properties: [
    {name: 'boolCol',   type: Realm.Type.Bool,   default: true},
    {name: 'intCol',    type: Realm.Type.Int,    default: -1},
    {name: 'floatCol',  type: Realm.Type.Float,  default: -1.1},
    {name: 'doubleCol', type: Realm.Type.Double, default: -1.11},
    {name: 'stringCol', type: Realm.Type.String, default: 'defaultString'},
    {name: 'dateCol',   type: Realm.Type.Date,   default: new Date(1.111)},
    {name: 'dataCol',   type: Realm.Type.Data,   default: 'defaultData'}, 
    {name: 'objectCol', type: 'TestObject',     default: [1]},
    {name: 'nullObjectCol', type: 'TestObject', default: null},
    {name: 'arrayCol',  type: Realm.Type.Array, objectType: 'TestObject', default: [[2]]}, 
  ]
};

