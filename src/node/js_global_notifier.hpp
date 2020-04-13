////////////////////////////////////////////////////////////////////////////
//
// Copyright 2019 Realm Inc.
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

#pragma once

#include "server/global_notifier.hpp"

#include "js_class.hpp"

#include <json.hpp>

namespace realm {
namespace js {

template<typename T>
class RealmClass;

template<typename T>
class ChangeObject : public ClassDefinition<T, GlobalNotifier::ChangeNotification> {
    using ContextType = typename T::Context;
    using ObjectType = typename T::Object;
    using Object = js::Object<T>;
    using ReturnValue = js::ReturnValue<T>;
    using Arguments = js::Arguments<T>;
	using FunctionType = typename T::Function;

public:
    std::string const name = "ChangeObject";

	static FunctionType create_constructor(ContextType);

    static void get_path(ContextType, ObjectType, ReturnValue &);
    static void get_event(ContextType, ObjectType, ReturnValue &);
    static void get_realm(ContextType, ObjectType, ReturnValue &);
    static void get_old_realm(ContextType, ObjectType, ReturnValue &);
    static void get_changes(ContextType, ObjectType, ReturnValue &);
    static void get_empty(ContextType, ObjectType, ReturnValue &);

    static void close(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void serialize(ContextType, ObjectType, Arguments &, ReturnValue &);

    static GlobalNotifier::ChangeNotification& validated_get(ContextType ctx, ObjectType object);

    PropertyMap<T> const properties = {
        {"path", {wrap<get_path>, nullptr}},
        {"event", {wrap<get_event>, nullptr}},
        {"realm", {wrap<get_realm>, nullptr}},
        {"oldRealm", {wrap<get_old_realm>, nullptr}},
        {"changes", {wrap<get_changes>, nullptr}},
        {"isEmpty", {wrap<get_empty>, nullptr}},
    };

    MethodMap<T> const methods = {
        {"close", wrap<close>},
        {"serialize", wrap<serialize>},
    };
};

template<typename T>
typename T::Function ChangeObject<T>::create_constructor(ContextType ctx) {
	return ObjectWrap<T, ChangeObject<T>>::create_constructor(ctx);
}

template<typename T>
GlobalNotifier::ChangeNotification& ChangeObject<T>::validated_get(ContextType ctx, ObjectType object) {
    auto changes = get_internal<T, ChangeObject<T>>(ctx, object);
    if (!changes) {
        throw std::runtime_error("Can only access notification changesets within a notification callback");
    }
    return *changes;
}

template<typename T>
void ChangeObject<T>::get_path(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    return_value.set(validated_get(ctx, object).realm_path);
}

template<typename T>
void ChangeObject<T>::get_event(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    return_value.set(validated_get(ctx, object).type == GlobalNotifier::ChangeNotification::Type::Change ? "onchange" : "ondelete");
}

template<typename T>
void ChangeObject<T>::get_realm(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    auto realm = validated_get(ctx, object).get_new_realm();
    realm->m_binding_context.reset(new RealmDelegate<T>(realm, Context<T>::get_global_context(ctx)));
    return_value.set(create_object<T, RealmClass<T>>(ctx, new SharedRealm(realm)));
}

template<typename T>
void ChangeObject<T>::get_old_realm(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    auto realm = validated_get(ctx, object).get_old_realm();
    realm->m_binding_context.reset(new RealmDelegate<T>(realm, Context<T>::get_global_context(ctx)));
    return_value.set(create_object<T, RealmClass<T>>(ctx, new SharedRealm(realm)));
}

template<typename T>
void ChangeObject<T>::get_changes(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    auto& changes = validated_get(ctx, object);
    auto& change_set = changes.get_changes();
    ObjectType change_object = Object::create_empty(ctx);

    auto old_realm = validated_get(ctx, object).get_old_realm();
    auto new_realm = validated_get(ctx, object).get_new_realm();

    old_realm->m_binding_context.reset(new RealmDelegate<T>(old_realm, Context<T>::get_global_context(ctx)));
    new_realm->m_binding_context.reset(new RealmDelegate<T>(new_realm, Context<T>::get_global_context(ctx)));

    for (auto& pair : change_set) {
        Object::set_property(ctx, change_object, pair.first, CollectionClass<T>::create_collection_change_set(ctx, pair.first, pair.second, old_realm, new_realm));
    }
    return_value.set(change_object);
}

template<typename T>
void ChangeObject<T>::get_empty(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    return_value.set(validated_get(ctx, object).get_changes().empty());
}

template<typename T>
void ChangeObject<T>::close(ContextType ctx, ObjectType object, Arguments &, ReturnValue &) {
    set_internal<T, ChangeObject<T>>(ctx, object, nullptr);
}

template<typename T>
void ChangeObject<T>::serialize(ContextType ctx, ObjectType object, Arguments &, ReturnValue &return_value) {
    return_value.set(validated_get(ctx, object).serialize());
}

template<typename T>
class GlobalNotifierCallback : public realm::GlobalNotifier::Callback {
    using GlobalContextType = typename T::GlobalContext;
    using ContextType = typename T::Context;
    using FunctionType = typename T::Function;
    using ObjectType = typename T::Object;
    using ValueType = typename T::Value;
    using Object = js::Object<T>;
    using Value = js::Value<T>;
    using Function = js::Function<T>;

public:
    GlobalNotifierCallback(ContextType ctx, Protected<FunctionType> callback)
    : m_ctx(Context<T>::get_global_context(ctx)), m_callback(callback) {}

