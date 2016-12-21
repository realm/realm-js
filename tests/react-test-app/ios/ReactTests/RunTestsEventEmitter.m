//
//  RunTestsEventEmitter.m
//  ReactTests
//
//  Created by Kristian Dupont on 20/12/2016.
//  Copyright © 2016 Realm. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "RunTestsEventEmitter.h"

@implementation RunTestsEventEmitter

- (NSArray<NSString *> *)supportedEvents {
    return @[@"realm-run-tests"];
}

@end
