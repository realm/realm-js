//
//  RJSRealm.m
//  RealmJS
//
//  Created by Ari Lazier on 5/5/15.
//  Copyright (c) 2015 Realm. All rights reserved.
//

#import "RJSRealm.hpp"
#import "RJSObject.hpp"
#import "RJSResults.hpp"
#import "RJSSchema.hpp"

#import "shared_realm.hpp"
#import "object_accessor.hpp"

using namespace realm;

std::string writeablePathForFile(const std::string &fileName) {
#if TARGET_OS_IPHONE
    // On iOS the Documents directory isn't user-visible, so put files there
    NSString *path = NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES)[0];
#else
    // On OS X it is, so put files in Application Support. If we aren't running
    // in a sandbox, put it in a subdirectory based on the bundle identifier
    // to avoid accidentally sharing files between applications
    NSString *path = NSSearchPathForDirectoriesInDomains(NSApplicationSupportDirectory, NSUserDomainMask, YES)[0];
    if (![[NSProcessInfo processInfo] environment][@"APP_SANDBOX_CONTAINER_ID"]) {
        NSString *identifier = [[NSBundle mainBundle] bundleIdentifier];
        if ([identifier length] == 0) {
            identifier = [[[NSBundle mainBundle] executablePath] lastPathComponent];
        }
        path = [path stringByAppendingPathComponent:identifier];

        // create directory
        [[NSFileManager defaultManager] createDirectoryAtPath:path
                                  withIntermediateDirectories:YES
                                                   attributes:nil
                                                        error:nil];
    }
#endif
    return std::string(path.UTF8String) + "/" + fileName;
}

static std::string s_defaultPath = writeablePathForFile("default.realm");
std::string RJSDefaultPath() {
    return s_defaultPath;
}
void RJSSetDefaultPath(std::string path) {
    s_defaultPath = path;
}

static JSValueRef GetDefaultPath(JSContextRef ctx, JSObjectRef object, JSStringRef propertyName, JSValueRef* jsException) {
    return RJSValueForString(ctx, s_defaultPath);
}

static bool SetDefaultPath(JSContextRef ctx, JSObjectRef object, JSStringRef propertyName, JSValueRef value, JSValueRef* jsException) {
    try {
        s_defaultPath = RJSValidatedStringForValue(ctx, value, "defaultPath");
    }
    catch (std::exception &ex) {
        if (jsException) {
            *jsException = RJSMakeError(ctx, ex);
        }
    }
    return true;
}

JSObjectRef RealmConstructor(JSContextRef ctx, JSObjectRef constructor, size_t argumentCount, const JSValueRef arguments[], JSValueRef* jsException) {
    try {
        Realm::Config config;
        switch (argumentCount) {
            case 0:
                config.path = RJSDefaultPath();
                break;
            case 1: {
                JSValueRef value = arguments[0];
                if (JSValueIsString(ctx, value)) {
                    config.path = RJSValidatedStringForValue(ctx, value, "path");
                    break;
                }
                if (JSValueIsObject(ctx, value)) {
                    JSObjectRef object = RJSValidatedValueToObject(ctx, value);

                    static JSStringRef pathString = JSStringCreateWithUTF8CString("path");
                    JSValueRef pathValue = RJSValidatedPropertyValue(ctx, object, pathString);
                    if (!JSValueIsUndefined(ctx, pathValue)) {
                        config.path = RJSValidatedStringForValue(ctx, pathValue, "path");
                    }
                    else {
                        config.path = RJSDefaultPath();
                    }

                    static JSStringRef schemaString = JSStringCreateWithUTF8CString("schema");
                    JSValueRef schemaValue = RJSValidatedPropertyValue(ctx, object, schemaString);
                    if (!JSValueIsUndefined(ctx, schemaValue)) {
                        config.schema = std::make_unique<Schema>(RJSParseSchema(ctx, RJSValidatedValueToObject(ctx, schemaValue)));
                    }

                    static JSStringRef schemaVersionString = JSStringCreateWithUTF8CString("schemaVersion");
                    JSValueRef versionValue = RJSValidatedPropertyValue(ctx, object, schemaVersionString);
                    if (JSValueIsNumber(ctx, versionValue)) {
                        config.schema_version = RJSValidatedValueToNumber(ctx, versionValue);
                    }
                    else {
                        config.schema_version = 0;
                    }
                    break;
                }
            }
            default:
                *jsException = RJSMakeError(ctx, "Invalid arguments when constructing 'Realm'");
                return NULL;
        }
        return RJSWrapObject<SharedRealm *>(ctx, RJSRealmClass(), new SharedRealm(Realm::get_shared_realm(config)));
    }
    catch (std::exception &ex) {
        if (jsException) {
            *jsException = RJSMakeError(ctx, ex);
        }
        return NULL;
    }
}

