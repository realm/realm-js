////////////////////////////////////////////////////////////////////////////
//
// Copyright 2020 Realm Inc.
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

// The AuthClass is an empty class to provide the namespace Realm.Auth in
// JavaScript used by the auth providers EmailPassword, APIKeys, etc. No objects
// will ever be created of the type.

class Auth { };

template<typename T>
class AuthClass : public ClassDefinition<T, Auth> {
    using ContextType = typename T::Context;
    using FunctionType = typename T::Function;
    using Function = js::Function<T>;

public:
    std::string const name = "Auth";

    static FunctionType create_constructor(ContextType);
};

template<typename T>
inline typename T::Function AuthClass<T>::create_constructor(ContextType ctx) {
    FunctionType constructor = ObjectWrap<T, AuthClass<T>>::create_constructor(ctx);
    return constructor;
}



}
}