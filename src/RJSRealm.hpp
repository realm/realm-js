//
//  RJSRealm.h
//  RealmJS
//
//  Created by Ari Lazier on 5/5/15.
//  Copyright (c) 2015 Realm. All rights reserved.
//

#import "RJSUtil.hpp"

JSClassRef RJSRealmClass();
JSClassRef RJSRealmConstructorClass();
JSClassRef RJSNotificationClass();

std::string RJSDefaultPath();
void RJSSetDefaultPath(std::string path);

