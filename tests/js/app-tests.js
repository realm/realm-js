'use strict';

/* global navigator, WorkerNavigator */

const require_method = require;

// Prevent React Native packager from seeing modules required with this
function nodeRequire(module) {
    return require_method(module);
}

const Realm = require('realm');
const TestCase = require('./asserts');

module.exports = {
    testNewApp: function () {
        const config = {
            id: 'realm-sdk-integration-tests-pwjzl'
        };

        let app = new Realm.App(config);
        TestCase.assertTrue(app instanceof Realm.App);
    },

    testLogin: function () {
        const config = {
            id: 'realm-sdk-integration-tests-etyyr',
            url: 'http://localhost:9090',
            timeout: 1000,
            app: {
                name: 'realm-sdk-integration-tests',
                version: '42'
            }
        };

        let app = new Realm.App(config);
        TestCase.assertTrue(app instanceof Realm.App);

        let credentials = Realm.Credentials.anonymous();
        return app.login(credentials);
    },
};