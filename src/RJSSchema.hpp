//
//  RJSSchema.h
//  RealmJS
//
//  Created by Ari Lazier on 5/5/15.
//  Copyright (c) 2015 Realm. All rights reserved.
//

#import "RJSUtil.hpp"

namespace realm {
    class Schema;
}

JSClassRef RJSSchemaClass();
JSObjectRef RJSSchemaCreate(JSContextRef ctx, realm::Schema *schema);

realm::Schema RJSParseSchema(JSContextRef ctx, JSObjectRef jsonObject);

JSValueRef RJSPrototypeForClassName(const std::string &className);
