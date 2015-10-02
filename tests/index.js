'use strict';

var TestCase = require('./TestCase');
var {
  LinkTypesObjectSchema,
  TestObjectSchema,
  IntPrimaryObjectSchema, 
  AllTypesObjectSchema,
  DefaultValuesObjectSchema,
  PersonObject,
} = require('./TestObjects');

var RealmTestSuite = {
	tests: [
		require('./ArrayTests.js'),
		require('./ObjectTests.js'),
		require('./RealmTests.js'),
		require('./ResultsTests.js'),
	],
	testObjects: require('./TestObjects'),
}
module.exports = RealmTestSuite;  // eslint-disable-line no-undef