    void download_complete() override;
    void error(std::exception_ptr) override;

    bool realm_available(StringData id, StringData virtual_path) override;
    void realm_changed(GlobalNotifier*) override;

private:
    Protected<GlobalContextType> m_ctx;
    Protected<FunctionType> m_callback;
};

template<typename T>
void GlobalNotifierCallback<T>::realm_changed(GlobalNotifier* notifier) {
    HANDLESCOPE(m_ctx)

    ValueType arguments[] = { Value::from_string(m_ctx, "change") };
    Function::callback(m_ctx, m_callback, Object::create_empty(m_ctx), 1, arguments);
}

template<typename T>
bool GlobalNotifierCallback<T>::realm_available(StringData id, StringData virtual_path) {
    HANDLESCOPE(m_ctx)

    ValueType arguments[] = {
        Value::from_string(m_ctx, "available"),
        Value::from_string(m_ctx, virtual_path.data()),
        Value::from_string(m_ctx, id.data())
    };
    ValueType ret = Function::callback(m_ctx, m_callback, Object::create_empty(m_ctx), 3, arguments);
    return Value::to_boolean(m_ctx, ret);
}

template<typename T>
void GlobalNotifierCallback<T>::download_complete() {
    HANDLESCOPE(m_ctx)
    ValueType arguments[] = { Value::from_string(m_ctx, "downloadComplete"), };
    Function::callback(m_ctx, m_callback, Object::create_empty(m_ctx), 1, arguments);
}

template<typename T>
void GlobalNotifierCallback<T>::error(std::exception_ptr err) {
	HANDLESCOPE(m_ctx)
    try {
        std::rethrow_exception(err);
    }
    catch (std::exception const& e) {
        ValueType arguments[] = { Value::from_string(m_ctx, "error"), Value::from_string(m_ctx, e.what()) };
        Function::callback(m_ctx, m_callback, Object::create_empty(m_ctx), 2, arguments);
    }
}

template<typename T>
class GlobalNotifierClass : public ClassDefinition<T, GlobalNotifier> {
    using ContextType = typename T::Context;
    using ObjectType = typename T::Object;
    using Object = js::Object<T>;
    using ReturnValue = js::ReturnValue<T>;
    using Arguments = js::Arguments<T>;
	using FunctionType = typename T::Function;

public:
    std::string const name = "GlobalNotifier";

	static FunctionType create_constructor(ContextType);

    static ObjectType create_instance(ContextType, realm::List);

    static void start(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void next(ContextType, ObjectType, Arguments &, ReturnValue &);
    static void close(ContextType, ObjectType, Arguments &, ReturnValue &);

    MethodMap<T> const methods = {
        {"start", wrap<start>},
        {"next", wrap<next>},
        {"close", wrap<close>},
    };
};

template<typename T>
typename T::Function GlobalNotifierClass<T>::create_constructor(ContextType ctx) {
	return ObjectWrap<T, GlobalNotifierClass<T>>::create_constructor(ctx);
}

template<typename T>
void GlobalNotifierClass<T>::start(ContextType ctx, ObjectType object, Arguments &, ReturnValue &) {
    get_internal<T, GlobalNotifierClass<T>>(ctx, object)->start();
}

template<typename T>
void GlobalNotifierClass<T>::next(ContextType ctx, ObjectType object, Arguments &, ReturnValue &return_value) {
    auto self = get_internal<T, GlobalNotifierClass<T>>(ctx, object);
    if (!self) {
        return;
    }
    if (auto next = self->next_changed_realm()) {
        return_value.set(create_object<T, ChangeObject<T>>(ctx, new GlobalNotifier::ChangeNotification(std::move(*next))));
    }
}

template<typename T>
void GlobalNotifierClass<T>::close(ContextType ctx, ObjectType object, Arguments &, ReturnValue &) {
    set_internal<T, GlobalNotifierClass<T>>(ctx, object, nullptr);
}

} // js
} // realm
