// eslint-disable-next-line no-undef,strict
test(dictionary);  // Testing successful object creation.

// eslint-disable-next-line no-undef
dictionary.hello(true);  // Testing method call from object.

// eslint-disable-next-line no-undef
dictionary.alo(true); // Testing method call from object <again>.

/* Testing accessors. */
// eslint-disable-next-line no-undef
dictionary.X=666;
// eslint-disable-next-line no-undef
test_accessor(dictionary, 'X', 666);