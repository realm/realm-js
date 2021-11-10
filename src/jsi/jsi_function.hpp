////////////////////////////////////////////////////////////////////////////
//
// Copyright 2021 Realm Inc.
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

#include "jsi_types.hpp"

namespace realm {
namespace js {

template <>
inline JsiVal realmjsi::Function::call(JsiEnv env, const JsiFunc& function, size_t argc, const JsiVal arguments[]) {
    return env(function->call(env, env.args(arguments, argc), argc));
}

template <>
inline JsiVal realmjsi::Function::call(JsiEnv env, const JsiFunc& function, const JsiObj& this_object, size_t argc, const JsiVal arguments[]) {
    return env(function->callWithThis(env, this_object, env.args(arguments, argc), argc));
}

template <>
inline JsiVal realmjsi::Function::callback(JsiEnv env, const JsiFunc& function, size_t argc, const JsiVal arguments[]) {
    return env(function->call(env, env.args(arguments, argc), argc));
}
template <>
inline JsiVal realmjsi::Function::callback(JsiEnv env, const JsiFunc& function, const JsiObj& this_object, size_t argc, const JsiVal arguments[]) {
    return env(function->callWithThis(env, this_object, env.args(arguments, argc), argc));
}

template <>
inline JsiObj realmjsi::Function::construct(JsiEnv env, const JsiFunc& function, size_t argc, const JsiVal arguments[]) {
    return env(function->callAsConstructor(env, env.args(arguments, argc), argc).asObject(env));
}

} // namespace js
} // namespace realm
