import test from 'ava';

test('can require Realm', t => {
    var realm = require('../../../../realm-js');
    t.is('function', typeof realm);
    t.is('Realm', realm.name);
});