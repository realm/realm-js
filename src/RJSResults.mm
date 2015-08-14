////////////////////////////////////////////////////////////////////////////
//
// Copyright 2015 Realm Inc.
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
