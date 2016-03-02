////////////////////////////////////////////////////////////////////////////
//
// Copyright 2016 Realm Inc.
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

#include "js_results.hpp"
#include "js_object.hpp"
#include "object_accessor.hpp"
#include "results.hpp"
#include "parser.hpp"
#include "query_builder.hpp"

using namespace realm;

JSValueRef ResultsGetProperty(JSContextRef ctx, JSObjectRef object, JSStringRef propertyName, JSValueRef* jsException) {
    try {
        Results *results = RJSGetInternal<Results *>(object);
        std::string indexStr = RJSStringForJSString(propertyName);
        if (indexStr == "length") {
            return JSValueMakeNumber(ctx, results->size());
        }

        auto row = results->get(RJSValidatedPositiveIndex(indexStr));
        if (!row.is_attached()) {
            return JSValueMakeNull(ctx);
        }

        return RJSObjectCreate(ctx, Object(results->get_realm(), results->get_object_schema(), row));
    }
    catch (std::out_of_range &exp) {
        // getters for nonexistent properties in JS should always return undefined
        return JSValueMakeUndefined(ctx);
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

bool ResultsSetProperty(JSContextRef ctx, JSObjectRef object, JSStringRef propertyName, JSValueRef value, JSValueRef *jsException) {
    try {
        std::string indexStr = RJSStringForJSString(propertyName);
        if (indexStr != "length") {
            stot<long>(RJSStringForJSString(propertyName));
        }

        // attempts to assign to 'length' or an index should throw an exception
        if (jsException) {
            *jsException = RJSMakeError(ctx, "Results objects are readonly");
        }
    }
    catch (std::invalid_argument &exp) {
        // for stol failure this could be another property that is handled externally, so ignore
    }
    return false;
}

void ResultsPropertyNames(JSContextRef ctx, JSObjectRef object, JSPropertyNameAccumulatorRef propertyNames) {
    Results *results = RJSGetInternal<Results *>(object);
    size_t size = results->size();

    char str[32];
    for (size_t i = 0; i < size; i++) {
        sprintf(str, "%zu", i);
        JSStringRef name = JSStringCreateWithUTF8CString(str);
        JSPropertyNameAccumulatorAddName(propertyNames, name);
        JSStringRelease(name);
    }
}

JSValueRef ResultsStaticCopy(JSContextRef ctx, JSObjectRef function, JSObjectRef thisObject, size_t argumentCount, const JSValueRef arguments[], JSValueRef* jsException) {
    try {
        Results *results = RJSGetInternal<Results *>(thisObject);
        RJSValidateArgumentCount(argumentCount, 0);

        Results *copy = new Results(*results);
        copy->set_live(false);

        return RJSWrapObject<Results *>(ctx, RJSResultsClass(), copy);
    }
    catch (std::exception &exp) {
        if (jsException) {
            *jsException = RJSMakeError(ctx, exp);
        }
    }
    return NULL;
}

JSValueRef ResultsSorted(JSContextRef ctx, JSObjectRef function, JSObjectRef thisObject, size_t argumentCount, const JSValueRef arguments[], JSValueRef* jsException) {
    try {
        Results *results = RJSGetInternal<Results *>(thisObject);
        RJSValidateArgumentRange(argumentCount, 1, 2);

        SharedRealm sharedRealm = *RJSGetInternal<SharedRealm *>(thisObject);
        return RJSResultsCreateSorted(ctx, sharedRealm, results->get_object_schema(), std::move(results->get_query()), argumentCount, arguments);
    }
    catch (std::exception &exp) {
        if (jsException) {
            *jsException = RJSMakeError(ctx, exp);
        }
    }
    return NULL;
}

JSValueRef ResultsFiltered(JSContextRef ctx, JSObjectRef function, JSObjectRef thisObject, size_t argumentCount, const JSValueRef arguments[], JSValueRef* jsException) {
    try {
        Results *results = RJSGetInternal<Results *>(thisObject);
        RJSValidateArgumentCountIsAtLeast(argumentCount, 1);

        SharedRealm sharedRealm = *RJSGetInternal<SharedRealm *>(thisObject);
        return RJSResultsCreateFiltered(ctx, sharedRealm, results->get_object_schema(), std::move(results->get_query()), argumentCount, arguments);
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
    return RJSWrapObject<Results *>(ctx, RJSResultsClass(), new Results(realm, *object_schema, *table));
}

JSObjectRef RJSResultsCreate(JSContextRef ctx, SharedRealm realm, std::string className, std::string queryString, std::vector<JSValueRef> args) {
    TableRef table = ObjectStore::table_for_object_type(realm->read_group(), className);
    Query query = table->where();
    const Schema &schema = *realm->config().schema;
    auto object_schema = schema.find(className);
    if (object_schema == schema.end()) {
        throw std::runtime_error("Object type '" + className + "' not present in Realm.");
    }
    parser::Predicate predicate = parser::parse(queryString);
    query_builder::ArgumentConverter<JSValueRef, JSContextRef> arguments(ctx, args);
    query_builder::apply_predicate(query, predicate, arguments, schema, object_schema->name);

    return RJSWrapObject<Results *>(ctx, RJSResultsClass(), new Results(realm, *object_schema, std::move(query)));
}

JSObjectRef RJSResultsCreate(JSContextRef ctx, SharedRealm realm, const ObjectSchema &objectSchema, Query query, bool live) {
    Results *results = new Results(realm, objectSchema, std::move(query));
    results->set_live(live);

    return RJSWrapObject<Results *>(ctx, RJSResultsClass(), results);
}

JSObjectRef RJSResultsCreateFiltered(JSContextRef ctx, SharedRealm realm, const ObjectSchema &objectSchema, Query query, size_t argumentCount, const JSValueRef arguments[]) {
    std::string queryString = RJSValidatedStringForValue(ctx, arguments[0], "predicate");
    std::vector<JSValueRef> args(argumentCount - 1);
    for (size_t i = 1; i < argumentCount; i++) {
        args[i-1] = arguments[i];
    }
    
    parser::Predicate predicate = parser::parse(queryString);
    query_builder::ArgumentConverter<JSValueRef, JSContextRef> queryArgs(ctx, args);
    query_builder::apply_predicate(query, predicate, queryArgs, *realm->config().schema, objectSchema.name);
    
    return RJSResultsCreate(ctx, realm, objectSchema, std::move(query));
}

JSObjectRef RJSResultsCreateSorted(JSContextRef ctx, SharedRealm realm, const ObjectSchema &objectSchema, Query query, size_t argumentCount, const JSValueRef arguments[]) {
    size_t prop_count;
    std::vector<std::string> prop_names;
    std::vector<bool> ascending;

    if (RJSIsValueArray(ctx, arguments[0])) {
        RJSValidateArgumentCount(argumentCount, 1, "Second argument is not allowed if passed an array of sort descriptors");

        JSObjectRef js_prop_names = RJSValidatedValueToObject(ctx, arguments[0]);
        prop_count = RJSValidatedListLength(ctx, js_prop_names);
        if (!prop_count) {
            throw std::invalid_argument("Sort descriptor array must not be empty");
        }

        prop_names.resize(prop_count);
        ascending.resize(prop_count);

        for (unsigned int i = 0; i < prop_count; i++) {
            JSValueRef val = RJSValidatedPropertyAtIndex(ctx, js_prop_names, i);

            if (RJSIsValueArray(ctx, val)) {
                prop_names[i] = RJSValidatedStringForValue(ctx, RJSValidatedPropertyAtIndex(ctx, (JSObjectRef)val, 0));
                ascending[i] = !JSValueToBoolean(ctx, RJSValidatedPropertyAtIndex(ctx, (JSObjectRef)val, 1));
            }
            else {
                prop_names[i] = RJSValidatedStringForValue(ctx, val);
                ascending[i] = true;
            }
        }
    }
    else {
        RJSValidateArgumentRange(argumentCount, 1, 2);

        prop_count = 1;
        prop_names.push_back(RJSValidatedStringForValue(ctx, arguments[0]));
        ascending.push_back(argumentCount == 1 ? true : !JSValueToBoolean(ctx, arguments[1]));
    }

    std::vector<size_t> columns(prop_count);
    size_t index = 0;

    for (std::string prop_name : prop_names) {
        const Property *prop = objectSchema.property_for_name(prop_name);
        if (!prop) {
            throw std::runtime_error("Property '" + prop_name + "' does not exist on object type '" + objectSchema.name + "'");
        }
        columns[index++] = prop->table_column;
    }

    Results *results = new Results(realm, objectSchema, std::move(query), {std::move(columns), std::move(ascending)});
    return RJSWrapObject<Results *>(ctx, RJSResultsClass(), results);
}

static const JSStaticFunction RJSResultsFuncs[] = {
    {"snapshot", ResultsStaticCopy, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {"sorted", ResultsSorted, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {"filtered", ResultsFiltered, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {NULL, NULL},
};

JSClassRef RJSResultsClass() {
    static JSClassRef s_objectClass = RJSCreateWrapperClass<Results *>("Results", ResultsGetProperty, ResultsSetProperty, RJSResultsFuncs, ResultsPropertyNames);
    return s_objectClass;
}
