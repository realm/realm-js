/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

#import "RJSRealm.hpp"
#import "RJSObject.hpp"
#import "RJSResults.hpp"
#import "RJSList.hpp"
#import "RJSSchema.hpp"

#import "shared_realm.hpp"
#import "object_accessor.hpp"
#import "binding_context.hpp"

#import <set>

using namespace realm;

class RJSRealmDelegate : public BindingContext {
public:
    virtual void changes_available() {
        assert(0);
    }
    virtual void did_change(std::vector<ObserverState> const& observers, std::vector<void*> const& invalidated) {
        notify("change");
    }
    virtual std::vector<ObserverState> get_observed_rows() {
        return std::vector<ObserverState>();
    }
    virtual void will_change(std::vector<ObserverState> const& observers,
                             std::vector<void*> const& invalidated) {}

    RJSRealmDelegate(WeakRealm realm, JSGlobalContextRef ctx) : m_context(ctx), m_realm(realm) {
        JSGlobalContextRetain(m_context);
    }

    ~RJSRealmDelegate() {
        remove_all_notifications();

        for (auto prototype : m_prototypes) {
            JSValueUnprotect(m_context, prototype.second);
        }
        for (auto objectDefaults : m_defaults) {
            for (auto value : objectDefaults.second) {
                JSValueUnprotect(m_context, value.second);
            }
        }
        JSGlobalContextRelease(m_context);
    }

    void add_notification(JSObjectRef notification) {
        if (!m_notifications.count(notification)) {
            JSValueProtect(m_context, notification);
            m_notifications.insert(notification);
        }
    }
    void remove_notification(JSObjectRef notification) {
        if (m_notifications.count(notification)) {
            JSValueUnprotect(m_context, notification);
            m_notifications.erase(notification);
        }
    }
    void remove_all_notifications() {
        for (auto notification : m_notifications) {
            JSValueUnprotect(m_context, notification);
        }
        m_notifications.clear();
    }

    std::map<std::string, ObjectDefaults> m_defaults;
    std::map<std::string, std::map<std::string, JSObjectRef>>m_objects;
    std::map<std::string, JSValueRef> m_prototypes;

  private:
    std::set<JSObjectRef> m_notifications;
    JSGlobalContextRef m_context;
    WeakRealm m_realm;

    void notify(const char *notification_name) {
        JSValueRef arguments[2];
        SharedRealm realm = m_realm.lock();
        if (!realm) {
            throw std::runtime_error("Realm no longer exists");
        }
        JSObjectRef realm_object = RJSWrapObject<SharedRealm *>(m_context, RJSRealmClass(), new SharedRealm(realm));
        arguments[0] = realm_object;
        arguments[1] = RJSValueForString(m_context, notification_name);

        for (auto callback : m_notifications) {
            JSValueRef ex = NULL;
            JSObjectCallAsFunction(m_context, callback, realm_object, 2, arguments, &ex);
            if (ex) {
                throw RJSException(m_context, ex);
            }
        }
    }
};

std::map<std::string, ObjectDefaults> &RJSDefaults(Realm *realm) {
    return static_cast<RJSRealmDelegate *>(realm->m_binding_context.get())->m_defaults;
}

std::map<std::string, JSObjectRef> &RJSObjects(Realm *realm, std::string type) {
    auto &objects = static_cast<RJSRealmDelegate *>(realm->m_delegate.get())->m_objects;
    return objects[type];
}

std::map<std::string, JSValueRef> &RJSPrototypes(Realm *realm) {
    return static_cast<RJSRealmDelegate *>(realm->m_binding_context.get())->m_prototypes;
}

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

