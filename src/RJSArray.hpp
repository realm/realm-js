//
//  RJSArray.h
//  RealmJS
//
//  Created by Ari Lazier on 7/21/15.
//  Copyright (c) 2015 Realm. All rights reserved.
//

#import "RJSUtil.hpp"
#import "shared_realm.hpp"
#import <realm/link_view.hpp>

namespace realm {
    struct ObjectArray {
        ObjectArray(SharedRealm &r, ObjectSchema &s, LinkViewRef l) : realm(r), object_schema(s), link_view(l) {}
        // FIXME - all should be const
        SharedRealm realm;
        ObjectSchema &object_schema;
        LinkViewRef link_view;
    };
}

JSClassRef RJSArrayClass();
JSObjectRef RJSArrayCreate(JSContextRef ctx, realm::ObjectArray *array);
