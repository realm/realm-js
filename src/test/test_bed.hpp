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
#include "common/object/jsc_object.hpp"
#include <iostream>
#pragma once
using namespace std;

template <typename Collection>
struct AccessorsTest {
    Collection N = 50;

    template <typename ContextType>
    auto get(ContextType context, std::string key_name) {
        return N;
    }

    template <typename ContextType, typename ValueType>
    auto set(ContextType context, std::string key_name, ValueType value) {
        JSValueRef exception = nullptr;
        N = JSValueToNumber(context, value, &exception);
    }
};

template <typename T>
struct MethodTest{
    static void method(JSContextRef& context, JSValueRef value) {
        cout << "test! \n";
    }

    template<class JSObject>
    auto apply(JSObject* object){
        object->template add_accessor<AccessorsTest<int>>("X", 666);
        object->template add_method<T, method>("hello", new T{5});
        return object->get_object();
    }
};


