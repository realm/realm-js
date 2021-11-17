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

#include "common/collection.hpp"
#include "methods.hpp"
#include "napi.h"
#include "subscriber.hpp"

namespace realm {
namespace common {

template <typename GetterSetter>
class JavascriptObject {
private:
    Napi::Env context;
    Napi::Reference<Napi::Object> ref_object;
    ObjectObserver* observer = nullptr;
    IOCollection* collection = nullptr;
    std::vector<std::string> keys;

    template <class T>
    using ObjectAPI = realm::js::Object<T>;
    using Property = realm::js::PropertyAttributes;

    bool remove_key(std::string& key)
    {
        int index = -1;
        for (auto const& _key : keys) {
            index++;
            if (key == _key) {
                keys.erase(keys.begin() + index);
                return true;
            }
        }
        return false;
    }

public:
    JavascriptObject(Napi::Env _ctx, std::string name = "js_object")
        : context{_ctx}
    {
        ref_object = Napi::Reference<Napi::Object>::New(Napi::Object::New(context));
    }

    void set_collection(IOCollection* _collection)
    {
        collection = _collection;
    }

    void set_observer(ObjectObserver* _observer)
    {
        observer = _observer;
    }

    template <class VM, void callback(method::Arguments)>
    void add_method(std::string&& name)
    {
        auto object = get();

        auto method = [=](const auto& info) {
            callback({info.Env(), observer, collection, info.Length(), NodeCallbackWrapper(info)});
        };

        auto method_function = Napi::Function::New(context, method, name);

        ObjectAPI<VM>::set_property(context, object, name, method_function, Property::DontEnum);
    }

    void add_key(std::string key)
    {
        auto _object = get();
        /*
         * NAPI_enumerable: Enables JSON.stringify(object) and other JS stuff
         * for free...
         *
         * NAPI_configurable: Allow us to modify accessors, for example: Delete
         * fields, very handy to reflect object-dictionary mutations.
         *
         */
        auto rules = static_cast<napi_property_attributes>(napi_enumerable | napi_configurable);

        auto Getter = [=](std::string& key) {
            return [=](const auto& info) mutable {
                GetterSetter gs{collection};
                return gs.get(accessor::Arguments{info.Env(), key.c_str()});
            };
        };

        auto Setter = [=](std::string& key) {
            return [=](const auto& info) mutable {
                GetterSetter gs{collection};
                gs.set(accessor::Arguments{info.Env(), key.c_str(), info[0]});
            };
        };

        /*
         * https://github.com/nodejs/node-addon-api/blob/main/doc/property_descriptor.md
         */
        auto descriptor = Napi::PropertyDescriptor::Accessor(context, _object, key, Getter(key), Setter(key), rules);

        // https://github.com/nodejs/node-addon-api/blob/main/doc/object.md#defineproperty
        _object.DefineProperty(descriptor);

        keys.push_back(key);
    }

    template <typename RemovalCallback, typename Self>
    void finalize(RemovalCallback&& callback, Self* self)
    {
        auto object = get();
        object.AddFinalizer(
            [callback](auto, void* data_ref) {
                callback();
            },
            self);
    }

    std::vector<std::string>& get_properties()
    {
        return keys;
    }

    void remove_accessor(std::string& key)
    {
        Napi::Object obj = get();

        if (remove_key(key)) {
            // https://github.com/nodejs/node-addon-api/blob/main/doc/object.md#delete
            obj.Delete(key);
        }
    }

    Napi::Object get()
    {
        return ref_object.Value();
    }

    bool is_alive()
    {
        return !get().IsUndefined();
    }

    Napi::Object create()
    {
        // Only necessary to keep compatibility with the JSCore.
        return get();
    }

    ~JavascriptObject()
    {
        if (!ref_object.IsEmpty()) {
            // Liberate any retained object.
            // https://github.com/nodejs/node-addon-api/blob/main/doc/reference.md
            ref_object.Reset();
        }
    }
};
} // namespace common
} // namespace realm
