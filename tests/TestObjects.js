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
