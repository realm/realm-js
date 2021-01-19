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

#include <common/type_deduction.hpp>
#include <iostream>
#include <map>
#include <realm/mixed.hpp>
#include <type_traits>

namespace realm {
namespace js {

template <typename Context, typename Value>
class MixedWrapper {
   public:
    virtual Mixed wrap(Context, Value const &) = 0;
    virtual Value unwrap(Context, Mixed) = 0;
};

template <typename Context, typename Value, typename Utils>
class MixedString : public MixedWrapper<Context, Value> {
   private:
    // we need this <cache> to keep the value life long enough to get into the
    // DB, we do this because the realm::Mixed type is just a reference
    // container.
    std::string cache;

   public:
    Mixed wrap(Context context, Value const &value) {
        cache = Utils::to_string(context, value);
        return Mixed(cache);
    }

    Value unwrap(Context context, Mixed mixed) {
        return Utils::from_string(context,
                                  mixed.template get<StringData>().data());
    }
};

template <typename Context, typename Value, typename Utils>
class MixedBoolean : public MixedWrapper<Context, Value> {
    Mixed wrap(Context context, Value const &value) {
        return Mixed(Utils::to_boolean(context, value));
    }

    Value unwrap(Context context, Mixed mixed) {
        return Utils::from_boolean(context, mixed.get<bool>());
    }
};

template <typename Context, typename Value, typename Utils,
          typename RealmNumberType>
class MixedNumber : public MixedWrapper<Context, Value> {
    Mixed wrap(Context context, Value const &value) {
        return Mixed(Utils::to_number(context, value));
    }

    Value unwrap(Context context, Mixed mixed) {
        return Utils::from_number(context, mixed.get<RealmNumberType>());
    }
};

template <typename Context, typename Value, typename Utils>
class MixedDecimal128 : public MixedWrapper<Context, Value> {
    Mixed wrap(Context context, Value const &value) {
        return Mixed(Utils::to_decimal128(context, value));
    }

    Value unwrap(Context context, Mixed mixed) {
        return Utils::from_decimal128(context, mixed.get<Decimal>());
    }
};

template <typename Context, typename Value, typename Utils>
class MixedObjectID : public MixedWrapper<Context, Value> {
    Mixed wrap(Context context, Value const &value) {
        return Mixed(Utils::to_object_id(context, value));
    }

    Value unwrap(Context context, Mixed mixed) {
        return Utils::from_object_id(context, mixed.get<ObjectId>());
    }
};

template <typename Context, typename Value, typename Utils>
class MixedBinary : public MixedWrapper<Context, Value> {
    Mixed wrap(Context context, Value const &value) {
        auto owned_binary_data = Utils::to_binary(context, value);
        return Mixed(owned_binary_data.get());
    }

    Value unwrap(Context context, Mixed mixed) {
        return Utils::from_binary(context, mixed.get<BinaryData>());
    }
};

template <typename Context, typename Value, typename Utils>
class MixedTimeStamp : public MixedWrapper<Context, Value> {
    Mixed wrap(Context context, Value const &value) {
        auto date = Utils::to_date(context, value);

        double milliseconds = Utils::to_number(context, date);
        int64_t seconds = milliseconds / 1000;
        int32_t nanoseconds = ((int64_t)milliseconds % 1000) * 1000000;
        Timestamp ts(seconds, nanoseconds);

        return Mixed(ts);
    }

    Value unwrap(Context context, Mixed mixed) {
        return Utils::from_timestamp(context, mixed.get<Timestamp>());
    }
};

template <typename JavascriptEngine>
class TypeMixed {
   private:
    using Context = typename JavascriptEngine::Context;
    using Value = typename JavascriptEngine::Value;
    using Utils = js::Value<JavascriptEngine>;
    using Strategy = MixedWrapper<Context, Value> *;

    /*
        This table acts as a global hashmap, 
        attached to the lifecycle of the process. 

        All these pointer will be deallocated when the process exits. 
    */
    std::map<DataType, Strategy> strategies = {
        {type_String, new MixedString<Context, Value, Utils>},
        {type_Int, new MixedNumber<Context, Value, Utils, Int>},
        {type_Float, new MixedNumber<Context, Value, Utils, Float>},
        {type_Double, new MixedNumber<Context, Value, Utils, Double>},
        {type_Bool, new MixedBoolean<Context, Value, Utils>},
        {type_Decimal, new MixedDecimal128<Context, Value, Utils>},
        {type_ObjectId, new MixedObjectID<Context, Value, Utils>},
        {type_Binary, new MixedBinary<Context, Value, Utils>},
        {type_Timestamp, new MixedTimeStamp<Context, Value, Utils>},
    };

    Strategy get_strategy(DataType type) { return strategies[type]; }

    TypeMixed() {}

   public:
    static TypeMixed &get_instance() {
        static TypeMixed<JavascriptEngine> instance;
        return instance;
    }

    Value wrap(Context context, Mixed mixed) {
        auto strategy = get_strategy(mixed.get_type());

        if (strategy == nullptr) {
            throw std::runtime_error(
                "The " + TypeDeduction::realm_typeof(mixed.get_type()) +
                " value is not supported for the mixed type.");
        }
        return strategy->unwrap(context, mixed);
    }

    Mixed unwrap(Context context, Value const &js_value) {
        auto type = TypeDeduction::typeof(js_value);
        auto strategy = get_strategy(type);

        if (strategy == nullptr) {
            throw std::runtime_error(
                "Mixed conversion not possible for type: " +
                TypeDeduction::realm_typeof(type));
        }
        return strategy->wrap(context, js_value);
    }
};

}  // namespace js
}  // namespace realm
