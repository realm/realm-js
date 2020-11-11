'use strict';

const isNodeProcess = (typeof process === 'object' && process + '' === '[object process]');

const fs = require('fs');
const path = require('path');

const mockery = require('mockery');

function mockRealm(realmModulePath) {
   if (typeof REALM_MODULE_PATH !== 'undefined')
       return;

   global.REALM_MODULE_PATH = realmModulePath;

   mockery.enable({
       warnOnReplace: false,
       warnOnUnregistered: false
   });
   mockery.registerSubstitute('realm', REALM_MODULE_PATH); // eslint-disable-line no-undef
}

mockRealm(path.resolve(__dirname, '../..'));

const AppConfig = require('./support/testConfig');
let appConfig = AppConfig.integrationAppConfig;
const Realm = require('realm');

const testPush = async function()  {
    let app = new Realm.App(appConfig);
    let credentials = Realm.Credentials.anonymous();
    let user = await app.logIn(credentials);

    let push = user.push('gcm');

    await push.deregister(); // deregister never registered not an error
    await push.register("hello");
    await push.register("hello"); // double register not an error
    await push.deregister();
    await push.deregister(); // double deregister not an error

    const err = await TestCase.assertThrowsAsync(async() => await user.push('nonesuch').register('hello'))
    TestCase.assertEqual(err.message, "service not found: 'nonesuch'");
};

testPush();

