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

// This allow us to run the JSC tests on our Mac's locally.
#if __APPLE__
#include <JavaScriptCore/JavaScriptCore.h>
#endif

#include <iostream>
#include <vector>
#include "common/object/interfaces.hpp"
#include "common/object/error_handling.hpp"
#include "realm/object-store/shared_realm.hpp"
namespace realm {
    namespace common {

        struct PrivateStore {
            void *accessor_data = nullptr;
            ObjectObserver *observer = nullptr;
            IOCollection *collection = nullptr;
            std::function<void()> finalizer = nullptr;
        };

        class JavascriptObject {
        private:
            JSClassDefinition _class;
            JSContextRef context;
            std::vector <JSStaticFunction> methods;
            std::vector <JSStaticValue> accessors;
            PrivateStore *private_object;

            static std::string to_string(JSContextRef context, JSStringRef value) {
                std::string str;
                size_t sizeUTF8 = JSStringGetMaximumUTF8CStringSize(value);
                str.reserve(sizeUTF8);
                JSStringGetUTF8CString(value, str.data(), sizeUTF8);
                return str;
            }

            static PrivateStore *get_private(JSObjectRef object) {
                PrivateStore *store = static_cast<PrivateStore *>(JSObjectGetPrivate(object));
                if (store == nullptr) {
                    std::cout << "Store is empty!! \n";
                }
                return store;
            }

            template<void cb(Args)>
            static JSValueRef function_call(JSContextRef ctx, JSObjectRef function,
                                            JSObjectRef thisObject,
                                            size_t argumentCount,
                                            const JSValueRef _arguments[],
                                            JSValueRef *exception) {

                PrivateStore *_private = get_private(thisObject);
                ObjectObserver *observer = _private->observer;
                IOCollection *collection = _private->collection;

                cb({ctx, observer, collection, argumentCount, _arguments});
                return JSValueMakeUndefined(ctx);
            }

            static JSValueRef _get(JSContextRef ctx, JSObjectRef object,
                                   JSStringRef propertyName, JSValueRef *exception) {

                std::string key = to_string(ctx, propertyName);
                IOCollection *collection = get_private(object)->collection;
                JSValueRef value = collection->get(ctx, key);
                return value;
            }

            static bool _set(JSContextRef ctx, JSObjectRef object,
                             JSStringRef propertyName, JSValueRef value,
                             JSValueRef *exception) {

                try{
                    std::string key = to_string(ctx, propertyName);
                    IOCollection *collection = get_private(object)->collection;
                    collection->set(ctx, key, value);

                }catch(InvalidTransactionException& error){
                    *exception = _throw_error(ctx, error.what());
                }

                return true;
            }

            static void dispose(JSObjectRef object) {
                PrivateStore *_private = get_private(object);
                if (_private->finalizer != nullptr) {
                    _private->finalizer();
                } else {
                    std::cout << "Warning: No finalizer was specified.";
                }
            }

            JSClassRef make_class() {
                methods.push_back({0});
                accessors.push_back({0});

                _class.staticValues = accessors.data();
                _class.staticFunctions = methods.data();

                return JSClassCreate(&_class);
            }

        public:
            JavascriptObject(JSContextRef _ctx, std::string name = "js_object")
                    : context{_ctx} {
                _class = kJSClassDefinitionEmpty;
                _class.className = name.c_str();
                _class.finalize = dispose;
                private_object = new PrivateStore{nullptr, nullptr, nullptr};
            }

            void dbg() {
                std::cout << "methods size: " << methods.size() << " \n";
                std::cout << "accessors size: " << accessors.size() << " \n";

#if REALM_ANDROID
                for(auto m: methods){
                    if(m.name != nullptr) {
                        std::cout << "method name: " << m.name << " \n";
                    }
                }

                __android_log_print(ANDROID_LOG_INFO, "RealmJS", "methods size: %d",
                                 (int)methods.size());
                __android_log_print(ANDROID_LOG_INFO, "RealmJS", "accessors size: %d",
                                 (int)accessors.size());
#endif
            }

            template<class VM,
                    void callback(Args),
                    class Data>
            void add_method(std::string name, Data *) {
                std::string *leak = new std::string{name};
                JSStaticFunction method_definition{leak->c_str(), function_call<callback>,
                                                   kJSPropertyAttributeDontEnum};
                methods.push_back(method_definition);
            }

            template<typename Accessor>
            void add_accessor(std::string name, IOCollection *) {
                std::string *leak = new std::string{name};
                JSStaticValue accessor_definition{leak->c_str(), _get, _set, kJSPropertyAttributeNone};
                accessors.push_back(accessor_definition);
            }

            void set_collection(IOCollection *collection) {
                private_object->collection = collection;
            }

            void set_observer(ObjectObserver *observer) {
                private_object->observer = observer;
            }

            JSObjectRef get_object() {
                auto class_instance = make_class();
                return JSObjectMake(context, class_instance, private_object);;
            }

            template<typename RemovalCallback>
            static void finalize(JSObjectRef object, RemovalCallback &&callback,
                                 void *_unused = nullptr) {
                /*
                 *  JSObject and Self only apply for NodeJS.
                 */
                PrivateStore *store = get_private(object);
                store->finalizer = std::move(callback);
                JSObjectSetPrivate(object, store);
            }
        };

    }  // namespace common
}