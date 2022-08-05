#!/usr/bin/env -S node --loader tsm --no-warnings --

import {Realm, PropertyType, Helpers, Mixed, StringDataOwnerHack} from "../index"

import {strict as assert} from 'assert'
import * as util from "util"

let realm = Realm.getSharedRealm({
    path: "/tmp/realm2.realm",
    inMemory: true,
    schemaVersion: 1n,
    schema: [
        {
            name: "Foo",
            persistedProperties: [
                { name: "num", type: PropertyType.Int },
                { name: "str", type: PropertyType.String },
                { name: "maybeFloat", type: PropertyType.Float | PropertyType.Nullable },
                { name: "link", type: PropertyType.Object | PropertyType.Nullable, objectType: "Foo" },
            ]
        }
    ]
});

// console.log(util.inspect(realm.schema, false, null, true))

let schema = realm.schema;
let table = Helpers.getTable(realm, schema[0].tableKey)
let numCol = schema[0].persistedProperties[0].columnKey
let strCol = schema[0].persistedProperties[1].columnKey
let fltCol = schema[0].persistedProperties[2].columnKey
let lnkCol = schema[0].persistedProperties[3].columnKey

console.log(numCol)
console.log(table.getColumnType(numCol))

realm.beginTransaction()

let obj1 = table.createObject()
obj1.setAny(numCol, Mixed.fromInt(1234))
obj1.setAny(strCol, Mixed.fromString(StringDataOwnerHack.make('hello')))
obj1.setAny(fltCol, Mixed.fromFloat(0.1234))

let obj2 = table.createObject()
obj2.setAny(numCol, Mixed.fromInt(9876))
obj2.setAny(strCol, Mixed.fromString(StringDataOwnerHack.make('world')))

let obj3 = table.createObject()
obj3.setAny(lnkCol, Mixed.fromObj(obj2))

realm.commitTransaction()

for (let obj of table) {
    console.log('---');
    console.log(obj.toString());
    console.log(obj.getKey())

    console.log(obj.getAny(numCol))
    console.log(obj.getAnyByName("num").getInt())

    console.log(obj.getAny(strCol))
    console.log(obj.getAny(strCol).toJsValue())

    console.log(obj.isNull(fltCol))
    console.log(obj.getAny(fltCol))
    console.log(obj.getAny(fltCol).toJsValue())
    if (!obj.isNull(fltCol))
        console.log(obj.getAny(fltCol).getFloat())

    if (!obj.isNull(lnkCol)) {
        let dest = obj.getLinkedObject(lnkCol)
        assert.deepEqual(dest.getKey(), obj2.getKey())
        console.log(dest.getKey())
        console.log(dest.getAnyByName('str'))
    }
}

realm.close()
