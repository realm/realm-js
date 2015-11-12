 /* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

#import <RealmJS/RealmJS.h>

#import "RealmCordova.h"

static NSString * const RealmCordovaRequestNotification = @"RealmCordovaRequestNotification";

@interface RealmCordovaURLProtocol : NSURLProtocol
@end

@implementation RealmCordova

+ (void)initialize {
    [NSURLProtocol registerClass:[RealmCordovaURLProtocol class]];
}

- (void)pluginInitialize {
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(initializeInContext)
                                                 name:RealmCordovaRequestNotification
                                               object:nil];
}

- (void)initializeInContext {
    JSContext *ctx = [self.webView valueForKeyPath:@"documentView.webView.mainFrame.javaScriptContext"];
    RJSInitializeInContext(ctx.JSGlobalContextRef);
}

@end

@implementation RealmCordovaURLProtocol

+ (BOOL)canInitWithRequest:(NSURLRequest *)request {
    return [request.URL.scheme isEqualToString:@"realm"];
}

+ (NSURLRequest *)canonicalRequestForRequest:(NSURLRequest *)request {
    return request;
}

+ (BOOL)requestIsCacheEquivalent:(NSURLRequest *)request toRequest:(NSURLRequest *)anotherRequest {
    return NO;
}

- (void)startLoading {
    [[NSNotificationCenter defaultCenter] postNotificationName:RealmCordovaRequestNotification object:self.request];

    NSHTTPURLResponse *response = [[NSHTTPURLResponse alloc] initWithURL:self.request.URL statusCode:200 HTTPVersion:@"HTTP/1.1" headerFields:nil];
    [self.client URLProtocol:self didReceiveResponse:response cacheStoragePolicy:NSURLCacheStorageNotAllowed];
    [self.client URLProtocolDidFinishLoading:self];
}

- (void)stopLoading {
    // Nothing to do, but required to be implemented by NSURLProtocol.
}

@end
