//
//  RJSObject.h
//  RealmJS
//
//  Created by Ari Lazier on 5/5/15.
//  Copyright (c) 2015 Realm. All rights reserved.
//

#import "RJSUtil.hpp"
#import "shared_realm.hpp"

namespace realm {
    class Object;
}

JSClassRef RJSObjectClass();
JSObjectRef RJSObjectCreate(JSContextRef ctx, realm::Object object);
