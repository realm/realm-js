// Exposing the Realm constructor as a global
global.Realm = require("realm");

describe(`Node.js v${process.versions.node} process`, () => {
    // Require the tests
    require("@realm-tests/tests");
});
