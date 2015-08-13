//
//  RJSResults.m
//  RealmJS
//
//  Created by Ari Lazier on 5/5/15.
//  Copyright (c) 2015 Realm. All rights reserved.
//

#import "RJSResults.hpp"
#import "RJSObject.hpp"
#import "object_accessor.hpp"
#import "results.hpp"

using namespace realm;

JSValueRef ResultsGetProperty(JSContextRef ctx, JSObjectRef object, JSStringRef propertyName, JSValueRef* jsException) {
    try {
        // index subscripting
        Results *results = RJSGetInternal<Results *>(object);
        size_t size = results->size();

        std::string indexStr = RJSStringForJSString(propertyName);
        if (indexStr == "length") {
            return JSValueMakeNumber(ctx, size);
        }

        return RJSObjectCreate(ctx, Object(results->realm, results->object_schema, results->get(std::stol(indexStr))));
    }
    catch (std::invalid_argument &exp) {
        // for stol failure this could be another property that is handled externally, so ignore
        return NULL;
    }
    catch (std::exception &exp) {
        if (jsException) {
            *jsException = RJSMakeError(ctx, exp);
        }
        return NULL;
    }
}

void ResultsPropertyNames(JSContextRef ctx, JSObjectRef object, JSPropertyNameAccumulatorRef propertyNames) {
    Results *results = RJSGetInternal<Results *>(object);
    char str[32];
    for (int i = 0; i < results->table_view.size(); i++) {
        sprintf(str, "%i", i);
        JSStringRef name = JSStringCreateWithUTF8CString(str);
        JSPropertyNameAccumulatorAddName(propertyNames, name);
        JSStringRelease(name);
    }
}

JSObjectRef RJSResultsCreate(JSContextRef ctx, SharedRealm realm, std::string className) {
    TableRef table = ObjectStore::table_for_object_type(realm->read_group(), className);
    return RJSWrapObject<Results *>(ctx, RJSResultsClass(), new Results(realm, realm->config().schema->at(className), table->where()));
}

JSObjectRef RJSResultsCreate(JSContextRef ctx, SharedRealm realm, std::string className, std::string queryString) {
    TableRef table = ObjectStore::table_for_object_type(realm->read_group(), className);
    Query query = table->where();
    return RJSWrapObject<Results *>(ctx, RJSResultsClass(), new Results(realm, realm->config().schema->at(className), std::move(query)));
}


JSClassRef RJSResultsClass() {
    static JSClassRef s_objectClass = RJSCreateWrapperClass<Object>("Results", ResultsGetProperty, NULL, NULL, NULL, ResultsPropertyNames);
    return s_objectClass;
}
