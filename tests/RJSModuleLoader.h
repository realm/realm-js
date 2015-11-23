/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

#import <Foundation/Foundation.h>
#import <JavaScriptCore/JavaScriptCore.h>

@interface RJSModuleLoader : NSObject

- (instancetype)initWithContext:(JSContext *)context;

- (void)addGlobalModuleObject:(id)object forName:(NSString *)name;

- (JSValue *)loadModuleFromURL:(NSURL *)url error:(NSError **)error;
- (JSValue *)loadJSONFromURL:(NSURL *)url error:(NSError **)error;

@end
