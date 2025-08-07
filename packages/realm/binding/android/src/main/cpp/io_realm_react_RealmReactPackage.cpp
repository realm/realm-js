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
#include <ReactCommon/CxxTurboModuleUtils.h>
#include <android/log.h>
#include <android/asset_manager_jni.h>
#include <jsi/jsi.h>

#include "CxxRealmModule.hpp"
#include "jsi_init.h"
#include "react_scheduler.h"
#include "platform.hpp"
#include "jni_utils.hpp"

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

    facebook::react::registerCxxModuleToGlobalModuleMap(
        realm::js::CxxRealmModule::kModuleName, [](std::shared_ptr<facebook::react::CallInvoker> jsInvoker) {
            return std::make_shared<realm::js::CxxRealmModule>(jsInvoker);
        });

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

extern "C" JNIEXPORT void JNICALL Java_io_realm_react_RealmReactPackage_setDefaultRealmFileDirectoryImpl(
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
