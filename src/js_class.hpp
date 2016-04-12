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
using MethodType = void(typename T::Context, typename T::Object, size_t, const typename T::Value[], ReturnValue<T> &);

template<typename T>
using PropertyGetterType = void(typename T::Context, typename T::Object, ReturnValue<T> &);

template<typename T>
using PropertySetterType = void(typename T::Context, typename T::Object, typename T::Value);

template<typename T>
using IndexPropertyGetterType = void(typename T::Context, typename T::Object, uint32_t, ReturnValue<T> &);

template<typename T>
using IndexPropertySetterType = bool(typename T::Context, typename T::Object, uint32_t, typename T::Value);

template<typename T>
using StringPropertyGetterType = void(typename T::Context, typename T::Object, const String<T> &, ReturnValue<T> &);

template<typename T>
using StringPropertySetterType = bool(typename T::Context, typename T::Object, const String<T> &, typename T::Value);

template<typename T>
using StringPropertyEnumeratorType = std::vector<String<T>>(typename T::Context, typename T::Object);

template<typename T>
struct PropertyType {
    typename T::PropertyGetterCallback getter;
    typename T::PropertySetterCallback setter;
};

template<typename T>
struct IndexPropertyType {
    typename T::IndexPropertyGetterCallback getter;
    typename T::IndexPropertySetterCallback setter;
};

template<typename T>
struct StringPropertyType {
    typename T::StringPropertyGetterCallback getter;
    typename T::StringPropertySetterCallback setter;
    typename T::StringPropertyEnumeratorCallback enumerator;
};

template<typename T>
using MethodMap = std::map<std::string, typename T::FunctionCallback>;

template<typename T>
using PropertyMap = std::map<std::string, PropertyType<T>>;

template<typename T, typename U>
struct ObjectClass {
    // Every specialization *must* at least have a name.
    std::string name;
};

template<typename T, typename U = void>
struct BaseObjectClass {
    // This pointer does not need to be set.
    ObjectClass<T, U>* superclass;

    // ObjectClass specializations should inherit from this class and override what's needed below.
    ConstructorType<T>* constructor;
    MethodMap<T> static_methods;
    PropertyMap<T> static_properties;
    MethodMap<T> methods;
    PropertyMap<T> properties;
    IndexPropertyType<T> index_accessor;
    StringPropertyType<T> string_accessor;
};

template<typename T, typename U>
class ObjectWrap;

} // js
} // realm
