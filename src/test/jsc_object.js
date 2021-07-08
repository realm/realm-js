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

assert_enumerate(JSON.stringify(dict))

/*
    Testing exception mechanism.
*/
try {
    dict.X = -1  // testing wrong value.
}catch(error){
    assert_exception(error.message)
}