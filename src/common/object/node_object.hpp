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

#include "napi.h"


namespace T {
namespace common {


class JavascriptObject {
private:
Napi::Env context;
Napi::Object object;
using Notify = std::function<void(Napi::Env, Napi::Value, ObjectMutationObserver*)>;


template <typename Callback, typename Data>
static auto make_callback_method(Callback&& callback, Data *data){
    return [=](const auto& info) mutable {
        callback(info.Env(), info[0], data, data->get_data());
    };
}

public:
    JavascriptObject(Napi::Env _ctx, std::string name = "js_object")
            : context{_ctx} {
        object = Napi::Object::New(context);
    }

    template <class VM, typename Function, class Data>
    void add_method(std::string&& name, Function&& function, Data *data){
        auto _callback = make_callback_method(function, data);
        auto js_function = Napi::Function::New(context, _callback, name);
        js::Object<VM>::set_property(context, object, name, js_function, PropertyAttributes::DontEnum);
    }

    template <typename Accessor, typename Data>
    void add_accessor(std::string key, Data data){
        Accessor accessor;
        auto _getter = accessor.make_getter(key, data);
        auto _setter = accessor.make_setter(key, data);

        /*
         * NAPI_enumerable: Enables JSON.stringify(object) and all the good
         * stuff for free...
         *
         * NAPI_configurable: Allow us to modify accessors, for example: Delete
         * fields, very handy to reflect object-dictionary mutations.
         *
         */
        auto rules = static_cast<napi_property_attributes>(napi_enumerable |
                                                           napi_configurable);

        auto descriptor = Napi::PropertyDescriptor::Accessor(
                context, object, key, _getter, _setter, rules);

        object.DefineProperty(descriptor);
    }

    template <typename JSObject, typename RemovalCallback, typename Self>
    static void finalize(JSObject object, RemovalCallback&& callback, Self *self) {
        object.AddFinalizer(
                [callback](auto, void* data_ref) {
                    callback();
                }, self);
    }

    Napi::Object get_object() { return object;  }
};
}
}