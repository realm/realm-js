'use strict';

var ResultsTests = {
    testResultsLength: function() {
        var realm = new Realm({schema: [TestObjectSchema]});
        var objects = realm.objects('TestObject');
        TestCase.assertEqual(objects.length, 0);

        realm.write(function() {
            realm.create('TestObject', [1]);
            TestCase.assertEqual(objects.length, 1);
        });
        TestCase.assertEqual(objects.length, 1);
    },
    testResultsSubscript: function() {
        var realm = new Realm({schema: [PersonObject]});
        realm.write(function() {
            realm.create('PersonObject', ['name1', 1]);
            realm.create('PersonObject', ['name2', 2]);
        });

        var people = realm.objects('PersonObject');
        TestCase.assertEqual(people[0].age, 1);
        TestCase.assertEqual(people[1].age, 2);
        TestCase.assertThrows(function() { people[2]; }, 'Invalid index');
        TestCase.assertThrows(function() { people[-1]; }, 'Invalid index');
        TestCase.assertTrue(Object.getPrototypeOf(people[0]) === PersonObject.prototype);
    },
    testResultsInvalidProperty: function() {
        var realm = new Realm({schema: [TestObjectSchema]});
        var objects = realm.objects('TestObject');
        TestCase.assertEqual(undefined, objects.ablasdf);
    },
    testResultsEnumberate: function() {
        var realm = new Realm({schema: [TestObjectSchema]});
        var objects = realm.objects('TestObject');
        for (var object in objects) {
            TestCase.assertTrue(false, "No objects should have been enumerated");
        }

        realm.write(function() {
            realm.create('TestObject', [1]);
            TestCase.assertEqual(objects.length, 1);
        });

        var count = 0;
        for (var object in objects) {
            count++;
            //TestCase.assertTrue(object instanceof Object);
        }    
        TestCase.assertEqual(1, count);
    },
}
