/* Copyright 2016 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

#include <jni.h>
#include <android/log.h>

#include "io_realm_react_RealmReactModule.h"
#include "rpc.hpp"
#include "platform.hpp"

static realm_js::RPCServer *s_rpc_server;

JNIEXPORT void JNICALL Java_io_realm_react_RealmReactModule_setDefaultRealmFileDirectory
  (JNIEnv *env, jclass, jstring fileDir)
{
    __android_log_print(ANDROID_LOG_VERBOSE, "JSRealm", "setDefaultRealmFileDirectory");

    // Setting the internal storage path for the application
    const char* strFileDir = env->GetStringUTFChars(fileDir, NULL);
    realm::set_default_realm_file_directory(strFileDir);
    env->ReleaseStringUTFChars(fileDir , strFileDir);

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
    __android_log_print(ANDROID_LOG_VERBOSE, "JSRealm", "processChromeDebugCommand");
    const char* cmd = env->GetStringUTFChars(chrome_cmd, NULL);
    const char* args = env->GetStringUTFChars(chrome_args, NULL);
    realm_js::json json = realm_js::json::parse(args);
    realm_js::json response = s_rpc_server->perform_request(cmd, json);
    env->ReleaseStringUTFChars(chrome_cmd, cmd);
    env->ReleaseStringUTFChars(chrome_args, args);
    return env->NewStringUTF(response.dump().c_str());
}
