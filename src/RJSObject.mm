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

#import "RJSUtil.hpp"
#import "RJSObject.hpp"
#import "RJSResults.hpp"
#import "RJSSchema.hpp"
#import "RJSList.hpp"
#import "RJSRealm.hpp"

#import "object_store.hpp"
#import "object_accessor.hpp"

using RJSAccessor = realm::NativeAccessor<JSValueRef, JSContextRef>;
using namespace realm;

JSValueRef ObjectGetProperty(JSContextRef ctx, JSObjectRef jsObject, JSStringRef jsPropertyName, JSValueRef* exception) {
    try {
        Object *obj = RJSGetInternal<Object *>(jsObject);
        return obj->get_property_value<JSValueRef>(ctx, RJSStringForJSString(jsPropertyName));
    } catch (std::exception &ex) {
        if (exception) {
            *exception = RJSMakeError(ctx, ex);
        }
        return NULL;
    }
}

bool ObjectSetProperty(JSContextRef ctx, JSObjectRef jsObject, JSStringRef jsPropertyName, JSValueRef value, JSValueRef* exception) {
    try {
        Object *obj = RJSGetInternal<Object *>(jsObject);
        obj->set_property_value(ctx, RJSStringForJSString(jsPropertyName), value, true);
    } catch (std::exception &ex) {
        if (exception) {
            *exception = RJSMakeError(ctx, ex);
        }
        return false;
    }
    return true;
}

void ObjectPropertyNames(JSContextRef ctx, JSObjectRef object, JSPropertyNameAccumulatorRef propertyNames) {
    return;
}

JSClassRef RJSObjectClass() {
    static JSClassRef s_objectClass = RJSCreateWrapperClass<Object *>("RealmObject", ObjectGetProperty, ObjectSetProperty, NULL, ObjectPropertyNames);
    return s_objectClass;
}

JSObjectRef RJSObjectCreate(JSContextRef ctx, Object object) {
    JSValueRef prototype = RJSPrototypes(object.realm.get())[object.object_schema.name];
    JSObjectRef jsObject = RJSWrapObject(ctx, RJSObjectClass(), new Object(object), prototype);
    return jsObject;
}

template<> bool RJSAccessor::dict_has_value_for_key(JSContextRef ctx, JSValueRef dict, const std::string &prop_name) {
    JSObjectRef object = RJSValidatedValueToObject(ctx, dict);
    JSStringRef propStr =JSStringCreateWithUTF8CString(prop_name.c_str());
    return JSObjectHasProperty(ctx, object, propStr);
}

template<> JSValueRef RJSAccessor::dict_value_for_key(JSContextRef ctx, JSValueRef dict, const std::string &prop_name) {
    JSObjectRef object = RJSValidatedValueToObject(ctx, dict);
    JSStringRef propStr =JSStringCreateWithUTF8CString(prop_name.c_str());
    JSValueRef ex = NULL;
    JSValueRef ret = JSObjectGetProperty(ctx, object, propStr, &ex);
    if (ex) {
        throw RJSException(ctx, ex);
    }
    JSStringRelease(propStr);
    return ret;
}

template<> bool RJSAccessor::has_default_value_for_property(JSContextRef ctx, Realm *realm, const ObjectSchema &object_schema, const std::string &prop_name) {
    ObjectDefaults &defaults = RJSDefaults(realm)[object_schema.name];
    return defaults.find(prop_name) != defaults.end();
}

template<> JSValueRef RJSAccessor::default_value_for_property(JSContextRef ctx, Realm *realm, const ObjectSchema &object_schema, const std::string &prop_name) {
    ObjectDefaults &defaults = RJSDefaults(realm)[object_schema.name];
    return defaults[prop_name];
}

template<> bool RJSAccessor::is_null(JSContextRef ctx, JSValueRef &val) {
    return JSValueIsUndefined(ctx, val) || JSValueIsNull(ctx, val);
}
template<> JSValueRef RJSAccessor::null_value(JSContextRef ctx) {
    return JSValueMakeNull(ctx);
}

