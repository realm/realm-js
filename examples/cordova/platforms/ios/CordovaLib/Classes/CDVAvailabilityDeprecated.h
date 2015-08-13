/*
 Licensed to the Apache Software Foundation (ASF) under one
 or more contributor license agreements.  See the NOTICE file
 distributed with this work for additional information
 regarding copyright ownership.  The ASF licenses this file
 to you under the Apache License, Version 2.0 (the
 "License"); you may not use this file except in compliance
 with the License.  You may obtain a copy of the License at
 
 http://www.apache.org/licenses/LICENSE-2.0
 
 Unless required by applicable law or agreed to in writing,
 software distributed under the License is distributed on an
 "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 KIND, either express or implied.  See the License for the
 specific language governing permissions and limitations
 under the License.
 */


#import <UIKit/UIKit.h>

#ifdef __clang__
#define CDV_DEPRECATED(version, msg) __attribute__((deprecated("Deprecated in Cordova " #version ". " msg)))
#else
#define CDV_DEPRECATED(version, msg) __attribute__((deprecated()))
#endif

static inline BOOL CDV_IsIPad(void) CDV_DEPRECATED(3.7.0, "This will be removed in 4.0.0");
static inline BOOL CDV_IsIPhone5(void) CDV_DEPRECATED(3.7.0, "This will be removed in 4.0.0");

static inline BOOL CDV_IsIPad(void) {
    return [[UIDevice currentDevice] respondsToSelector:@selector(userInterfaceIdiom)] && [[UIDevice currentDevice] userInterfaceIdiom] == UIUserInterfaceIdiomPad;
}

static inline BOOL CDV_IsIPhone5(void) {
    return ([[UIScreen mainScreen] bounds].size.width == 568 && [[UIScreen mainScreen] bounds].size.height == 320) || ([[UIScreen mainScreen] bounds].size.height == 568 && [[UIScreen mainScreen] bounds].size.width == 320);
}