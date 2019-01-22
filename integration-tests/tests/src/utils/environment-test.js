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

// Implements a way to skip tests on specific platforms

function passesFilterProperty(filterValue, environmentValue) {
    if (filterValue === true) {
        // If filter value is strictly true, the environment must not be loosely true
        return environmentValue;
    } else if (filterValue) {
        // If filter value is some other non-falsy value, the environment must match exactly
        return filterValue === environmentValue;
    } else {
        // A falsy filter expects a falsy environment
        return !environmentValue;
    }
}

function passesFilter(filter) {
    for (const k in filter) {
        if (!passesFilterProperty(filter[k], environment[k])) {
            return false;
        }
    }
    return true;
}

module.exports = function(filter, title, callback) {
    const passes = passesFilter(filter);
    if (passes) {
        it(title, callback);
    } else {
        it.skip(title, callback);
    }
};