template<> bool RJSAccessor::to_bool(JSContextRef ctx, JSValueRef &val) {
    if (!JSValueIsBoolean(ctx, val)) {
        throw std::runtime_error("Property expected to be of type boolean");
    }
    return JSValueToBoolean(ctx, val);
}
template<> JSValueRef RJSAccessor::from_bool(JSContextRef ctx, bool b) {
    return JSValueMakeBoolean(ctx, b);
}

template<> long long RJSAccessor::to_long(JSContextRef ctx, JSValueRef &val) {
    return RJSValidatedValueToNumber(ctx, val);
}
template<> JSValueRef RJSAccessor::from_long(JSContextRef ctx, long long l) {
    return JSValueMakeNumber(ctx, l);
}

template<> float RJSAccessor::to_float(JSContextRef ctx, JSValueRef &val) {
    return RJSValidatedValueToNumber(ctx, val);
}
template<> JSValueRef RJSAccessor::from_float(JSContextRef ctx, float f) {
    return JSValueMakeNumber(ctx, f);
}

template<> double RJSAccessor::to_double(JSContextRef ctx, JSValueRef &val) {
    return RJSValidatedValueToNumber(ctx, val);
}
template<> JSValueRef RJSAccessor::from_double(JSContextRef ctx, double d) {
    return JSValueMakeNumber(ctx, d);
}

template<> std::string RJSAccessor::to_string(JSContextRef ctx, JSValueRef &val) {
    return RJSValidatedStringForValue(ctx, val);
}
template<> JSValueRef RJSAccessor::from_string(JSContextRef ctx, StringData s) {
    return RJSValueForString(ctx, s);
}

template<> DateTime RJSAccessor::to_datetime(JSContextRef ctx, JSValueRef &val) {
    JSObjectRef object = RJSValidatedValueToObject(ctx, val, "Property must be a Date");

    JSValueRef exception = NULL;
    static JSStringRef utcString = JSStringCreateWithUTF8CString("getTime");
    JSObjectRef utcGetter = RJSValidatedObjectProperty(ctx, object, utcString);

    JSValueRef utcVal = JSObjectCallAsFunction(ctx, utcGetter, object, 0, NULL, &exception);
    if (exception) {
        throw RJSException(ctx, exception);
    }

    double utc = JSValueToNumber(ctx, utcVal, &exception);
    if (exception) {
        throw RJSException(ctx, exception);
    }

    return DateTime(utc);
}
template<> JSValueRef RJSAccessor::from_datetime(JSContextRef ctx, DateTime dt) {
    JSValueRef time = JSValueMakeNumber(ctx, dt.get_datetime());
    return JSObjectMakeDate(ctx, 1, &time, NULL);
}

extern JSObjectRef RJSDictForPropertyArray(JSContextRef ctx, ObjectSchema &object_schema, JSObjectRef array);

template<> size_t RJSAccessor::to_object_index(JSContextRef ctx, SharedRealm &realm, JSValueRef &val, std::string &type, bool try_update) {
    JSObjectRef object = RJSValidatedValueToObject(ctx, val);
    if (JSValueIsObjectOfClass(ctx, val, RJSObjectClass())) {
        return RJSGetInternal<Object *>(object)->row.get_index();
    }

    auto object_schema = realm->config().schema->find(type);
    if (RJSIsValueArray(ctx, object)) {
        object = RJSDictForPropertyArray(ctx, *object_schema, object);
    }

    Object child = Object::create<JSValueRef>(ctx, realm, *object_schema, (JSValueRef)object, try_update);
    return child.row.get_index();
}
template<> JSValueRef RJSAccessor::from_object(JSContextRef ctx, Object object) {
    return RJSObjectCreate(ctx, object);
}

template<> size_t RJSAccessor::list_size(JSContextRef ctx, JSValueRef &val) {
    return RJSValidatedListLength(ctx, RJSValidatedValueToObject(ctx, val));
}
template<> JSValueRef RJSAccessor::list_value_at_index(JSContextRef ctx, JSValueRef &val, size_t index) {
    return RJSValidatedObjectAtIndex(ctx, RJSValidatedValueToObject(ctx, val), (unsigned int)index);
}
template<> JSValueRef RJSAccessor::from_list(JSContextRef ctx, List list) {
    return RJSListCreate(ctx, list);
}
