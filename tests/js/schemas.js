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

const Realm = require('realm');

exports.TestObject = {
    name: 'TestObject',
    properties: {
        doubleCol: 'double',
    }
};

function PersonObject() {}
PersonObject.schema = {
    name: 'PersonObject',
    properties: {
        name:     'string',
        age:      'double',
        married:  {type: 'bool', default: false}, 
        children: {type: 'list', objectType: 'PersonObject'},
        parents:  {type: 'linkingObjects', objectType: 'PersonObject', property: 'children'},
    }
};
PersonObject.prototype.description = function() {
    return this.name + ' ' + this.age;
};
PersonObject.prototype.toString = function() {
    return this.name;
};
Object.setPrototypeOf(PersonObject, Realm.Object);
Object.setPrototypeOf(PersonObject.prototype, Realm.Object.prototype);
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
        boolCol:   'bool',
        intCol:    'int',
        floatCol:  'float',
        doubleCol: 'double',
        stringCol: 'string',
        dateCol:   'date',
        dataCol:   'data',
    }
};

exports.NullableBasicTypes = {
    name: 'NullableBasicTypesObject',
    properties: {
        boolCol:   {type: 'bool',   optional: true},
        intCol:    {type: 'int',    optional: true},
        floatCol:  {type: 'float',  optional: true},
        doubleCol: {type: 'double', optional: true},
        stringCol: {type: 'string', optional: true},
        dateCol:   {type: 'date',   optional: true},
        dataCol:   {type: 'data',   optional: true},
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
        objectCol1: {type: 'object', objectType: 'TestObject'},
        arrayCol:   {type: 'list',   objectType: 'TestObject'},
    }
};

exports.IntPrimary = {
    name: 'IntPrimaryObject',
    primaryKey: 'primaryCol',
    properties: {
        primaryCol: 'int',
        valueCol:   'string',
    }
};

exports.StringPrimary = {
    name: 'StringPrimaryObject',
    primaryKey: 'primaryCol',
    properties: {
        primaryCol: 'string',
        valueCol:   'int',
    }
};

exports.AllTypes = {
    name: 'AllTypesObject',
    primaryKey: 'primaryCol',
    properties: {
        primaryCol:        'string',
        boolCol:           'bool',
        intCol:            'int',
        floatCol:          'float',
        doubleCol:         'double',
        stringCol:         'string',
        dateCol:           'date',
        dataCol:           'data',
        objectCol:         'TestObject',
        arrayCol:          {type: 'list', objectType: 'TestObject'},
        linkingObjectsCol: {type: 'linkingObjects', objectType: 'LinkToAllTypesObject', property: 'allTypesCol'},
    }
};

exports.LinkToAllTypes = {
    name: 'LinkToAllTypesObject',
    properties: {
        allTypesCol: 'AllTypesObject',
    }
}

exports.DefaultValues = {
    name: 'DefaultValuesObject',
    properties: {
        boolCol:       {type: 'bool',             default: true},
        intCol:        {type: 'int',              default: -1},
        floatCol:      {type: 'float',            default: -1.1},
        doubleCol:     {type: 'double',           default: -1.11},
        stringCol:     {type: 'string',           default: 'defaultString'},
        dateCol:       {type: 'date',             default: new Date(1.111)},
        dataCol:       {type: 'data',             default: new ArrayBuffer(1)},
        objectCol:     {type: 'TestObject',       default: {doubleCol: 1}},
        nullObjectCol: {type: 'TestObject',       default: null},
        arrayCol:      {type: 'list', objectType: 'TestObject', default: [{doubleCol: 2}]},
    }
};

exports.QueryObject = {
    name: 'QueryObject',
    properties: [
        {name: 'bool1',   type: 'bool'},
        {name: 'bool2',   type: 'bool'},
        {name: 'int1',    type: 'int'},
        {name: 'int2',    type: 'int'},
        {name: 'float1',  type: 'float'},
        {name: 'float2',  type: 'float'},
        {name: 'double1', type: 'double'},
        {name: 'double2', type: 'double'},
        {name: 'string1', type: 'string'},
        {name: 'string2', type: 'string'},
    ]
};

exports.NullQueryObject = {
    name: 'NullQueryObject',
    properties: [
        {name: 'bool1',   type: 'bool'},
        {name: 'bool2',   type: 'bool'},
        {name: 'int1',    type: 'int'},
        {name: 'int2',    type: 'int'},
        {name: 'float1',  type: 'float'},
        {name: 'float2',  type: 'float'},
        {name: 'double1', type: 'double'},
        {name: 'double2', type: 'double'},
        {name: 'string1', type: 'string'},
        {name: 'string2', type: 'string'},
    ]
};

exports.DateObject = {
    name: 'Date',
    properties: {
        currentDate: 'date',
        nullDate: { type: 'date', optional: true }
    }
};

exports.LinkingObjectsObject = {
    name: 'LinkingObjectsObject',
    properties: {
        value:          'int',
        links:          {type: 'list', objectType: 'LinkingObjectsObject'},
        linkingObjects: {type: 'linkingObjects', objectType: 'LinkingObjectsObject', property: 'links'}
    }
}
