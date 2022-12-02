////////////////////////////////////////////////////////////////////////////
//
// Copyright 2022 Realm Inc.
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

// --------------------------------------------------------------------------------------------------------------------------
// * Function: Normalize property schema (name: string, schema: string | ObjectSchemaProperty): CanonicalObjectSchemaProperty
// --------------------------------------------------------------------------------------------------------------------------
//
// if schema is string
//    normalize property schema string
// else
//    normalize property schema object
// return normalized schema
//
//
//
// --------------------------------------------------------------------------------------------------------------------------
// * Function: Normalize property schema string (name: string, schema: string): CanonicalObjectSchemaProperty
// --------------------------------------------------------------------------------------------------------------------------
//
// ensure that the current string is not empty
//
// if current string ends with "[]" or "{}" or "<>"
//    if current string ends with "[]"
//        set `type` to "list"
//    else if current string ends with "{}"
//        set `type` to "dictionary"
//    else /* if current string ends with "<>" */
//        set `type` to "set"
//    update current string by removing last 2 chars
//    ensure that current string is not empty
//
// if current string ends with "?"
//    set `optional` to true
//    update current string by removing last char
//    ensure that current string is not empty
//
// if current string is primitive type
//    if `type` is collection type
//        set `objectType` to current string
//    else
//        set `type` to current string
// else if current string is "list" or "dictionary" or "set" or "object" or "linkingObjects"   // These names cannot be used in shorthand notation
//    error
// else /* is a user-defined type */
//    set `objectType` to current string
//    if `type` is not collection type
//        set `type` to "object"
//
// set variable isImplicitlyNullable to true if `type` is "mixed" or `objectType` is "mixed" or `objectType` is a user-defined type
// if isImplicitlyNullable
//      set `optional` to true
//
// create and return the CanonicalObjectSchemaProperty
//
//
//
// --------------------------------------------------------------------------------------------------------------------------
// * Function: Normalize property schema object (name: string, schema: ObjectSchemaProperty): CanonicalObjectSchemaProperty
// --------------------------------------------------------------------------------------------------------------------------
//
// ensure that `type` is not empty
//
// if `type` is primitive type
//    ensure that `objectType` is undefined
// else if `type` is collection type
//    ensure that `objectType` is primitive type or user-defined type
// else if `type` is "object" or "linkingObjects"
//    ensure that `objectType` is a user-defined type
// else /* `type` is a user-defined type */
//    error                                    // User-defined types must always have type === "object" or "linkingObjects"
//
// set variable isImplicitlyNullable to true if `type` is "mixed" or `objectType` is "mixed" or `objectType` is a user-defined type
// if isImplicitlyNullable
//      ensure `optional` is not false (being undefined is allowed)
//      set `optional` to true
//
// create and return the CanonicalObjectSchemaProperty
// --------------------------------------------------------------------------------------------------------------------------