void ensureDirectoryForFile(const std::string &fileName) {
    NSString *docsDir = [[NSString stringWithUTF8String:fileName.c_str()] stringByDeletingLastPathComponent];
    NSFileManager *manager = [NSFileManager defaultManager];

    if (![manager fileExistsAtPath:docsDir]) {
        NSError *error = nil;
        [manager createDirectoryAtPath:docsDir withIntermediateDirectories:YES attributes:nil error:&error];
        if (error) {
            throw std::runtime_error([[error description] UTF8String]);
        }
    }
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
        std::map<std::string, realm::ObjectDefaults> defaults;
        std::map<std::string, JSValueRef> prototypes;
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
                        config.schema = std::make_unique<Schema>(RJSParseSchema(ctx, RJSValidatedValueToObject(ctx, schemaValue), defaults, prototypes));
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
        ensureDirectoryForFile(config.path);
        SharedRealm realm = Realm::get_shared_realm(config);
        if (!realm->m_binding_context) {
            realm->m_binding_context = std::make_unique<RJSRealmDelegate>(realm, JSContextGetGlobalContext(ctx));
        }
        RJSDefaults(realm.get()) = defaults;
        RJSPrototypes(realm.get()) = prototypes;
        return RJSWrapObject<SharedRealm *>(ctx, RJSRealmClass(), new SharedRealm(realm));
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
    if (object_schema.properties.size() != RJSValidatedListLength(ctx, array)) {
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
        auto object_schema = sharedRealm->config().schema->find(className);
        if (object_schema == sharedRealm->config().schema->end()) {
            *jsException = RJSMakeError(ctx, "Object type '" + className + "' not found in schema.");
            return NULL;
        }

        JSObjectRef object = RJSValidatedValueToObject(ctx, arguments[1]);
        if (RJSIsValueArray(ctx, arguments[1])) {
            object = RJSDictForPropertyArray(ctx, *object_schema, object);
        }

        bool update = false;
        if (argumentCount == 3) {
            update = JSValueToBoolean(ctx, arguments[2]);
        }

        return RJSObjectCreate(ctx, Object::create<JSValueRef>(ctx, sharedRealm, *object_schema, object, update));
    }
    catch (std::exception &exp) {
        if (jsException) {
            *jsException = RJSMakeError(ctx, exp);
        }
        return NULL;
    }
}

JSValueRef RealmDelete(JSContextRef ctx, JSObjectRef function, JSObjectRef thisObject, size_t argumentCount, const JSValueRef arguments[], JSValueRef* jsException) {
    try {
        RJSValidateArgumentCount(argumentCount, 1);

        if (RJSIsValueArray(ctx, arguments[0]) ||
            JSValueIsObjectOfClass(ctx, arguments[0], RJSResultsClass()) ||
            JSValueIsObjectOfClass(ctx, arguments[0], RJSListClass()))
        {
            JSObjectRef array = RJSValidatedValueToObject(ctx, arguments[0]);
            size_t length = RJSValidatedListLength(ctx, array);
            for (long i = length-1; i >= 0; i--) {
                JSValueRef object = RJSValidatedObjectAtIndex(ctx, array, (unsigned int)i);
                RealmDelete(ctx, function, thisObject, 1, &object, jsException);
                if (*jsException) {
                    return NULL;
                }
            }
            return NULL;
        }

        if (!JSValueIsObjectOfClass(ctx, arguments[0], RJSObjectClass())) {
            throw std::runtime_error("Argument to 'delete' must be a Realm object or a collection of Realm objects.");
        }

        Object *object = RJSGetInternal<Object *>(RJSValidatedValueToObject(ctx, arguments[0]));

        SharedRealm realm = *RJSGetInternal<SharedRealm *>(thisObject);

        if (!realm->is_in_transaction()) {
            throw std::runtime_error("Can only delete objects within a transaction.");
        }

        realm::TableRef table = ObjectStore::table_for_object_type(realm->read_group(), object->object_schema.name);
        table->move_last_over(object->row().get_index());

        return NULL;
    }
    catch (std::exception &exp) {
        if (jsException) {
            *jsException = RJSMakeError(ctx, exp);
        }
        return NULL;
    }
}

