/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

#import <Foundation/Foundation.h>
#import <JavaScriptCore/JavaScriptCore.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef void (^RealmReactEventHandler)(id message);

JSGlobalContextRef RealmReactGetJSGlobalContextForExecutor(id executor, bool create);

@interface RealmReact : NSObject

- (void)addListenerForEvent:(NSString *)eventName handler:(RealmReactEventHandler)handler;
- (void)removeListenerForEvent:(NSString *)eventName handler:(RealmReactEventHandler)handler;

@end

#ifdef __cplusplus
}
#endif
