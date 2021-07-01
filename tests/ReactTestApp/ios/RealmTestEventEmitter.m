////////////////////////////////////////////////////////////////////////////
//
// Copyright 2021 Realm Inc.
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

#import "RealmTestEventEmitter.h"
#import "React/RCTEventEmitter.h"

@implementation RealmTestEventEmitter {
    dispatch_group_t _group;
}
RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup {
    return NO;
}

- (instancetype)init {
    if ((self = [super init])) {
        _group = dispatch_group_create();
        dispatch_group_enter(_group);
    }
    return self;
}

- (NSArray<NSString *> *)supportedEvents {
    return @[@"test-names", @"dummy", @"run-test", @"realm-test-finished"];
}

- (void)waitForLoad {
    if (dispatch_group_wait(_group, dispatch_time(DISPATCH_TIME_NOW, 60.0 * NSEC_PER_SEC))) {
        @throw [NSException exceptionWithName:@"ConditionTimeout"
                                       reason:[NSString stringWithFormat:@"Timed out waiting for script load"]
                                     userInfo:nil];
    }
}

- (void)startObserving {
    dispatch_group_leave(_group);
}

- (void)stopObserving {
    dispatch_group_enter(_group);
}
@end
