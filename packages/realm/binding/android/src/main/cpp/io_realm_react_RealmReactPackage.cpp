#include <__config>
#include <jni.h>

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

#include <android/log.h>
#include <android/asset_manager_jni.h>

#include <ReactCommon/CallInvoker.h>

#if RCT_NEW_ARCH_ENABLED
#include <ReactCommon/CxxTurboModuleUtils.h>
#include "NativeRealmModule.h"
#else
#include <ReactCommon/CallInvokerHolder.h>
#endif

#include "jsi_init.h"
#include "platform.hpp"

namespace react = facebook::react;

namespace realm::js {
    // set the AssetManager used to access bundled files within the APK
    void set_asset_manager(AAssetManager* assetManager);
#if not RCT_NEW_ARCH_ENABLED
    // Keep track of whether we are already waiting for the React Native UI queue to be flushed asynchronously
    bool waiting_for_ui_flush = false;
#endif
}

extern "C"
JNIEXPORT void JNICALL
Java_io_realm_react_RealmReactPackage_setDefaultRealmFileDirectory(JNIEnv *env, jclass clazz,
                                                                   jstring file_dir,
                                                                   jobject assets) {

    __android_log_print(ANDROID_LOG_VERBOSE, "Realm", "setDefaultRealmFileDirectory");

    // Get the assetManager in case we want to copy files from the APK (assets)
    AAssetManager* assetManager = AAssetManager_fromJava(env, assets);
    if (assetManager == NULL) {
        __android_log_print(ANDROID_LOG_ERROR, "Realm", "Error loading the AssetManager");
    }
    realm::js::set_asset_manager(assetManager);

    // Setting the internal storage path for the application
    const char* strFileDir = env->GetStringUTFChars(file_dir, NULL);
    realm::js::JsPlatformHelpers::set_default_realm_file_directory(strFileDir);
    env->ReleaseStringUTFChars(file_dir, strFileDir);

    __android_log_print(ANDROID_LOG_DEBUG, "Realm", "Absolute path: %s",
                        realm::js::JsPlatformHelpers::default_realm_file_directory().c_str());
}

#if RCT_NEW_ARCH_ENABLED

extern "C"
JNIEXPORT void JNICALL
Java_io_realm_react_RealmReactPackage_registerModule(JNIEnv *env, jclass clazz) {
#if RCT_NEW_ARCH_ENABLED
    __android_log_print(ANDROID_LOG_VERBOSE, "Realm", "Registering native module");
    react::registerCxxModuleToGlobalModuleMap("Realm", [](std::shared_ptr<react::CallInvoker> js_invoker) {
        __android_log_print(ANDROID_LOG_VERBOSE, "Realm", "Constructing native module");
        return std::make_shared<realm::js::NativeRealmModule>(js_invoker);
    });
#endif
}

#else

extern "C"
JNIEXPORT void JNICALL
Java_io_realm_react_RealmReactPackage_injectModuleIntoJSGlobal(JNIEnv *env, jclass clazz,
                                                               jlong runtime_pointer) {

    __android_log_print(ANDROID_LOG_VERBOSE, "Realm", "Injecting module into JS global");
    auto runtime = reinterpret_cast<jsi::Runtime*>(runtime_pointer);
    if (!runtime) {
        return;
    }

    auto exports = jsi::Object(*runtime);
    realm_jsi_init(*runtime, exports);
    runtime->global().setProperty(*runtime, "__injectedRealmBinding", exports);
}

extern "C"
JNIEXPORT void JNICALL
Java_io_realm_react_RealmReactPackage_injectCallInvoker(JNIEnv *env, jclass clazz,
                                                         jobject call_invoker) {
    __android_log_print(ANDROID_LOG_VERBOSE, "Realm", "Getting JS call invoker");
    // React Native uses the fbjni library for handling JNI, which has the concept of "hybrid objects",
    // which are Java objects containing a pointer to a C++ object. The CallInvokerHolder, which has the
    // invokeAsync method we want access to, is one such hybrid object.
    // Rather than reworking our code to use fbjni throughout, this code unpacks the C++ object from the Java
    // object `callInvokerHolderJavaObj` manually, based on reverse engineering the fbjni code.

    // 1. Get the Java object referred to by the mHybridData field of the Java holder object
    auto callInvokerHolderClass = env->GetObjectClass(call_invoker);
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

    // 5. Store the JS call invoker for the workaround to use
    realm::js::flush_ui_workaround::inject_js_call_invoker(nativePointer->getCallInvoker());
}

extern "C"
JNIEXPORT void JNICALL
Java_io_realm_react_RealmReactPackage_invalidateCaches(JNIEnv *env, jclass clazz) {
    // Disable the flush ui workaround
    realm::js::flush_ui_workaround::reset_js_call_invoker();
    __android_log_print(ANDROID_LOG_VERBOSE, "Realm", "Invalidating caches");
#if DEBUG
    realm_jsi_close_sync_sessions();
#endif
    realm_jsi_invalidate_caches();
}

#endif
