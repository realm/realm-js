var assert = require('assert');

describe('Realm', function() {
   it('should be requirable', function() {
       var realm = require('../../../../realm-js');
       assert.equal(typeof realm, 'function');
       assert.equal(realm.name, 'Realm');
   });
});
