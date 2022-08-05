#!/usr/bin/env -S node --loader tsm --no-warnings --

import {Realm, PropertyType, Helpers, DataType, Mixed, StringDataOwnerHack} from "../index"

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
            ]
        }
    ]
});

console.log(util.inspect(realm.schema, false, null, true))

let schema = realm.schema;
let table = Helpers.getTable(realm, schema[0].tableKey)
let numCol = schema[0].persistedProperties[0].columnKey
console.log(numCol)
console.log(table.getColumnType(numCol))
let strCol = schema[0].persistedProperties[1].columnKey
let fltCol = schema[0].persistedProperties[2].columnKey

{
    realm.beginTransaction()
    {
        let obj = table.createObject()
        obj.setAny(numCol, Mixed.fromInt(1234))
        obj.setAny(strCol, Mixed.fromString(StringDataOwnerHack.make('hello')))
        obj.setAny(fltCol, Mixed.fromFloat(0.1234))
    }
    {
        let obj = table.createObject()
        obj.setAny(numCol, Mixed.fromInt(9876))
        obj.setAny(strCol, Mixed.fromString(StringDataOwnerHack.make('world')))
    }
    realm.commitTransaction()
}

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
}


realm.close()
