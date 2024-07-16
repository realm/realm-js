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
#include <jsi/jsi.h>

#include "jsi_init.h"
#include "react_scheduler.h"
#include "platform.hpp"
#include "jni_utils.hpp"

namespace jsi = facebook::jsi;

using namespace realm::jni_util;

jclass ssl_helper_class;

namespace realm {
// set the AssetManager used to access bundled files within the APK
void set_asset_manager(AAssetManager* assetManager);
} // namespace realm


JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*)
{
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

extern "C" JNIEXPORT void JNICALL Java_io_realm_react_RealmReactModule_injectModuleIntoJSGlobal(JNIEnv* env,
                                                                                                jobject thiz,
                                                                                                jlong runtime_pointer)
{

    __android_log_print(ANDROID_LOG_VERBOSE, "Realm", "install");
    auto runtime = reinterpret_cast<jsi::Runtime*>(runtime_pointer);
    if (runtime) {
        __android_log_print(ANDROID_LOG_VERBOSE, "Realm", "Building an exports object");
        auto exports = jsi::Object(*runtime);
        __android_log_print(ANDROID_LOG_VERBOSE, "Realm", "Initializing ...");
        realm_jsi_init(*runtime, exports);
        // Store this as a global for JavaScript to read
        runtime->global().setProperty(*runtime, "__injectedRealmBinding", exports);
    }
}

extern "C" JNIEXPORT void JNICALL Java_io_realm_react_RealmReactModule_setDefaultRealmFileDirectoryImpl(
    JNIEnv* env, jobject thiz, jstring file_dir, jobject asset_manager)
{

    __android_log_print(ANDROID_LOG_VERBOSE, "Realm", "setDefaultRealmFileDirectory");

    // Get the assetManager in case we want to copy files from the APK (assets)
    AAssetManager* assetManager = AAssetManager_fromJava(env, asset_manager);
    if (assetManager == NULL) {
        __android_log_print(ANDROID_LOG_ERROR, "Realm", "Error loading the AssetManager");
    }
    realm::set_asset_manager(assetManager);

    // Setting the internal storage path for the application
    const char* file_dir_utf = env->GetStringUTFChars(file_dir, NULL);
    realm::JsPlatformHelpers::set_default_realm_file_directory(file_dir_utf);
    env->ReleaseStringUTFChars(file_dir, file_dir_utf);

    __android_log_print(ANDROID_LOG_DEBUG, "Realm", "Absolute path: %s",
                        realm::JsPlatformHelpers::default_realm_file_directory().c_str());
}

extern "C" JNIEXPORT void JNICALL Java_io_realm_react_RealmReactModule_createScheduler(JNIEnv* env, jobject thiz,
                                                                                       jobject call_invoker)
{
    // React Native uses the fbjni library for handling JNI, which has the concept of "hybrid objects",
    // which are Java objects containing a pointer to a C++ object. The CallInvokerHolder, which has the
    // invokeAsync method we want access to, is one such hybrid object.
    // Rather than reworking our code to use fbjni throughout, this code unpacks the C++ object from the Java
    // object `callInvokerHolderJavaObj` manually, based on reverse engineering the fbjni code.

    // 1. Get the Java object referred to by the mHybridData field of the Java holder object
    auto callInvokerHolderClass = env->FindClass("com/facebook/react/turbomodule/core/CallInvokerHolderImpl");
    if (!env->IsInstanceOf(call_invoker, callInvokerHolderClass)) {
        throw std::invalid_argument("Expected call_invoker to be CallInvokerHolderImpl");
    }
    auto hybridDataField = env->GetFieldID(callInvokerHolderClass, "mHybridData", "Lcom/facebook/jni/HybridData;");
    auto hybridDataObj = env->GetObjectField(call_invoker, hybridDataField);

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

    // 5. Create the scheduler from the JS call invoker
    __android_log_print(ANDROID_LOG_VERBOSE, "Realm", "Creating scheduler");
    realm::js::react_scheduler::create_scheduler(nativePointer->getCallInvoker());
}

extern "C" JNIEXPORT void JNICALL Java_io_realm_react_RealmReactModule_invalidateCaches(JNIEnv* env, jobject thiz)
{
    __android_log_print(ANDROID_LOG_VERBOSE, "Realm", "Resetting scheduler");
    // Reset the scheduler to prevent invocations using an old runtime
    realm::js::react_scheduler::reset_scheduler();
    __android_log_print(ANDROID_LOG_VERBOSE, "Realm", "Invalidating caches");
#if DEBUG
    // Immediately close any open sync sessions to prevent race condition with new
    // JS thread when hot reloading
    realm_jsi_close_sync_sessions();
#endif
    realm_jsi_invalidate_caches();
}