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
#include <android/asset_manager_jni.h>
#include <jsi/jsi.h>

#include <jsi/jsi_init.h>
#include "platform.hpp"
#include "jni_utils.hpp"
#include "hack.hpp"

#include "io_realm_react_RealmReactModule.h"

namespace jsi = facebook::jsi;

using namespace realm::jni_util;

jclass ssl_helper_class;

namespace realm {    
    // set the AssetManager used to access bundled files within the APK
    void set_asset_manager(AAssetManager* assetManager);
}

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

JNIEXPORT void JNICALL Java_io_realm_react_RealmReactModule_setDefaultRealmFileDirectory
  (JNIEnv *env, jclass, jstring fileDir, jobject javaAssetManager)
{
    __android_log_print(ANDROID_LOG_VERBOSE, "JSRealm", "setDefaultRealmFileDirectory");

    // Get the assetManager in case we want to copy files from the APK (assets)
    AAssetManager *assetManager = AAssetManager_fromJava(env, javaAssetManager);
    if (assetManager == NULL) {
        __android_log_print(ANDROID_LOG_ERROR, "JSRealm", "Error loading the AssetManager");
    }
    realm::set_asset_manager(assetManager);

    // Setting the internal storage path for the application
    const char* strFileDir = env->GetStringUTFChars(fileDir, NULL);
    realm::set_default_realm_file_directory(strFileDir);
    env->ReleaseStringUTFChars(fileDir, strFileDir);

    __android_log_print(ANDROID_LOG_DEBUG, "JSRealm", "Absolute path: %s", realm::default_realm_file_directory().c_str());
}

JNIEXPORT void JNICALL Java_io_realm_react_RealmReactModule_install
  (JNIEnv *, jclass, jlong runtimePointer)
{
    __android_log_print(ANDROID_LOG_VERBOSE, "JSRealm", "install");
    auto runtime = reinterpret_cast<jsi::Runtime*>(runtimePointer);
    if (runtime) {
        __android_log_print(ANDROID_LOG_VERBOSE, "JSRealm", "Building an exports object");
        auto exports = jsi::Object(*runtime);
        __android_log_print(ANDROID_LOG_VERBOSE, "JSRealm", "Initializing ...");
        realm_hermes_init(*runtime, exports);
    }
}

JNIEXPORT void JNICALL Java_io_realm_react_RealmReactModule_invalidateCaches
  (JNIEnv *, jclass)
{
    __android_log_print(ANDROID_LOG_VERBOSE, "JSRealm", "invalidateCaches");
    realm_hermes_invalidate_caches();
}
