'use strict';

var TestUtil = {
    realmPathForFile: function(str) {
        var path = Realm.defaultPath;
        return path.substring(0, path.lastIndexOf("/") + 1) + str;
    },
};

var TestCase = {
    assertEqual: function() {
        if (arguments[0] !== arguments[1]) {
            var message = "'" + arguments[0] + "' does not equal '" + arguments[1] + "'";
            if (arguments.length == 3) {
                message = arguments[2] + "\n" + message;
            }
            throw new Error(message);
        }
    },

    assertNotEqual: function() {
        if (arguments[0] === arguments[1]) {
            var message = "'" + arguments[0] + "' equals '" + arguments[1] + "'";
            if (arguments.length == 3) {
                message = arguments[2] + "\n" + message;
            }
            throw new Error(message);
        }
    },

    assertEqualWithTolerance: function(val1, val2, tolerance, errorMessage) {
        if (val1 < val2 - tolerance || val1 > val2 + tolerance) {
            var message = "'" + val1 + "' does not equal '" + val2 + "' with tolerance '" + tolerance + "'";
            if (errorMessage !== undefined) {
                message = errorMessage + "\n" + message;
            }
            throw new Error(message);
        }
    },

    assertThrows: function(func, errorMessage) {
        var caught = false;
        try {
            func();
        }
        catch(exception) {
            caught = true;
        }

        if (!caught) {
            if (errorMessage == undefined) {
                errorMessage = 'Expected exception not thrown: ';
            }
            throw errorMessage;
        };
    },

    assertTrue: function(condition) {
        if (!condition) {
            throw 'Condition expected to be true';
        };
    },
}
