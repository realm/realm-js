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

var Realm = require('realm');

exports.TestObject = {
    name: 'TestObject',
    properties: {
        doubleCol: Realm.Types.DOUBLE,
    }
};

function PersonObject() {}
PersonObject.schema = {
    name: 'PersonObject',
    properties: {
        name:    Realm.Types.STRING,
        age:     Realm.Types.DOUBLE,
        married: {type: Realm.Types.BOOL, default: false}, 
    }
};
PersonObject.prototype.description = function() {
    return this.name + ' ' + this.age;
};
PersonObject.prototype.toString = function() {
    return this.name;
};
exports.PersonObject = PersonObject;

exports.PersonList = {
    name: 'PersonList',
    properties: {
        list: {type: 'list', objectType: 'PersonObject'},
    }
};

exports.BasicTypes = {
    name: 'BasicTypesObject',
    properties: {
        boolCol:   Realm.Types.BOOL,
        intCol:    Realm.Types.INT,
        floatCol:  Realm.Types.FLOAT,
        doubleCol: Realm.Types.DOUBLE,
        stringCol: Realm.Types.STRING,
        dateCol:   Realm.Types.DATE,
        dataCol:   Realm.Types.DATA,
    }
};

exports.NullableBasicTypes = {
    name: 'NullableBasicTypesObject',
    properties: {
        boolCol:   {type: Realm.Types.BOOL,   optional: true},
        intCol:    {type: Realm.Types.INT,    optional: true},
        floatCol:  {type: Realm.Types.FLOAT,  optional: true},
        doubleCol: {type: Realm.Types.DOUBLE, optional: true},
        stringCol: {type: Realm.Types.STRING, optional: true},
        dateCol:   {type: Realm.Types.DATE,   optional: true},
        dataCol:   {type: Realm.Types.DATA,   optional: true},
    }
};

exports.IndexedTypes = {
    name: 'IndexedTypesObject',
    properties: {
        boolCol:   {type: 'bool', indexed: true},
        intCol:    {type: 'int', indexed: true},
        stringCol: {type: 'string', indexed: true},
        dateCol:   {type: 'date', indexed: true},
    }
};


exports.LinkTypes = {
    name: 'LinkTypesObject',
    properties: {
        objectCol: 'TestObject',
        objectCol1: {type: Realm.Types.OBJECT, objectType: 'TestObject'},
        arrayCol:   {type: Realm.Types.LIST,   objectType: 'TestObject'},
    }
};

exports.IntPrimary = {
    name: 'IntPrimaryObject',
    primaryKey: 'primaryCol',
    properties: {
        primaryCol: Realm.Types.INT,
        valueCol:   Realm.Types.STRING,
    }
};

exports.AllTypes = {
    name: 'AllTypesObject',
    primaryKey: 'primaryCol',
    properties: {
        primaryCol: Realm.Types.STRING,
        boolCol:    Realm.Types.BOOL,
        intCol:     Realm.Types.INT,
        floatCol:   Realm.Types.FLOAT,
        doubleCol:  Realm.Types.DOUBLE,
        stringCol:  Realm.Types.STRING,
        dateCol:    Realm.Types.DATE,
        dataCol:    Realm.Types.DATA,
        objectCol:  'TestObject',
        arrayCol:   {type: Realm.Types.LIST, objectType: 'TestObject'},
    }
};

exports.DefaultValues = {
    name: 'DefaultValuesObject',
    properties: {
        boolCol:       {type: Realm.Types.BOOL,   default: true},
        intCol:        {type: Realm.Types.INT,    default: -1},
        floatCol:      {type: Realm.Types.FLOAT,  default: -1.1},
        doubleCol:     {type: Realm.Types.DOUBLE, default: -1.11},
        stringCol:     {type: Realm.Types.STRING, default: 'defaultString'},
        dateCol:       {type: Realm.Types.DATE,   default: new Date(1.111)},
        dataCol:       {type: Realm.Types.DATA,   default: new ArrayBuffer(1)},
        objectCol:     {type: 'TestObject',       default: {doubleCol: 1}},
        nullObjectCol: {type: 'TestObject',       default: null},
        arrayCol:      {type: Realm.Types.LIST, objectType: 'TestObject', default: [{doubleCol: 2}]},
    }
};

exports.QueryObject = {
    name: 'QueryObject',
    properties: [
        {name: 'bool1',   type: Realm.Types.BOOL},
        {name: 'bool2',   type: Realm.Types.BOOL},
        {name: 'int1',    type: Realm.Types.INT},
        {name: 'int2',    type: Realm.Types.INT},
        {name: 'float1',  type: Realm.Types.FLOAT},
        {name: 'float2',  type: Realm.Types.FLOAT},
        {name: 'double1', type: Realm.Types.DOUBLE},
        {name: 'double2', type: Realm.Types.DOUBLE},
        {name: 'string1', type: Realm.Types.STRING},
        {name: 'string2', type: Realm.Types.STRING},
    ]
};

exports.NullQueryObject = {
    name: 'NullQueryObject',
    properties: [
        {name: 'bool1',   type: Realm.Types.BOOL},
        {name: 'bool2',   type: Realm.Types.BOOL},
        {name: 'int1',    type: Realm.Types.INT},
        {name: 'int2',    type: Realm.Types.INT},
        {name: 'float1',  type: Realm.Types.FLOAT},
        {name: 'float2',  type: Realm.Types.FLOAT},
        {name: 'double1', type: Realm.Types.DOUBLE},
        {name: 'double2', type: Realm.Types.DOUBLE},
        {name: 'string1', type: Realm.Types.STRING},
        {name: 'string2', type: Realm.Types.STRING},
    ]
};
