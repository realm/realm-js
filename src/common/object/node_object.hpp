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

#include "common/object/interfaces.hpp"
#include "napi.h"

namespace common {

class JavascriptObject {
   private:
    Napi::Env context;
    Napi::Object object;

    template <void cb(Napi::Env context, Napi::Value value,
                      ObjectObserver* observer, IOCollection* collection),
              typename Data>
    static auto make_callback_method(Data* data) {
        return [=](const auto& info) mutable {
            cb(info.Env(), info[0], data, data->get_collection());
        };
    }

    template <typename Accessor>
    static auto _get(std::string key_name, Accessor accessor) {
        return [=](const auto& info) mutable {
            return accessor.get(info.Env(), key_name);
        };
    }

    template <typename Accessor>
    static auto _set(std::string key_name, Accessor accessor) {
        return [=](const auto& info) mutable {
            accessor.set(info.Env(), key_name, info[0]);
        };
    }

   public:
    JavascriptObject(Napi::Env _ctx, std::string name = "js_object")
        : context{_ctx} {
        object = Napi::Object::New(context);
    }

    template <class VM,
              void cb(Napi::Env context, Napi::Value value,
                      ObjectObserver* observe, IOCollection* collection),
              class Data>
    void add_method(std::string&& name, Data* data) {
        auto _callback = make_callback_method<cb>(data);
        auto js_function = Napi::Function::New(context, _callback, name);

        js::Object<VM>::set_property(context, object, name, js_function,
                                     PropertyAttributes::DontEnum);
    }

    template <typename Accessor>
    void add_accessor(std::string key, IOCollection* data) {
        Accessor accessor{data};

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
            context, object, key, _get(key, accessor), _set(key, accessor),
            rules);

        object.DefineProperty(descriptor);
    }

    template <typename JSObject, typename RemovalCallback, typename Self>
    static void finalize(JSObject object, RemovalCallback&& callback,
                         Self* self) {
        object.AddFinalizer([callback](auto, void* data_ref) { callback(); },
                            self);
    }

    Napi::Object get_object() { return object; }
};
}  // namespace common
