//
//  RealmJS.h
//  RealmJS
//
//  Created by Ari Lazier on 4/23/15.
//  Copyright (c) 2015 Realm. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <JavaScriptCore/JavaScriptCore.h>

@interface RealmJS : NSObject

// add realm apis to the given js context
+ (void)initializeContext:(JSContextRef)ctx;

@end
