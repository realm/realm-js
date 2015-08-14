////////////////////////////////////////////////////////////////////////////
//
// Copyright 2015 Realm Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
////////////////////////////////////////////////////////////////////////////

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
