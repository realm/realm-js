#!/usr/bin/env -S node --loader tsm --no-warnings --

import { MyClass, } from "../../realm/src/binding";


console.log(MyClass.add(1, 2))

console.log(MyClass.addAll([1,2,3]))

const obj = MyClass.make({name: "bob", strings: ["hello", "world"]})
console.log(obj.name)
console.log(obj.config)

for (const str of obj) {
    console.log({str})
}
