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
#include "common/object/jsc_object.hpp"
#include <iostream>
#include <vector>
#pragma once
using namespace std;

struct JSC_VM {
    JSGlobalContextRef globalContext;
    JSContextGroupRef group;
    JSObjectRef globalObject;
    vector<JSStringRef> strings;

    JSC_VM(){
        group = JSContextGroupCreate();
        globalContext =
                JSGlobalContextCreateInGroup(group, nullptr);
        globalObject = JSContextGetGlobalObject(globalContext);
    }

    template <typename JStr, typename FN >
    void set_obj_prop(JStr str, FN fn){
        JSObjectSetProperty(globalContext, globalObject, str,
                            fn, kJSPropertyAttributeNone, nullptr);
    }

    JSStringRef str(std::string str){
        auto _str = JSStringCreateWithUTF8CString(str.c_str());
        strings.push_back(_str);
        return _str;
    }

    void vm(std::string&& script){
        auto _script = str(script);
        JSEvaluateScript(globalContext, _script, nullptr, nullptr, 1,
                         nullptr);
    }

    static JSStringRef s(std::string str){
        return JSStringCreateWithUTF8CString(str.c_str());
    }

    //make

    ~JSC_VM(){
        for(auto str: strings){
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
        return N;
    }

    template <typename ContextType, typename ValueType>
    auto set(ContextType context, std::string key_name, ValueType value) {
        JSValueRef exception = nullptr;
        N = JSValueToNumber(context, value, &exception);
    }
};

struct Mth{
    static void method(JSContextRef& context, JSValueRef value) {
        cout << "test! \n";
    }
};


