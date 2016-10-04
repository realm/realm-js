'use strict';

var Realm = require('..');

var filename = "sync.realm";
var syncUrl = "realm://127.0.0.1/nodejs/sync.realm";
var syncUserToken = "eyJpZGVudGl0eSI6Im5vZGVqcy1kZW1vIn0K";

function Foo() {}
Foo.schema = {
    name: 'Foo',
    properties: {
        name: Realm.Types.STRING,
        number: Realm.Types.INT,
    }
};

var realm = new Realm({
    path: filename,
    syncUrl: syncUrl,
    syncUserToken: syncUserToken,
    schema: [Foo]
});

console.log('Starting...');

var prompt = require('prompt');
prompt.start();

var run = true;
var my_prompt = function() {
    prompt.get(['command'], function (err, result) {
        if (err) { return onErr(err); }
        console.log('Command: ' + result.command);
        if (result.command == 'exit') {
            run = false;
        }

        if (run) {
           my_prompt(); 
        }
    });
};

my_prompt();

