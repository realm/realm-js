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

#include <map>
#include <string>
#include <vector>

#include "js_types.hpp"

namespace realm {
namespace js {

template<typename T>
using ConstructorType = void(typename T::Context, typename T::Object, size_t, const typename T::Value[]);

template<typename T>
using MethodType = void(typename T::Context, typename T::Function, typename T::Object, size_t, const typename T::Value[], ReturnValue<T> &);

template<typename T>
struct Arguments {
    const typename T::Context ctx;
    const size_t count;
    const typename T::Value* const value;

    typename T::Value operator[](size_t index) const noexcept {
        if (index >= count) {
            return Value<T>::from_undefined(ctx);
        }
        return value[index];
    }

    void validate_maximum(size_t max) const {
        if (max < count) {
            throw std::invalid_argument(util::format("Invalid arguments: at most %1 expected, but %2 supplied.", max, count));
        }
    }

    void validate_count(size_t actual) const {
        if (count != actual) {
            throw std::invalid_argument(util::format("Invalid arguments: %1 expected, but %s supplied.", actual, count));
        }
    }
};

template<typename T>
using ArgumentsMethodType = void(typename T::Context, typename T::Object, Arguments<T>, ReturnValue<T> &);

template<typename T>
struct PropertyType {
    using GetterType = void(typename T::Context, typename T::Object, ReturnValue<T> &);
    using SetterType = void(typename T::Context, typename T::Object, typename T::Value);

    typename T::PropertyGetterCallback getter;
    typename T::PropertySetterCallback setter;
};

template<typename T>
struct IndexPropertyType {
    using GetterType = void(typename T::Context, typename T::Object, uint32_t, ReturnValue<T> &);
    using SetterType = bool(typename T::Context, typename T::Object, uint32_t, typename T::Value);

    typename T::IndexPropertyGetterCallback getter;
    typename T::IndexPropertySetterCallback setter;
};

template<typename T>
struct StringPropertyType {
    using GetterType = void(typename T::Context, typename T::Object, const String<T> &, ReturnValue<T> &);
    using SetterType = bool(typename T::Context, typename T::Object, const String<T> &, typename T::Value);
    using EnumeratorType = std::vector<String<T>>(typename T::Context, typename T::Object);

    typename T::StringPropertyGetterCallback getter;
    typename T::StringPropertySetterCallback setter;
    typename T::StringPropertyEnumeratorCallback enumerator;
};

template<typename T>
using MethodMap = std::map<std::string, typename T::FunctionCallback>;

template<typename T>
using PropertyMap = std::map<std::string, PropertyType<T>>;

template<typename T, typename U, typename V = void>
struct ClassDefinition {
    using Internal = U;
    using Parent = V;

    // Every subclass *must* at least have a name.
    // std::string const name;

    // ClassDefinition specializations should inherit from this class and override what's needed below.
    ConstructorType<T>* const constructor = nullptr;
    MethodMap<T> const static_methods = {};
    PropertyMap<T> const static_properties = {};
    MethodMap<T> const methods = {};
    PropertyMap<T> const properties = {};
    IndexPropertyType<T> const index_accessor = {};
    StringPropertyType<T> const string_accessor = {};
};

template<typename T, typename ClassType>
class ObjectWrap;

} // js
} // realm
