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

#include "common/object/jsc_object.hpp"

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

    void set_obj_prop(JSStringRef str, JSObjectRef fn) {
        JSObjectSetProperty(globalContext, globalObject, str, fn,
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
        auto _script = str(script);
        JSEvaluateScript(globalContext, _script, nullptr, nullptr, 1, nullptr);
    }

    static JSStringRef s(std::string str) {
        return JSStringCreateWithUTF8CString(str.c_str());
    }

    template <typename FN>
    JSObjectRef make_gbl_fn(std::string&& fn_name, FN* fn) {
        JSStringRef _fn_name = str(fn_name);
        JSObjectRef _fn =
            JSObjectMakeFunctionWithCallback(globalContext, _fn_name, fn);
        set_obj_prop(_fn_name, _fn);
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

template <typename Collection>
struct AccessorsTest {
    Collection N = 50;

    template <typename ContextType>
    auto get(ContextType context, std::string key_name) {
        return JSValueMakeNumber(context, N);
    }

    template <typename ContextType, typename ValueType>
    auto set(ContextType context, std::string key_name, ValueType value) {
        JSValueRef exception = nullptr;
        N = JSValueToNumber(context, value, &exception);
    }
};


