/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

#import "js_util.hpp"
#import "js_object.hpp"
#import "js_results.hpp"
#import "js_schema.hpp"
#import "js_list.hpp"
#import "js_realm.hpp"

#import "object_store.hpp"
#import "object_accessor.hpp"

using RJSAccessor = realm::NativeAccessor<JSValueRef, JSContextRef>;
using namespace realm;

JSValueRef ObjectGetProperty(JSContextRef ctx, JSObjectRef jsObject, JSStringRef jsPropertyName, JSValueRef* exception) {
    try {
        Object *obj = RJSGetInternal<Object *>(jsObject);
        return obj->get_property_value<JSValueRef>(ctx, RJSStringForJSString(jsPropertyName));
    } catch (InvalidPropertyException &ex) {
        // getters for nonexistent properties in JS should always return undefined
    } catch (std::exception &ex) {
        if (exception) {
            *exception = RJSMakeError(ctx, ex);
        }
    }
    return NULL;
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

void ObjectPropertyNames(JSContextRef ctx, JSObjectRef jsObject, JSPropertyNameAccumulatorRef propertyNames) {
    Object *obj = RJSGetInternal<Object *>(jsObject);

    for (auto &prop : obj->get_object_schema().properties) {
        JSStringRef propertyName = RJSStringForString(prop.name);
        JSPropertyNameAccumulatorAddName(propertyNames, propertyName);
        JSStringRelease(propertyName);
    }
}

JSClassRef RJSObjectClass() {
    static JSClassRef s_objectClass = RJSCreateWrapperClass<Object *>("RealmObject", ObjectGetProperty, ObjectSetProperty, NULL, ObjectPropertyNames);
    return s_objectClass;
}

JSObjectRef RJSObjectCreate(JSContextRef ctx, Object object) {
    JSValueRef prototype = RJSPrototypes(object.realm().get())[object.get_object_schema().name];
    JSObjectRef jsObject = RJSWrapObject(ctx, RJSObjectClass(), new Object(object), prototype);
    return jsObject;
}

template<> bool RJSAccessor::dict_has_value_for_key(JSContextRef ctx, JSValueRef dict, const std::string &prop_name) {
    JSObjectRef object = RJSValidatedValueToObject(ctx, dict);
    JSStringRef propStr = RJSStringForString(prop_name);
    bool ret = JSObjectHasProperty(ctx, object, propStr);

    JSStringRelease(propStr);
    return ret;
}

template<> JSValueRef RJSAccessor::dict_value_for_key(JSContextRef ctx, JSValueRef dict, const std::string &prop_name) {
    JSObjectRef object = RJSValidatedValueToObject(ctx, dict);
    JSStringRef propStr = RJSStringForString(prop_name);
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
    return JSValueIsNull(ctx, val) || JSValueIsUndefined(ctx, val);
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

template<> std::string RJSAccessor::to_binary(JSContextRef ctx, JSValueRef &val) {
    static JSStringRef arrayBufferString = JSStringCreateWithUTF8CString("ArrayBuffer");
    static JSStringRef bufferString = JSStringCreateWithUTF8CString("buffer");
    static JSStringRef byteLengthString = JSStringCreateWithUTF8CString("byteLength");
    static JSStringRef byteOffsetString = JSStringCreateWithUTF8CString("byteOffset");
    static JSStringRef isViewString = JSStringCreateWithUTF8CString("isView");
    static JSStringRef uint8ArrayString = JSStringCreateWithUTF8CString("Uint8Array");

    JSObjectRef arrayBufferConstructor = RJSValidatedObjectProperty(ctx, JSContextGetGlobalObject(ctx), arrayBufferString);
    JSObjectRef uint8ArrayContructor = RJSValidatedObjectProperty(ctx, JSContextGetGlobalObject(ctx), uint8ArrayString);
    JSValueRef uint8ArrayArguments[3];
    size_t uint8ArrayArgumentsCount = 0;

    // Value should either be an ArrayBuffer or ArrayBufferView (i.e. TypedArray or DataView).
    if (JSValueIsInstanceOfConstructor(ctx, val, arrayBufferConstructor, NULL)) {
        uint8ArrayArguments[0] = val;
        uint8ArrayArgumentsCount = 1;
    }
    else if (JSObjectRef object = JSValueToObject(ctx, val, NULL)) {
        // Check if value is an ArrayBufferView by calling ArrayBuffer.isView(val).
        JSObjectRef isViewMethod = RJSValidatedObjectProperty(ctx, arrayBufferConstructor, isViewString);
        JSValueRef isView = JSObjectCallAsFunction(ctx, isViewMethod, arrayBufferConstructor, 1, &val, NULL);

        if (isView && JSValueToBoolean(ctx, isView)) {
            uint8ArrayArguments[0] = RJSValidatedObjectProperty(ctx, object, bufferString);
            uint8ArrayArguments[1] = RJSValidatedPropertyValue(ctx, object, byteOffsetString);
            uint8ArrayArguments[2] = RJSValidatedPropertyValue(ctx, object, byteLengthString);
            uint8ArrayArgumentsCount = 3;
        }
    }

    if (!uint8ArrayArgumentsCount) {
        throw std::runtime_error("Can only convert ArrayBuffer and TypedArray objects to binary");
    }

    JSValueRef exception = NULL;
    JSObjectRef uint8Array = JSObjectCallAsConstructor(ctx, uint8ArrayContructor, uint8ArrayArgumentsCount, uint8ArrayArguments, &exception);
    if (exception) {
        throw RJSException(ctx, exception);
    }

    size_t byteCount = RJSValidatedListLength(ctx, uint8Array);
    std::string bytes(byteCount, 0);

    for (size_t i = 0; i < byteCount; i++) {
        JSValueRef byteValue = JSObjectGetPropertyAtIndex(ctx, uint8Array, (unsigned)i, NULL);
        bytes[i] = JSValueToNumber(ctx, byteValue, NULL);
    }

    return bytes;
}
template<> JSValueRef RJSAccessor::from_binary(JSContextRef ctx, BinaryData data) {
    static JSStringRef bufferString = JSStringCreateWithUTF8CString("buffer");
    static JSStringRef uint8ArrayString = JSStringCreateWithUTF8CString("Uint8Array");

    size_t byteCount = data.size();
    JSValueRef byteCountValue = JSValueMakeNumber(ctx, byteCount);
    JSObjectRef uint8ArrayContructor = RJSValidatedObjectProperty(ctx, JSContextGetGlobalObject(ctx), uint8ArrayString);
    JSObjectRef uint8Array = JSObjectCallAsConstructor(ctx, uint8ArrayContructor, 1, &byteCountValue, NULL);

    for (size_t i = 0; i < byteCount; i++) {
        JSValueRef num = JSValueMakeNumber(ctx, data[i]);
        JSObjectSetPropertyAtIndex(ctx, uint8Array, (unsigned)i, num, NULL);
    }

    return RJSValidatedObjectProperty(ctx, uint8Array, bufferString);
}

template<> DateTime RJSAccessor::to_datetime(JSContextRef ctx, JSValueRef &val) {
    JSObjectRef object = RJSValidatedValueToDate(ctx, val);
    double utc = RJSValidatedValueToNumber(ctx, object);

    return DateTime(utc);
}
template<> JSValueRef RJSAccessor::from_datetime(JSContextRef ctx, DateTime dt) {
    JSValueRef time = JSValueMakeNumber(ctx, dt.get_datetime());
    return JSObjectMakeDate(ctx, 1, &time, NULL);
}

extern JSObjectRef RJSDictForPropertyArray(JSContextRef ctx, const ObjectSchema &object_schema, JSObjectRef array);

template<> size_t RJSAccessor::to_existing_object_index(JSContextRef ctx, JSValueRef &val) {
    JSObjectRef object = RJSValidatedValueToObject(ctx, val);
    if (JSValueIsObjectOfClass(ctx, val, RJSObjectClass())) {
        return RJSGetInternal<Object *>(object)->row().get_index();
    }
    throw std::runtime_error("object is not a Realm Object");
}
template<> size_t RJSAccessor::to_object_index(JSContextRef ctx, SharedRealm realm, JSValueRef &val, const std::string &type, bool try_update) {
    JSObjectRef object = RJSValidatedValueToObject(ctx, val);
    if (JSValueIsObjectOfClass(ctx, val, RJSObjectClass())) {
        return RJSGetInternal<Object *>(object)->row().get_index();
    }

    auto object_schema = realm->config().schema->find(type);
    if (RJSIsValueArray(ctx, object)) {
        object = RJSDictForPropertyArray(ctx, *object_schema, object);
    }

    Object child = Object::create<JSValueRef>(ctx, realm, *object_schema, (JSValueRef)object, try_update);
    return child.row().get_index();
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
