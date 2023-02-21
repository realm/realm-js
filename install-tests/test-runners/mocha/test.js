var assert = require('assert');

describe('Realm', function() {
   it('should be requirable', function() {
       var realm = require('realm');
       assert.equal(typeof realm, 'function');
       assert.equal(realm.name, 'Realm');
   });
});
