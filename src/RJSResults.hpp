//
//  RJSResults.h
//  RealmJS
//
//  Created by Ari Lazier on 5/5/15.
//  Copyright (c) 2015 Realm. All rights reserved.
//

#import "RJSUtil.hpp"

namespace realm {
    class Realm;
    typedef std::shared_ptr<Realm> SharedRealm;
}

JSClassRef RJSResultsClass();
JSObjectRef RJSResultsCreate(JSContextRef ctx, realm::SharedRealm realm, std::string className);
JSObjectRef RJSResultsCreate(JSContextRef ctx, realm::SharedRealm realm, std::string className, std::string query);
