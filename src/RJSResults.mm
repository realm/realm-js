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

JSValueRef SortByProperty(JSContextRef ctx, JSObjectRef function, JSObjectRef thisObject, size_t argumentCount, const JSValueRef arguments[], JSValueRef* jsException) {
    try {
        Results *results = RJSGetInternal<Results *>(thisObject);
        RJSValidateArgumentRange(argumentCount, 1, 2);
        std::string propName = RJSValidatedStringForValue(ctx, arguments[0]);
        Property *prop = results->object_schema.property_for_name(propName);
        if (!prop) {
            throw std::runtime_error("Property '" + propName + "' does not exist on object type '" + results->object_schema.name + "'");
        }

        bool ascending = true;
        if (argumentCount == 2) {
            ascending = RJSValidatedValueToBool(ctx, arguments[1]);
        }

        SortOrder sort = {{prop->table_column}, {ascending}};
        results->setSort(sort);
    }
    catch (std::exception &exp) {
        if (jsException) {
            *jsException = RJSMakeError(ctx, exp);
        }
    }
    return NULL;
}

JSObjectRef RJSResultsCreate(JSContextRef ctx, SharedRealm realm, std::string className) {
    TableRef table = ObjectStore::table_for_object_type(realm->read_group(), className);
    auto object_schema = realm->config().schema->find(className);
    if (object_schema == realm->config().schema->end()) {
        throw std::runtime_error("Object type '" + className + "' not present in Realm.");
    }
    return RJSWrapObject<Results *>(ctx, RJSResultsClass(), new Results(realm, *object_schema, table->where()));
}


void RLMUpdateQueryWithPredicate(realm::Query *query, NSPredicate *predicate, realm::Schema &schema, realm::ObjectSchema &objectSchema);

JSObjectRef RJSResultsCreate(JSContextRef ctx, SharedRealm realm, std::string className, std::string queryString) {
    TableRef table = ObjectStore::table_for_object_type(realm->read_group(), className);
    Query query = table->where();
    Schema &schema = *realm->config().schema;
    auto object_schema = realm->config().schema->find(className);
    if (object_schema == realm->config().schema->end()) {
        throw std::runtime_error("Object type '" + className + "' not present in Realm.");
    }
    @try {
        RLMUpdateQueryWithPredicate(&query, [NSPredicate predicateWithFormat:@(queryString.c_str())], schema, *object_schema);
    }
    @catch(NSException *ex) {
        throw std::runtime_error(ex.description.UTF8String);
    }
    return RJSWrapObject<Results *>(ctx, RJSResultsClass(), new Results(realm, *object_schema, std::move(query)));
}


JSClassRef RJSResultsClass() {
    const JSStaticFunction resultsFuncs[] = {
        {"sortByProperty", SortByProperty, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
        {NULL, NULL},
    };
    static JSClassRef s_objectClass = RJSCreateWrapperClass<Object>("Results", ResultsGetProperty, NULL, resultsFuncs, NULL, ResultsPropertyNames);
    return s_objectClass;
}
