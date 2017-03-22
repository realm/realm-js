describe('Realm', function() {
   it('should be requirable', function() {
       var realm = require('../../../../realm-js');
       expect(typeof realm).toBe('function');
       expect(realm.name).toBe('Realm');
   });
});
