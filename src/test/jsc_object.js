// eslint-disable-next-line no-undef,strict
test(dictionary);  // Testing successful object creation.

// eslint-disable-next-line no-undef
null_dictionary.hello(true);  // Testing method call from object.

// eslint-disable-next-line no-undef
null_dictionary.alo(true); // Testing method call from object <again>.

// eslint-disable-next-line no-undef
dictionary.doSomething(28850);

/* Testing accessors. */
// eslint-disable-next-line no-undef
dictionary.X=666;
// eslint-disable-next-line no-undef
test_accessor(dictionary, 'X', 666);