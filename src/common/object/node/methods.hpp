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
#include <iterator>

#include "common/collection.hpp"
#include "common/object/observer.hpp"



auto NodeCallbackWrapper(const Napi::CallbackInfo &values) {
    return [&](int index) -> Napi::Value { return values[index]; };
}
namespace method {
    struct Arguments {
        Napi::Env context;
        ObjectObserver *observer = nullptr;
        IOCollection *collection = nullptr;
        size_t argumentCount;
        std::function<Napi::Value(int index)> callback;

        Napi::Value get(int index,
                        std::string msg = "Missing argument for method call.") {
            if (index >= argumentCount) {
                Napi::Error::New(context, msg.c_str());
            }

            return callback(index);
        }

        void throw_error(std::string&& message){
            throw Napi::Error::New(context, message);
        }
    };
}

namespace accessor{
    struct Arguments{
        Napi::Env context;
        std::string property_name;
        Napi::Value value;

        Arguments(Napi::Env ctx, std::string name, Napi::Value _value = {}):
                context{ctx}, property_name(name), value{_value} {}

        Arguments(const method::Arguments& args, std::string _property_name, Napi::Value _value ):
                context{args.context}, property_name(_property_name), value{_value} {}

        void throw_error(std::string&& message){
            throw Napi::Error::New(context, message);
        }
    };

    struct IAccessor {
        virtual void set(Arguments args) = 0;
        virtual Napi::Value get(Arguments args) = 0;
    };
};