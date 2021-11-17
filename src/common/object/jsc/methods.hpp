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


#include "common/object/observer.hpp"
#include "common/collection.hpp"

namespace JSCUtil {
struct Error {
    static JSValueRef handle(JSContextRef context, std::string&& message)
    {
        JSStringRef _str = JSStringCreateWithUTF8CString(message.c_str());
        JSValueRef msg = JSValueMakeString(context, _str);
        return JSObjectMakeError(context, 1, &msg, NULL);
    }
};
}; // namespace JSCUtil

namespace method {
struct Arguments {
    JSContextRef context;
    ObjectObserver* observer = nullptr;
    IOCollection* collection = nullptr;
    size_t argumentCount;
    const JSValueRef* values{nullptr};
    JSValueRef* exception;

    JSValueRef get(int index, std::string msg = "Missing argument for method call.")
    {
        if (index >= argumentCount) {
            throw std::runtime_error(msg);
        }

        return values[index];
    }

    void throw_error(std::string&& message)
    {
        *exception = JSCUtil::Error::handle(context, std::move(message));
    }
};

}; // namespace method

namespace accessor {
struct Arguments {
    JSContextRef context;
    JSObjectRef object;
    std::string property_name;
    JSValueRef value;
    JSValueRef* exception;

    void throw_error(std::string&& message)
    {
        *exception = JSCUtil::Error::handle(context, std::move(message));
    }
};
}; // namespace accessor
