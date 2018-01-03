////////////////////////////////////////////////////////////////////////////
//
// Copyright 2016 Realm Inc.
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

module.exports = {
    assertEqual: function(val1, val2, errorMessage) {
        if (val1 !== val2) {
            var message = "'" + val1 + "' does not equal expected value '" + val2 + "'";
            if (errorMessage) {
                message = errorMessage + ' - ' + message;
            }
            throw new TestFailureError(message);
        }
    },

    assertNotEqual: function(val1, val2, errorMessage) {
        if (val1 === val2) {
            var message = "'" + val1 + "' equals '" + val2 + "'";
            if (errorMessage) {
                message = errorMessage + ' - ' + message;
            }
            throw new TestFailureError(message);
        }
    },

    assertEqualWithTolerance: function(val1, val2, tolerance, errorMessage) {
        if (val1 < val2 - tolerance || val1 > val2 + tolerance) {
            var message = "'" + val1 + "' does not equal '" + val2 + "' with tolerance '" + tolerance + "'";
            if (errorMessage) {
                message = errorMessage + ' - ' + message;
            }
            throw new TestFailureError(message);
        }
    },

    assertArray: function(value, length, errorMessage) {
        if (!Array.isArray(value)) {
            throw new TestFailureError(errorMessage || `Value ${value} is not an array`);
        }
    },

    assertArrayLength: function(value, length, errorMessage) {
        this.assertArray(value);
        if (value.length !== length) {
            throw new TestFailureError(errorMessage || `Value ${value} is not an array of length ${length}`);
        }
    },

    assertArraysEqual: function(val1, val2, errorMessage) {
        var len1 = val1.length;
        var len2 = val2.length;
        var message;

        if (len1 !== len2) {
            message = 'Arrays have different lengths (' + len1 + ' != ' + len2 + ')';
            if (errorMessage) {
                message = errorMessage + ' - ' + message;
            }
            throw new TestFailureError(message);
        }

        for (var i = 0; i < len1; i++) {
            if (val1[i] !== val2[i]) {
                message = 'Array contents not equal at index ' + i + ' (' + val1[i] + ' != ' + val2[i] + ')';
                if (errorMessage) {
                    message = errorMessage + ' - ' + message;
                }
                throw new TestFailureError(message);
            }
        }
    },

    assertThrows: function(func, errorMessage) {
        var caught = false;
        try {
            func();
        }
        catch (e) {
            caught = true;
        }

        if (!caught) {
            throw new TestFailureError(errorMessage || 'Expected exception not thrown');
        }
    },

    assertThrowsException: function(func, expectedException) {
        var caught = false;
        try {
            func();
        }
        catch (e) {
            caught = true;
            if (e.name !== expectedException.name) {
                throw new TestFailureError('Expected a ' + expectedException.name + ' exception but caught a ' + e.name + ' instead. Message was: ' + e.message);
            }
            if (e.message != expectedException.message) {
                throw new TestFailureError('Expected exception "' + expectedException + '" not thrown - instead caught: "' + e + '"');
            }
        }

        if (!caught) {
            throw new TestFailureError('Expected exception not thrown');
        }
    },

    assertTrue: function(condition, errorMessage) {
        if (!condition) {
            throw new TestFailureError(errorMessage || `Condition ${condition} expected to be true`);
        }
    },

    assertInstanceOf: function(object, type, errorMessage) {
        if (!(object instanceof type)) {
            throw new TestFailureError(errorMessage || `Object ${object} expected to be of type ${type}`);
        }
    },

    assertType: function(value, type) {
        this.assertEqual(typeof value, type, `Value ${value} expected to be of type ${type}`);
    },

    assertUndefined: function(value, errorMessage) {
        if (value !== undefined) {
            throw new TestFailureError(errorMessage || `Value ${value} expected to be undefined`);
        }
    },

    assertNull: function(value, errorMessage) {
        if (value !== null) {
            throw new TestFailureError(errorMessage || `Value ${value} expected to be null`);
        }
    },

    isNode: function() {
        // eslint-disable-next-line no-undef
        return typeof process == 'object' && Object.prototype.toString.call(process) == '[object process]';
    },

    isNode6: function() {
        // eslint-disable-next-line no-undef
        return this.isNode() && process.version.indexOf('v6.') == 0;
    },
};

function TestFailureError(message) {
    var error;
    try {
        throw new Error(message);
    } catch (e) {
        error = e;
    }

    // This regular expression will match stack trace lines provided by JavaScriptCore.
    // Example: someMethod@file:///path/to/file.js:10:24
    var regex = /^(?:.*?@)?([^\[\(].+?):(\d+)(?::(\d+))?\s*$/;

    // Remove the top two stack frames and use information from the third, if possible.
    var stack = error.stack && error.stack.split('\n');
    var match = stack[2] && stack[2].match(regex);
    if (match) {
        this.sourceURL = match[1];
        this.line = +match[2];
        this.column = +match[3];
        this.stack = stack.slice(2).join('\n');
    }

    this.__proto__ = error;
}
