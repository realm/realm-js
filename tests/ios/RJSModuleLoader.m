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

#import "RJSModuleLoader.h"

static NSString * const RJSModuleLoaderErrorDomain = @"RJSModuleLoaderErrorDomain";

@interface RJSModuleLoader ()

@property (nonatomic, strong) JSContext *context;
@property (nonatomic, strong) NSMutableDictionary *modules;
@property (nonatomic, strong) NSMutableDictionary *globalModules;

@end

@implementation RJSModuleLoader

- (instancetype)initWithContext:(JSContext *)context {
    self = [super init];
    if (!self) {
        return nil;
    }

    _context = context;
    _modules = [[NSMutableDictionary alloc] init];
    _globalModules = [[NSMutableDictionary alloc] init];

    return self;
}

- (void)addGlobalModuleObject:(id)object forName:(NSString *)name {
    self.globalModules[name] = [JSValue valueWithObject:object inContext:self.context];
}

- (JSValue *)loadModule:(NSString *)name relativeToURL:(NSURL *)baseURL error:(NSError **)error {
    if (![name hasPrefix:@"./"] && ![name hasPrefix:@"../"]) {
        return [self loadGlobalModule:name relativeToURL:baseURL error:error];
    }

    NSURL *url = [[NSURL URLWithString:name relativeToURL:baseURL] absoluteURL];
    BOOL isDirectory;

    if ([[NSFileManager defaultManager] fileExistsAtPath:url.path isDirectory:&isDirectory] && isDirectory) {
        url = [url URLByAppendingPathComponent:@"index.js"];
    } else {
        if ([[url pathExtension] isEqualToString:@"json"]) {
            return [self loadJSONFromURL:url error:error];
        }
        else if ([[url pathExtension] length] == 0) {
            url = [url URLByAppendingPathExtension:@"js"];
        }
        else {
            return nil;
        }
    }

    return [self loadModuleFromURL:url error:error];
}

- (JSValue *)loadModuleFromURL:(NSURL *)url error:(NSError **)error {
    url = url.absoluteURL;
    url = url.standardizedURL ?: url;
    if (url.pathExtension.length == 0) {
        url = [url URLByAppendingPathExtension:@"js"];
    }

    NSString *path = url.path;
    JSValue *exports = self.modules[path];
    if (exports) {
        return exports;
    }

    NSString *source = [NSString stringWithContentsOfURL:url usedEncoding:NULL error:error];
    if (!source) {
        return nil;
    }

    JSContext *context = self.context;
    JSValue *module = [JSValue valueWithNewObjectInContext:context];

    exports = [JSValue valueWithNewObjectInContext:context];
    module[@"exports"] = exports;

    __weak __typeof__(self) weakSelf = self;

    JSValue *require = [JSValue valueWithObject:^JSValue *(NSString *name) {
        NSError *error;
        JSValue *result = [weakSelf loadModule:name relativeToURL:url error:&error];

        if (!result) {
            NSString *message = [NSString stringWithFormat:@"Error requiring module '%@': %@", name, error ?: @"Not found"];
            JSContext *context = [JSContext currentContext];

            context.exception = [JSValue valueWithNewErrorFromMessage:message inContext:context];
            return nil;
        }

        return result;
    } inContext:context];

    JSStringRef jsParameterNames[] = {JSStringCreateWithUTF8CString("module"), JSStringCreateWithUTF8CString("exports"), JSStringCreateWithUTF8CString("require")};
    JSStringRef jsSource = JSStringCreateWithCFString((__bridge CFStringRef)source);
    JSStringRef jsSourceURL = JSStringCreateWithCFString((__bridge CFStringRef)path);

    JSValueRef jsException;
    JSObjectRef jsModuleFunction = JSObjectMakeFunction(context.JSGlobalContextRef, NULL, 3, jsParameterNames, jsSource, jsSourceURL, 1, &jsException);

    JSStringRelease(jsParameterNames[0]);
    JSStringRelease(jsParameterNames[1]);
    JSStringRelease(jsParameterNames[2]);
    JSStringRelease(jsSource);
    JSStringRelease(jsSourceURL);

    // Start with the original exports for circular dependendies and in case of an error.
    self.modules[path] = exports;

    JSValue *exception;

    if (jsModuleFunction) {
        JSValue *moduleFunction = [JSValue valueWithJSValueRef:jsModuleFunction inContext:context];
        [moduleFunction callWithArguments:@[module, exports, require]];

        exception = context.exception;
    } else {
        exception = [JSValue valueWithJSValueRef:jsException inContext:context];
    }

    exports = module[@"exports"];
    self.modules[path] = exports;

    if (exception) {
        *error = [NSError errorWithDomain:RJSModuleLoaderErrorDomain code:1 userInfo:@{
            NSLocalizedDescriptionKey: exception.description,
            NSURLErrorKey: url,
            @"JSException": exception,
        }];

        return nil;
    }
    
    return exports;
}

