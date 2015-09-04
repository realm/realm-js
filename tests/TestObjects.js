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
    {name: 'doubleCol', type: RealmType.Double},
  ]
};

function PersonObject() {}
PersonObject.prototype.schema = {
  name: 'PersonObject',
  properties: [
    {name: 'name', type: RealmType.String},
    {name: 'age',  type: RealmType.Double},
  ]
};
PersonObject.prototype.description = function() {
    return this.name + ' ' + this.age;
};

var BasicTypesObjectSchema = {
    name: 'BasicTypesObject',
    properties: [
        {name: 'boolCol',   type: RealmType.Bool},
        {name: 'intCol',    type: RealmType.Int},
        {name: 'floatCol',  type: RealmType.Float},
        {name: 'doubleCol', type: RealmType.Double},
        {name: 'stringCol', type: RealmType.String},
        {name: 'dateCol',   type: RealmType.Date},
        {name: 'dataCol',   type: RealmType.Data},
    ]
};

var LinkTypesObjectSchema = {
    name: 'LinkTypesObject',
    properties: [
        {name: 'objectCol',  type: 'TestObject'},
        {name: 'objectCol1', type: RealmType.Object, objectType: 'TestObject'},
        {name: 'arrayCol',   type: RealmType.Array, objectType: 'TestObject'},
    ]
};

var IntPrimaryObjectSchema = {
  name: 'IntPrimaryObject',
  primaryKey: 'primaryCol',
  properties: [
    {name: 'primaryCol', type: RealmType.Int},
    {name: 'valueCol',   type: RealmType.String},
  ]
};

var StringPrimaryObjectSchema = {
  name: 'StringPrimaryObject',
  primaryKey: 'primaryCol',
  properties: [
    {name: 'primaryCol', type: RealmType.String},
    {name: 'boolCol',   type: RealmType.Bool},
    {name: 'intCol',    type: RealmType.Int},
    {name: 'floatCol',  type: RealmType.Float},
    {name: 'doubleCol', type: RealmType.Double},
    {name: 'stringCol', type: RealmType.String},
    {name: 'dateCol',   type: RealmType.Date},
    {name: 'dataCol',   type: RealmType.Data},  
  ]
};