// eslint-disable-next-line no-undef,strict
let dict = dictionary || {}
// eslint-disable-next-line no-undef
let null_dict = null_dictionary || {}

// eslint-disable-next-line no-undef
assert_true(dict.X !== undefined && dict.doSomething !== undefined);  // Testing successful object creation.

null_dict.hello(true);  // Testing method call from object.
null_dict.alo(true); // Testing method call from object <again>.


dict.doSomething(28850);

/* Testing accessors. */
dict.X=666;

// eslint-disable-next-line no-undef
test_accessor(dict, 'X', 666);

var x = {a:1,b:1,c:1}
print(" X -> " + JSON.stringify(x))
print(" dict -> " + JSON.stringify(dict))

// dict.QQQQSX = 999; // Trying to access an invalid field.
//
// // eslint-disable-next-line no-undef
// test_accessor(dict, 'X', 99);
