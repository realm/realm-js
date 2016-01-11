/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

#pragma once

#include <JavaScriptCore/JSBase.h>
#include <string>

#ifdef __cplusplus
extern "C" {
#endif

JSObjectRef RJSConstructorCreate(JSContextRef ctx);
void RJSInitializeInContext(JSContextRef ctx);
void RJSInitializeInContextUsingPath(JSContextRef ctx, std::string path);
void RJSClearTestState(void);

extern std::string appFilesDir;

#ifdef __cplusplus
}
#endif
