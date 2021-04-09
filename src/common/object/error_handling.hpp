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

#if REALM_PLATFORM_NODE



template <typename Error>
void _throw_error(Napi::Env env, Error& error){
    throw Napi::Error::New(env, error.what());
}
#else
inline JSValueRef _throw_error(JSContextRef ctx, const char* message) {
    JSStringRef _str = JSStringCreateWithUTF8CString(message);
    JSValueRef msg = JSValueMakeString(ctx, _str);
    return JSObjectMakeError(ctx, 1, &msg, NULL);
}
#endif

namespace realm{
    namespace js{

struct VM_Error {
    template <typename ContextType, typename Error>
    static void dispatch(ContextType context, Error& error){
        _throw_error(context, error);
    }
};

}
}