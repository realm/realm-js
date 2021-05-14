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
#include <fstream>
#include <iostream>
#include <sstream>
#include <vector>

#include "common/object/interfaces.hpp"

#pragma once
using namespace std;

struct JSC_VM {
    JSGlobalContextRef globalContext;
    JSContextGroupRef group;
    JSObjectRef globalObject;
    vector<JSStringRef> strings;

    JSC_VM() {
        group = JSContextGroupCreate();
        globalContext = JSGlobalContextCreateInGroup(group, nullptr);
        globalObject = JSContextGetGlobalObject(globalContext);
    }

    void set_obj_prop(std::string name, JSObjectRef fn) {
        JSStringRef _name = str(name);
        JSObjectSetProperty(globalContext, globalObject, _name, fn,
                            kJSPropertyAttributeNone, nullptr);
    }

    JSStringRef str(std::string str) {
        auto _str = JSStringCreateWithUTF8CString(str.c_str());
        strings.push_back(_str);
        return _str;
    }

    void load_into_vm(std::string file_name) {
        std::ifstream t(file_name);
        std::stringstream buffer;
        buffer << t.rdbuf();

        vm(buffer.str());
    }
    void vm(std::string&& script) {
        SECTION("Virtual machine should end in a clean state.")
        {
            auto _script = str(script);
            auto ret = JSEvaluateScript(globalContext, _script, nullptr, nullptr, 1, nullptr);
            REQUIRE(ret != NULL);
        }
    }

    static JSStringRef s(std::string str) {
        return JSStringCreateWithUTF8CString(str.c_str());
    }


    JSObjectRef make_gbl_fn(std::string&& fn_name, JSObjectCallAsFunctionCallback fn) {
        JSStringRef _fn_name = str(fn_name);
        JSObjectRef _fn =
            JSObjectMakeFunctionWithCallback(globalContext, _fn_name, fn);
        set_obj_prop(fn_name, _fn);
        return _fn;
    }

    ~JSC_VM() {
        for (auto str : strings) {
            JSStringRelease(str);
        }
        JSGlobalContextRelease(globalContext);
        JSContextGroupRelease(group);
    }
};

struct TestTools{

    static std::string __to_string(JSContextRef context, JSValueRef value) {
        std::string str;
        JSStringRef valueAsString = JSValueToStringCopy(context, value, NULL);
        size_t sizeUTF8 = JSStringGetMaximumUTF8CStringSize(valueAsString);
        str.reserve(sizeUTF8);
        JSStringGetUTF8CString(valueAsString, str.data(), sizeUTF8);
        JSStringRelease(valueAsString);
        return str;
    }

    static void Load(JSC_VM& vm){
        vm.make_gbl_fn("print", &TestTools::Print);
    }

    static JSValueRef Print(JSContextRef ctx, JSObjectRef function, JSObjectRef thisObject,
                     size_t argumentCount, const JSValueRef arguments[],
                     JSValueRef* exception) {

        std::string str = __to_string(ctx, arguments[0]);
        printf("printing: %s \n", str.c_str());
        return JSValueMakeUndefined(ctx);
    }

    template <void callback(std::string&)>
    static JSValueRef SimpleJSStringFunction(JSContextRef ctx, JSObjectRef function, JSObjectRef thisObject,
                            size_t argumentCount, const JSValueRef arguments[],
                            JSValueRef* exception) {

        std::string str = __to_string(ctx, arguments[0]);
        callback(str);
        return JSValueMakeUndefined(ctx);
    }

    template <void callback(bool)>
    static JSValueRef JSCAssertFunction(JSContextRef ctx, JSObjectRef function, JSObjectRef thisObject,
                                             size_t argumentCount, const JSValueRef arguments[],
                                             JSValueRef* exception) {

        callback(JSValueToBoolean(ctx, arguments[0]));
        return JSValueMakeUndefined(ctx);
    }

    template <void callback(double)>
    static JSValueRef JSCAssertFunction(JSContextRef ctx, JSObjectRef function, JSObjectRef thisObject,
                                        size_t argumentCount, const JSValueRef arguments[],
                                        JSValueRef* exception) {

        double ret = JSValueToNumber(ctx, arguments[0], exception);
        callback(ret);
        return JSValueMakeUndefined(ctx);
    }
};


struct AccessorsTest {
    IOCollection *N;

    template <typename ContextType>
    auto get(ContextType context, std::string key_name) {
        return N->get(context, key_name);
    }

    template <typename ContextType, typename ValueType>
    auto set(ContextType context, std::string key_name, ValueType value) {
       N->set(context, key_name, value);
    }
};


