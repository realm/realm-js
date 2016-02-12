/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

#pragma once

#include <JavaScriptCore/JSBase.h>

#ifdef __cplusplus
extern "C" {
#endif

JSObjectRef RJSConstructorCreate(JSContextRef ctx);
void RJSInitializeInContext(JSContextRef ctx);
void RJSClearTestState(void);

#ifdef __cplusplus
}
#endif
