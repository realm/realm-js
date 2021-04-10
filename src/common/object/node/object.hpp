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

#include "collection.hpp"
#include "common/object/error_handling.hpp"
#include "methods.hpp"
#include "napi.h"
#include "subscriber.hpp"

namespace realm {
    namespace js {
        namespace common {
            class JavascriptObject {
            private:
                Napi::Env context;
                Napi::Object object;
                Napi::Reference<Napi::Object> ref_object;

                template<class T>
                using ObjectAPI = realm::js::Object<T>;
                using Property = realm::js::PropertyAttributes;
                std::vector<std::string> keys;


                template<void cb(Args), typename Data>
                static auto make_callback_method(Data *data) {
                    return [=](const auto &info) mutable {
                        try {
                            cb({info.Env(), data, data->get_collection(), info.Length(),
                                NodeCallbackWrapper(info)});
                        } catch (InvalidTransactionException &e) {
                            _throw_error(info.Env(), e);
                        }
                    };
                }

                static auto _get(std::string key_name, IOCollection *collection) {
                    return [=](const auto &info) mutable {
                        return collection->get(info.Env(), key_name);
                    };
                }

                static auto _set(std::string key_name, IOCollection *collection) {
                    return [=](const auto &info) mutable {
                        try {
                            collection->set(info.Env(), key_name, info[0]);
                        } catch (InvalidTransactionException &e) {
                            _throw_error(info.Env(), e);
                        }
                    };
                }

            public:
                JavascriptObject(Napi::Env _ctx, std::string name = "js_object")
                        : context{_ctx} {
                    object = Napi::Object::New(context);
                }

                template<class VM, void cb(Args), class Data>
                void add_method(std::string &&name, Data *data) {
                    auto _callback = make_callback_method<cb>(data);
                    auto js_function = Napi::Function::New(context, _callback, name);

                    ObjectAPI<VM>::set_property(context, object, name, js_function,
                                                Property::DontEnum);
                }

                void add_accessor(std::string key, IOCollection *data) {
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

                    /*
                     * https://github.com/nodejs/node-addon-api/blob/main/doc/property_descriptor.md
                     */
                    auto descriptor = Napi::PropertyDescriptor::Accessor(
                            context, object, key, _get(key, data), _set(key, data), rules);

                    object.DefineProperty(
                            descriptor);  // https://github.com/nodejs/node-addon-api/blob/main/doc/object.md#defineproperty

                    keys.push_back(key);
                }

                template<typename JSObject, typename RemovalCallback, typename Self>
                static void finalize(JSObject object, RemovalCallback &&callback,
                                     Self *self) {
                    object.AddFinalizer([callback](auto, void *data_ref) { callback(); },
                                        self);
                }

                std::vector<std::string> &get_keys() {
                    return keys;
                }

                void remove_accessor(std::string &key) {
                    std::cout << "Removing!!" << '\n';
                    auto it = remove_if(keys.begin(), keys.end(), [&key](std::string const &cmp) -> bool {
                        return key == cmp;
                    });

                    if (it != keys.end()) {
                        object.Delete(key);
                    }
                }

                void retain(){
                    ref_object = Napi::Reference<Napi::Object>::New(object);
                }

                Napi::Object get_object() {
                    if(ref_object.IsEmpty()){
                        return object;
                    }else{
                        return ref_object.Value();
                    }
                    //return ref_object.IsEmpty()? object: ref_object.Value();
                }
            };
        }  // namespace common
    }  // namespace realm
}