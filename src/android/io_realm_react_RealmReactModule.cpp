////////////////////////////////////////////////////////////////////////////
//
// Copyright 2016 Realm Inc.
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

#include <jni.h>
#include <android/log.h>

#include "io_realm_react_RealmReactModule.h"
#include "rpc.hpp"
#include "platform.hpp"

static realm_js::RPCServer *s_rpc_server;
extern bool realmContextInjected;

JNIEXPORT void JNICALL Java_io_realm_react_RealmReactModule_setDefaultRealmFileDirectory
  (JNIEnv *env, jclass, jstring fileDir)
{
    __android_log_print(ANDROID_LOG_VERBOSE, "JSRealm", "setDefaultRealmFileDirectory");

    // Setting the internal storage path for the application
    const char* strFileDir = env->GetStringUTFChars(fileDir, NULL);
    realm::set_default_realm_file_directory(strFileDir);
    env->ReleaseStringUTFChars(fileDir, strFileDir);

    __android_log_print(ANDROID_LOG_DEBUG, "JSRealm", "Absolute path: %s", realm::default_realm_file_directory().c_str());
}

JNIEXPORT jlong JNICALL Java_io_realm_react_RealmReactModule_setupChromeDebugModeRealmJsContext
  (JNIEnv *, jclass)
{
    __android_log_print(ANDROID_LOG_VERBOSE, "JSRealm", "setupChromeDebugModeRealmJsContext");
    if (s_rpc_server) {
        delete s_rpc_server;
    }
    s_rpc_server = new realm_js::RPCServer();
    return (jlong)s_rpc_server;
}

JNIEXPORT jstring JNICALL Java_io_realm_react_RealmReactModule_processChromeDebugCommand
  (JNIEnv *env, jclass, jstring chrome_cmd, jstring chrome_args)
{
    const char* cmd = env->GetStringUTFChars(chrome_cmd, NULL);
    const char* args = env->GetStringUTFChars(chrome_args, NULL);
    realm_js::json json = realm_js::json::parse(args);
    realm_js::json response = s_rpc_server->perform_request(cmd, json);
    env->ReleaseStringUTFChars(chrome_cmd, cmd);
    env->ReleaseStringUTFChars(chrome_args, args);
    return env->NewStringUTF(response.dump().c_str());
}

JNIEXPORT jboolean JNICALL Java_io_realm_react_RealmReactModule_isContextInjected
    (JNIEnv *env, jclass)
{
    return realmContextInjected;
}

JNIEXPORT void JNICALL Java_io_realm_react_RealmReactModule_clearContextInjectedFlag
  (JNIEnv *env, jclass)
{
    realmContextInjected = false;
}
