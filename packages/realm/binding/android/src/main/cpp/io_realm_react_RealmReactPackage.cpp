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

#include <ReactCommon/CxxTurboModuleUtils.h>

#include "platform.hpp"
#include "NativeRealmModule.h"

namespace react = facebook::react;

namespace realm {
    // set the AssetManager used to access bundled files within the APK
    void set_asset_manager(AAssetManager* assetManager);
}

extern "C"
JNIEXPORT void JNICALL
Java_io_realm_react_RealmReactPackage_registerModule(JNIEnv *env, jclass clazz) {
    __android_log_print(ANDROID_LOG_VERBOSE, "Realm", "Registering native module");
    react::registerCxxModuleToGlobalModuleMap("Realm", [&](std::shared_ptr<react::CallInvoker> js_invoker) {
        __android_log_print(ANDROID_LOG_VERBOSE, "Realm", "Constructing native module");
        return std::make_shared<realm::NativeRealmModule>(js_invoker);
    });
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
    realm::set_asset_manager(assetManager);

    // Setting the internal storage path for the application
    const char* strFileDir = env->GetStringUTFChars(file_dir, NULL);
    realm::JsPlatformHelpers::set_default_realm_file_directory(strFileDir);
    env->ReleaseStringUTFChars(file_dir, strFileDir);

    __android_log_print(ANDROID_LOG_DEBUG, "Realm", "Absolute path: %s",
                        realm::JsPlatformHelpers::default_realm_file_directory().c_str());
}

extern "C"
JNIEXPORT void JNICALL
Java_io_realm_react_RealmReactPackage_invalidateCaches(JNIEnv *env, jclass clazz) {
    __android_log_print(ANDROID_LOG_VERBOSE, "Realm", "Invalidating caches (currently no-op)");
}