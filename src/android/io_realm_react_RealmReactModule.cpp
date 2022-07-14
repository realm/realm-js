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
#include <fbjni/fbjni.h>
#include <ReactCommon/CallInvokerHolder.h>
#include <android/log.h>
#include <android/asset_manager_jni.h>

#include "io_realm_react_RealmReactModule.h"
#include "rpc.hpp"
#include "platform.hpp"
#include "jni_utils.hpp"
#include "jsc_externs.hpp"
#include "hack.hpp"

using namespace realm::rpc;
using namespace realm::jni_util;

static RPCServer* s_rpc_server;
extern bool realmContextInjected;
jclass ssl_helper_class;

namespace realm {
// set the AssetManager used to access bundled files within the APK
void set_asset_manager(AAssetManager* assetManager);
// Keep track of whether we are already waiting for the React Native UI queue 
// to be flushed asynchronously
bool waiting_for_ui_flush = false;
} // namespace realm


JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*)
{
    // Workaround for some known bugs in system calls on specific devices.
    hack_init();

    JNIEnv* env;
    if (vm->GetEnv((void**)&env, JNI_VERSION_1_6) != JNI_OK) {
        return JNI_ERR;
    }
    else {
        JniUtils::initialize(vm, JNI_VERSION_1_6);
    }

    // We do lookup the class in this Thread, since FindClass sometimes fails
    // when issued from the sync client thread
    ssl_helper_class = reinterpret_cast<jclass>(env->NewGlobalRef(env->FindClass("io/realm/react/util/SSLHelper")));

    return JNI_VERSION_1_6;
}

JNIEXPORT void JNI_OnUnload(JavaVM* vm, void*)
{
    JNIEnv* env;
    if (vm->GetEnv((void**)&env, JNI_VERSION_1_6) != JNI_OK) {
        return;
    }
    else {
        env->DeleteLocalRef(ssl_helper_class);
        JniUtils::release();
    }
}

JNIEXPORT void JNICALL Java_io_realm_react_RealmReactModule_setDefaultRealmFileDirectory(JNIEnv* env, jobject,
                                                                                         jstring fileDir,
                                                                                         jobject javaAssetManager)
{
    __android_log_print(ANDROID_LOG_VERBOSE, "JSRealm", "setDefaultRealmFileDirectory");

    // Get the assetManager in case we want to copy files from the APK (assets)
    AAssetManager* assetManager = AAssetManager_fromJava(env, javaAssetManager);
    if (assetManager == NULL) {
        __android_log_print(ANDROID_LOG_ERROR, "JSRealm", "Error loading the AssetManager");
    }
    realm::set_asset_manager(assetManager);

    // Setting the internal storage path for the application
    const char* strFileDir = env->GetStringUTFChars(fileDir, NULL);
    realm::set_default_realm_file_directory(strFileDir);
    env->ReleaseStringUTFChars(fileDir, strFileDir);

    __android_log_print(ANDROID_LOG_DEBUG, "JSRealm", "Absolute path: %s",
                        realm::default_realm_file_directory().c_str());
}

JNIEXPORT jlong JNICALL Java_io_realm_react_RealmReactModule_setupChromeDebugModeRealmJsContext(JNIEnv*, jobject)
{
    __android_log_print(ANDROID_LOG_VERBOSE, "JSRealm", "setupChromeDebugModeRealmJsContext");
    if (s_rpc_server) {
        delete s_rpc_server;
    }
    s_rpc_server = new RPCServer();
    return (jlong)s_rpc_server;
}

JNIEXPORT jstring JNICALL Java_io_realm_react_RealmReactModule_processChromeDebugCommand(JNIEnv* env, jobject,
                                                                                         jstring chrome_cmd,
                                                                                         jstring chrome_args)
{
    const char* cmd = env->GetStringUTFChars(chrome_cmd, NULL);
    const char* args = env->GetStringUTFChars(chrome_args, NULL);
    std::string response = s_rpc_server->perform_request(cmd, args);
    env->ReleaseStringUTFChars(chrome_cmd, cmd);
    env->ReleaseStringUTFChars(chrome_args, args);
    return env->NewStringUTF(response.c_str());
}

JNIEXPORT jboolean JNICALL Java_io_realm_react_RealmReactModule_tryRunTask(JNIEnv* env, jobject)
{
    jboolean result = s_rpc_server->try_run_task();
    return result;
}

JNIEXPORT jboolean JNICALL Java_io_realm_react_RealmReactModule_isContextInjected(JNIEnv* env, jobject)
{
    return realmContextInjected;
}

JNIEXPORT void JNICALL Java_io_realm_react_RealmReactModule_clearContextInjectedFlag(JNIEnv* env, jobject)
{
    realmContextInjected = false;
}

// Setup the flush_ui_queue function we use to flush the React Native UI queue whenever we call from C++ to JS.
// See RealmReact.mm's setBridge method for details, this is the equivalent for Android.
JNIEXPORT void JNICALL Java_io_realm_react_RealmReactModule_setupFlushUiQueue(JNIEnv* env, jobject,
                                                                              jobject callInvokerHolderJavaObj)
{
    // React Native uses the fbjni library for handling JNI, which has the concept of "hybrid objects",
    // which are Java objects containing a pointer to a C++ object. The CallInvokerHolder, which has the
    // invokeAsync method we want access to, is one such hybrid object.
    // Rather than reworking our code to use fbjni throughout, this code unpacks the C++ object from the Java
    // object `callInvokerHolderJavaObj` manually, based on reverse engineering the fbjni code.

    // 1. Get the Java object referred to by the mHybridData field of the Java holder object
    auto callInvokerHolderClass = env->GetObjectClass(callInvokerHolderJavaObj);
    auto hybridDataField = env->GetFieldID(callInvokerHolderClass, "mHybridData", "Lcom/facebook/jni/HybridData;");
    auto hybridDataObj = env->GetObjectField(callInvokerHolderJavaObj, hybridDataField);

    // 2. Get the destructor Java object referred to by the mDestructor field from the myHybridData Java object
    auto hybridDataClass = env->FindClass("com/facebook/jni/HybridData");
    auto destructorField =
        env->GetFieldID(hybridDataClass, "mDestructor", "Lcom/facebook/jni/HybridData$Destructor;");
    auto destructorObj = env->GetObjectField(hybridDataObj, destructorField);

    // 3. Get the mNativePointer field from the mDestructor Java object
    auto destructorClass = env->FindClass("com/facebook/jni/HybridData$Destructor");
    auto nativePointerField = env->GetFieldID(destructorClass, "mNativePointer", "J");
    auto nativePointerValue = env->GetLongField(destructorObj, nativePointerField);

    // 4. Cast the mNativePointer back to its C++ type
    auto nativePointer = reinterpret_cast<facebook::react::CallInvokerHolder*>(nativePointerValue);

    realm::js::flush_ui_queue = [=]() {
        if (!realm::waiting_for_ui_flush) {
            realm::waiting_for_ui_flush = true;
            nativePointer->getCallInvoker()->invokeAsync([]() {
                realm::waiting_for_ui_flush = false;
            });
        }
    };
}
