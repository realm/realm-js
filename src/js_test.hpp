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

#include "js_class.hpp"

namespace realm {
namespace js {

template <typename T>
class TestClass : public ClassDefinition<T, void*> {
    using ContextType = typename T::Context;
    using FunctionType = typename T::Function;
    using ObjectType = typename T::Object;
    using ValueType = typename T::Value;
    using Context = js::Context<T>;
    using String = js::String<T>;
    using Value = js::Value<T>;
    using Object = js::Object<T>;
    using Function = js::Function<T>;
    using ReturnValue = js::ReturnValue<T>;
    using Arguments = js::Arguments<T>;

public:
    const std::string name = "Test";

    static void constructor(ContextType, ObjectType, Arguments&);
    static FunctionType create_constructor(ContextType);
    static ObjectType create_instance(ContextType, SharedApp);

    static void test(ContextType, ObjectType, Arguments&, ReturnValue&);

    MethodMap<T> const static_methods = {
        {"_test", wrap<test>},
    };
};

template <typename T>
inline typename T::Function TestClass<T>::create_constructor(ContextType ctx)
{
    FunctionType test_constructor = ObjectWrap<T, TestClass<T>>::create_constructor(ctx);

    // PropertyAttributes attributes = ReadOnly | DontEnum | DontDelete;
    // Object::set_property(ctx, sync_constructor, "User", ObjectWrap<T, UserClass<T>>::create_constructor(ctx),
    // attributes); Object::set_property(ctx, sync_constructor, "Session", ObjectWrap<T,
    // SessionClass<T>>::create_constructor(ctx), attributes);

    return test_constructor;
}

template <typename T>
void TestClass<T>::test(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value)
{
    // auto app = *get_internal<T, AppClass<T>>(ctx, this_object);
    return_value.set(Value::from_string(ctx, "Test!"));
}

} // namespace js
} // namespace realm