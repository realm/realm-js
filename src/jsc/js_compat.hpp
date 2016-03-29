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

#include "types.hpp"
#include <string>

namespace realm {
namespace js {
    
static bool ValueIsUndefined(jsc::Types::Context ctx, jsc::Types::Value value) { return JSValueIsUndefined(ctx, value); }
static bool ValueIsNull(jsc::Types::Context ctx, jsc::Types::Value value) { return JSValueIsNull(ctx, value); }
static bool ValueIsBoolean(jsc::Types::Context ctx, jsc::Types::Value value) { return JSValueIsBoolean(ctx, value); }
static bool ValueIsNumber(jsc::Types::Context ctx, jsc::Types::Value value) { return JSValueIsNumber(ctx, value); }
static bool ValueIsString(jsc::Types::Context ctx, jsc::Types::Value value) { return JSValueIsString(ctx, value); }
static bool ValueIsObject(jsc::Types::Context ctx, jsc::Types::Value value) { return JSValueIsObject(ctx, value); }

}}