JSValueRef RealmDeleteAll(JSContextRef ctx, JSObjectRef function, JSObjectRef thisObject, size_t argumentCount, const JSValueRef arguments[], JSValueRef* jsException) {
    try {
        RJSValidateArgumentCount(argumentCount, 0);

        SharedRealm realm = *RJSGetInternal<SharedRealm *>(thisObject);

        if (!realm->is_in_transaction()) {
            throw std::runtime_error("Can only delete objects within a transaction.");
        }

        for (auto objectSchema : *realm->config().schema) {
            ObjectStore::table_for_object_type(realm->read_group(), objectSchema.name)->clear();
        }
        return NULL;
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

        JSObjectRef object = RJSValidatedValueToFunction(ctx, arguments[0]);
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
    catch (std::exception &exp) {
        if (jsException) {
            *jsException = RJSMakeError(ctx, exp);
        }
        return NULL;
    }

    return NULL;
}

std::string RJSValidatedNotificationName(JSContextRef ctx, JSValueRef value) {
    std::string name = RJSValidatedStringForValue(ctx, value);
    if (name != "change") {
        throw std::runtime_error("Only the 'change' notification name is supported.");
    }
    return name;
}

JSValueRef RealmAddListener(JSContextRef ctx, JSObjectRef function, JSObjectRef thisObject, size_t argumentCount, const JSValueRef arguments[], JSValueRef* jsException) {
    try {
        RJSValidateArgumentCount(argumentCount, 2);
        __unused std::string name = RJSValidatedNotificationName(ctx, arguments[0]);
        JSObjectRef callback = RJSValidatedValueToFunction(ctx, arguments[1]);

        SharedRealm realm = *RJSGetInternal<SharedRealm *>(thisObject);
        static_cast<RJSRealmDelegate *>(realm->m_binding_context.get())->add_notification(callback);
        return NULL;
    }
    catch (std::exception &exp) {
        if (jsException) {
            *jsException = RJSMakeError(ctx, exp);
        }
        return NULL;
    }
}

JSValueRef RealmRemoveListener(JSContextRef ctx, JSObjectRef function, JSObjectRef thisObject, size_t argumentCount, const JSValueRef arguments[], JSValueRef* jsException) {
    try {
        RJSValidateArgumentCount(argumentCount, 2);
        __unused std::string name = RJSValidatedNotificationName(ctx, arguments[0]);
        JSObjectRef callback = RJSValidatedValueToFunction(ctx, arguments[1]);

        SharedRealm realm = *RJSGetInternal<SharedRealm *>(thisObject);
        static_cast<RJSRealmDelegate *>(realm->m_binding_context.get())->remove_notification(callback);
        return NULL;
    }
    catch (std::exception &exp) {
        if (jsException) {
            *jsException = RJSMakeError(ctx, exp);
        }
        return NULL;
    }
}

JSValueRef RealmRemoveAllListeners(JSContextRef ctx, JSObjectRef function, JSObjectRef thisObject, size_t argumentCount, const JSValueRef arguments[], JSValueRef* jsException) {
    try {
        RJSValidateArgumentRange(argumentCount, 0, 1);
        if (argumentCount) {
            RJSValidatedNotificationName(ctx, arguments[0]);
        }

        SharedRealm realm = *RJSGetInternal<SharedRealm *>(thisObject);
        static_cast<RJSRealmDelegate *>(realm->m_binding_context.get())->remove_all_notifications();
        return NULL;
    }
    catch (std::exception &exp) {
        if (jsException) {
            *jsException = RJSMakeError(ctx, exp);
        }
        return NULL;
    }
}

JSValueRef RealmClose(JSContextRef ctx, JSObjectRef function, JSObjectRef thisObject, size_t argumentCount, const JSValueRef arguments[], JSValueRef* jsException) {
    try {
        RJSValidateArgumentCount(argumentCount, 0);
        SharedRealm realm = *RJSGetInternal<SharedRealm *>(thisObject);
        realm->close();
        realm::Realm::s_global_cache.remove(realm->config().path, realm->thread_id());

    }
    catch (std::exception &exp) {
        if (jsException) {
            *jsException = RJSMakeError(ctx, exp);
        }
    }
    return NULL;
}

static const JSStaticFunction RJSRealmFuncs[] = {
    {"objects", RealmObjects, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {"create", RealmCreateObject, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {"delete", RealmDelete, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {"deleteAll", RealmDeleteAll, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {"write", RealmWrite, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {"addListener", RealmAddListener, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {"removeListener", RealmRemoveListener, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {"removeAllListeners", RealmRemoveAllListeners, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {"close", RealmClose, kJSPropertyAttributeReadOnly | kJSPropertyAttributeDontEnum | kJSPropertyAttributeDontDelete},
    {NULL, NULL},
};

JSClassRef RJSRealmClass() {
    static JSClassRef s_realmClass = RJSCreateWrapperClass<SharedRealm *>("Realm", RealmGetProperty, NULL, RJSRealmFuncs);
    return s_realmClass;
}
