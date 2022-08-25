#!/usr/bin/env -S node --loader tsm --no-warnings --

import { MyClass, } from "../../realm/src/binding";


console.log('1+2: ', MyClass.add(1, 2))

console.log('sum(1,2,3): ', MyClass.addAll([1,2,3]))

const obj = MyClass.make({name: "bob", strings: ["hello", "world"]})
console.log('obj.name: ', obj.name)
console.log('obj.config: ', obj.config)

for (const str of obj) {
    console.log({str})
}
