/* Copyright 2016 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

#include <jni.h>
#include <dlfcn.h>
#include <iostream>
#include <sstream>

#include "io_realm_react_RealmReactAndroid.h"
#include "js_init.h"
#include "rpc.hpp"
#include "platform.hpp"
#include "shared_realm.hpp"
#include <unordered_map>
#include <android/log.h>

namespace facebook {
    namespace react {
        class JSCExecutor;
    }
}

/*
 * Class:     io_realm_react_RealmReactAndroid
 * Method:    injectRealmJsContext
 * Signature: ()Ljava/lang/String;
 */
JNIEXPORT jlong JNICALL Java_io_realm_react_RealmReactAndroid_injectRealmJsContext
  (JNIEnv *env, jclass, jstring fileDir)
  {
  	__android_log_print(ANDROID_LOG_DEBUG, "JSRealm", "Java_io_realm_react_RealmReactAndroid_injectRealmJsContext");
  	void* handle = dlopen ("libreactnativejni.so", RTLD_LAZY);
  	if (!handle) {
  	  __android_log_print(ANDROID_LOG_ERROR, "JSRealm", "Cannot open libreactnativejni.so");
      return -1;
    }

    // Getting the internal storage path for the application
    const char* strFileDir = env->GetStringUTFChars(fileDir , NULL);
    realm::set_default_realm_file_directory(strFileDir);
    env->ReleaseStringUTFChars(fileDir , strFileDir);

    // load the symbol
	typedef std::unordered_map<JSContextRef, facebook::react::JSCExecutor*> (*get_jsc_context_t)();

	get_jsc_context_t get_jsc_context = (get_jsc_context_t) dlsym(handle, "get_jsc_context");

	  if (get_jsc_context != NULL) {
      // clearing previous instances
      realm::Realm::s_global_cache.clear();
	  	std::unordered_map<JSContextRef, facebook::react::JSCExecutor*> s_globalContextRefToJSCExecutor = get_jsc_context();
        for (auto pair : s_globalContextRefToJSCExecutor) {
          RJSInitializeInContext(pair.first);
        }
        return s_globalContextRefToJSCExecutor.size();
	  } else {
	    __android_log_print(ANDROID_LOG_ERROR, "JSRealm", "Cannot find symbol get_jsc_context");
        return -1;
	  }
  }

/*
 * Class:     io_realm_react_RealmReactAndroid
 * Method:    setupChromeDebugModeRealmJsContext
 */
  static realm_js::RPCServer *s_rpc_server;
  JNIEXPORT jlong JNICALL Java_io_realm_react_RealmReactAndroid_setupChromeDebugModeRealmJsContext
  (JNIEnv *, jclass)
  {
    __android_log_print(ANDROID_LOG_VERBOSE, "JSRealm", "Java_com_reacttests_RealmReactAndroid_setupChromeDebugModeRealmJsContext");
    if (s_rpc_server) {
      delete s_rpc_server;
    }
    s_rpc_server = new realm_js::RPCServer();
    return (jlong)s_rpc_server;
  }

/*
 * Class:     io_realm_react_RealmReactAndroid
 * Method:    processChromeDebugCommand
 */

  JNIEXPORT jstring JNICALL Java_io_realm_react_RealmReactAndroid_processChromeDebugCommand
  (JNIEnv *env, jclass, jlong rpc_server_ptr, jstring chrome_cmd, jstring chrome_args)
  {
    __android_log_print(ANDROID_LOG_VERBOSE, "JSRealm", "Java_io_realm_react_RealmReactAndroid_processChromeDebugCommand");
    const char* cmd = env->GetStringUTFChars(chrome_cmd, NULL);
    const char* args = env->GetStringUTFChars(chrome_args, NULL);
    realm_js::json json = realm_js::json::parse(args);
    realm_js::json response = s_rpc_server->perform_request(cmd, json);
    env->ReleaseStringUTFChars(chrome_cmd, cmd);
    env->ReleaseStringUTFChars(chrome_args, args);
    return env->NewStringUTF(response.dump().c_str());
  }
