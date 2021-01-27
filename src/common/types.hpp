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

#pragma once

namespace realm {
namespace js {
namespace types {

/*
 * Common idiom that covers Realm and JavaScript.
 */

enum Type {
    NotImplemented = -100,
    Object = -3,
    Undefined = -2,
    Null = -1,
    Integer = 0,
    Boolean = 1,
    String = 2,
    Binary = 4,
    Mixed = 6,
    Timestamp = 8,
    Float = 9,
    Double = 10,
    Decimal = 11,
    Link = 12,
    LinkList = 13,
    ObjectId = 15,
    TypedLink = 16,
    UUID = 17,
};

} // namespace types
} // namespace js
} // namespace realm