- (JSValue *)loadJSONFromURL:(NSURL *)url error:(NSError **)error {
    url = url.absoluteURL;
    url = url.standardizedURL ?: url;
    if (url.pathExtension.length == 0) {
        url = [url URLByAppendingPathExtension:@"js"];
    }
    
    NSString *path = url.path;
    JSValue *exports = self.modules[path];
    if (exports) {
        return exports;
    }

    NSString *source = [NSString stringWithContentsOfURL:url usedEncoding:NULL error:error];
    if (!source) {
        return nil;
    }

    JSContext *context = self.context;
    JSValueRef json = JSValueMakeFromJSONString(context.JSGlobalContextRef, JSStringCreateWithUTF8CString(source.UTF8String));
    if (!json) {
        *error = [NSError errorWithDomain:RJSModuleLoaderErrorDomain code:1 userInfo:@{
            NSLocalizedDescriptionKey: @"Invalid JSON"
        }];
        return nil;
    }

    self.modules[path] = [JSValue valueWithJSValueRef:json inContext:context];
    return self.modules[path];
}

- (JSValue *)loadGlobalModule:(NSString *)name relativeToURL:(NSURL *)baseURL error:(NSError **)error {
    JSValue *exports = self.globalModules[name];
    if (exports || !baseURL) {
        return exports;
    }

    NSURL *bundleResourcesURL = [[NSBundle bundleForClass:self.class] resourceURL];
    NSFileManager *fileManager = [NSFileManager defaultManager];

    while (YES) {
        NSURL *moduleURL = [NSURL URLWithString:[@"node_modules" stringByAppendingPathComponent:name] relativeToURL:baseURL];
        BOOL isDirectory;

        if ([fileManager fileExistsAtPath:moduleURL.path isDirectory:&isDirectory] && isDirectory) {
            NSURL *packageURL = [moduleURL URLByAppendingPathComponent:@"package.json"];
            NSDictionary *package;

            if ([fileManager fileExistsAtPath:packageURL.path]) {
                NSError *error;
                NSData *data = [NSData dataWithContentsOfURL:packageURL options:0 error:&error];

                package = data ? [NSJSONSerialization JSONObjectWithData:data options:0 error:&error] : nil;
                NSAssert(package, @"%@", error);
            }

            moduleURL = [moduleURL URLByAppendingPathComponent:package[@"main"] ?: @"index.js"];
            return [self loadModuleFromURL:moduleURL error:error];
        }

        // Remove last two path components (node_modules/name) and make absolute.
        baseURL = moduleURL.URLByDeletingLastPathComponent.URLByDeletingLastPathComponent.absoluteURL;
        if ([baseURL isEqual:bundleResourcesURL] || !baseURL.path.length) {
            break;
        }

        // Retry with parent directory.
        baseURL = baseURL.URLByDeletingLastPathComponent;
    }

    return nil;
}

@end