JSClassRef RJSRealmConstructorClass() {
    JSClassDefinition realmConstructorDefinition = kJSClassDefinitionEmpty;
    realmConstructorDefinition.className = "Realm";
    realmConstructorDefinition.callAsConstructor = RealmConstructor;

    JSStaticValue realmStaticProperties[] = {
        {"defaultPath", GetDefaultPath, SetDefaultPath, kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
        {NULL, NULL}
    };
    realmConstructorDefinition.staticValues = realmStaticProperties;
    return JSClassCreate(&realmConstructorDefinition);
}

JSValueRef RealmGetProperty(JSContextRef ctx, JSObjectRef object, JSStringRef propertyName, JSValueRef* exception) {
    static JSStringRef s_pathString = JSStringCreateWithUTF8CString("path");
    if (JSStringIsEqual(propertyName, s_pathString)) {
        return RJSValueForString(ctx, RJSGetInternal<SharedRealm *>(object)->get()->config().path);
    }

    static JSStringRef s_schemaVersion = JSStringCreateWithUTF8CString("schemaVersion");
    if (JSStringIsEqual(propertyName, s_schemaVersion)) {
        return JSValueMakeNumber(ctx, RJSGetInternal<SharedRealm *>(object)->get()->config().schema_version);
    }
    return NULL;
}

JSValueRef RealmObjects(JSContextRef ctx, JSObjectRef function, JSObjectRef thisObject, size_t argumentCount, const JSValueRef arguments[], JSValueRef* jsException) {
    try {
        RJSValidateArgumentRange(argumentCount, 1, 2);
        std::string className = RJSValidatedStringForValue(ctx, arguments[0], "objectType");
        SharedRealm sharedRealm = *RJSGetInternal<SharedRealm *>(thisObject);

        if (argumentCount == 1) {
            return RJSResultsCreate(ctx, sharedRealm, className);
        }
        else {
            std::string predicate = RJSValidatedStringForValue(ctx, arguments[1], "predicate");
            return RJSResultsCreate(ctx, sharedRealm, className, predicate);
        }
    }
    catch (std::exception &exp) {
        if (jsException) {
            *jsException = RJSMakeError(ctx, exp);
        }
        return NULL;
    }
}

JSObjectRef RJSDictForPropertyArray(JSContextRef ctx, ObjectSchema &object_schema, JSObjectRef array) {
    // copy to dictionary
    if (object_schema.properties.size() != RJSValidatedArrayLength(ctx, array)) {
        throw std::runtime_error("Array must contain values for all object properties");
    }

    JSValueRef exception = NULL;
    JSObjectRef dict = JSObjectMake(ctx, NULL, NULL);
    for (unsigned int i = 0; i < object_schema.properties.size(); i++) {
        JSStringRef nameStr = JSStringCreateWithUTF8CString(object_schema.properties[i].name.c_str());
        JSValueRef value = JSObjectGetPropertyAtIndex(ctx, array, i, &exception);
        if (exception) {
            throw RJSException(ctx, exception);
        }
        JSObjectSetProperty(ctx, dict, nameStr, value, kJSPropertyAttributeNone, &exception);
        if (exception) {
            throw RJSException(ctx, exception);
        }
        JSStringRelease(nameStr);
    }
    return dict;
}

JSValueRef RealmCreateObject(JSContextRef ctx, JSObjectRef function, JSObjectRef thisObject, size_t argumentCount, const JSValueRef arguments[], JSValueRef* jsException) {
    try {
        RJSValidateArgumentRange(argumentCount, 2, 3);

        std::string className = RJSValidatedStringForValue(ctx, arguments[0], "objectType");
        SharedRealm sharedRealm = *RJSGetInternal<SharedRealm *>(thisObject);
        ObjectSchema &object_schema = sharedRealm->config().schema->at(className);

        JSObjectRef object = JSValueToObject(ctx, arguments[1], jsException);
        if (!object) {
            return NULL;
        }

        static JSStringRef arrayString = JSStringCreateWithUTF8CString("Array");
        if (RJSIsValueObjectOfType(ctx, arguments[1], arrayString)) {
            object = RJSDictForPropertyArray(ctx, object_schema, object);
        }

        return RJSObjectCreate(ctx, Object::create<JSValueRef>(ctx, sharedRealm, object_schema, object, false));
    }
    catch (std::exception &exp) {
        if (jsException) {
            *jsException = RJSMakeError(ctx, exp);
        }
        return NULL;
    }
}

JSValueRef RealmWrite(JSContextRef ctx, JSObjectRef function, JSObjectRef thisObject, size_t argumentCount, const JSValueRef arguments[], JSValueRef* jsException) {
    try {
        RJSValidateArgumentCount(argumentCount, 1);

        JSObjectRef object = JSValueToObject(ctx, arguments[0], jsException);
        if (object) {
            SharedRealm realm = *RJSGetInternal<SharedRealm *>(thisObject);
            realm->begin_transaction();
            JSObjectCallAsFunction(ctx, object, thisObject, 0, NULL, jsException);
            if (*jsException) {
                realm->cancel_transaction();
            }
            else {
                realm->commit_transaction();
            }
        }
    }
    catch (std::exception &exp) {
        if (jsException) {
            *jsException = RJSMakeError(ctx, exp);
        }
        return NULL;
    }

    return NULL;
}

namespace realm {
    struct Notification {
        JSGlobalContextRef ctx;
        Realm::NotificationFunction func;
    };
}

JSValueRef RealmAddNotification(JSContextRef ctx, JSObjectRef function, JSObjectRef thisObject, size_t argumentCount, const JSValueRef arguments[], JSValueRef* jsException) {
    try {
        RJSValidateArgumentCount(argumentCount, 1);

        JSObjectRef user_function = JSValueToObject(ctx, arguments[0], jsException);
        if (!user_function) {
            return NULL;
        }

        SharedRealm realm = *RJSGetInternal<SharedRealm *>(thisObject);
        JSGlobalContextRef gCtx = JSGlobalContextRetain(JSContextGetGlobalContext(ctx));
        Realm::NotificationFunction func = std::make_shared<std::function<void(const std::string)>>([=](std::string notification_name) {
            JSValueRef arguments[2];
            arguments[0] = thisObject;
            arguments[1] = RJSValueForString(gCtx, notification_name);
            JSValueRef ex = NULL;
            JSObjectCallAsFunction(gCtx, user_function, thisObject, 2, arguments, &ex);
            if (ex) {
                throw RJSException(gCtx, ex);
            }
        });
        realm->add_notification(func);

        return RJSWrapObject<Notification *>(ctx, RJSNotificationClass(), new Notification { gCtx, func });
    }
    catch (std::exception &exp) {
        if (jsException) {
            *jsException = RJSMakeError(ctx, exp);
        }
        return NULL;
    }
}

void RJSNotificationFinalize(JSObjectRef object) {
    Notification *notification = RJSGetInternal<Notification *>(object);
    JSGlobalContextRelease(notification->ctx);
    RJSFinalize<Notification *>(object);
}


JSClassRef RJSRealmClass() {
    const JSStaticFunction realmFuncs[] = {
        {"objects", RealmObjects},
        {"create", RealmCreateObject},
        {"write", RealmWrite},
        {"addNotification", RealmAddNotification},
        {NULL, NULL},
    };
    static JSClassRef s_realmClass = RJSCreateWrapperClass<SharedRealm *>("Realm", RealmGetProperty, NULL, realmFuncs);
    return s_realmClass;
}

JSClassRef RJSNotificationClass() {
    static JSClassRef s_notificationClass = RJSCreateWrapperClass<Notification *>("Notification", NULL, NULL, NULL, RJSNotificationFinalize);
    return s_notificationClass;
}

