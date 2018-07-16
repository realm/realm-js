if (!global.Realm) {
    throw new Error("Expected Realm to be available as a global");
}

require("./realm-constructor");

after(() => {
    // Remove all default.realm files
    Realm.clearTestState();
});
