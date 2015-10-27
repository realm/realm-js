/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

#import <Foundation/Foundation.h>
#import <JavaScriptCore/JavaScriptCore.h>

extern JSGlobalContextRef RealmReactGetJSGlobalContextForExecutor(id executor, bool create);

@interface RealmReact : NSObject

@end
