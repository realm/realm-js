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

#include "server/adapter.hpp"

#include "js_class.hpp"
#include "js_sync.hpp"

#include <json.hpp>

namespace realm {
namespace js {

template<typename T>
void AdapterClass<T>::constructor(ContextType ctx, ObjectType this_object, Arguments& arguments) {
    arguments.validate_between(5, 6);

    auto path = Value::validated_to_string(ctx, arguments[0]);
    util::try_make_dir(path);

    auto url = Value::validated_to_string(ctx, arguments[1]);
    ObjectType user = Value::validated_to_object(ctx, arguments[2], "User");
    if (!Object::template is_instance<UserClass<T>>(ctx, user)) {
        throw std::runtime_error("object must be of type Sync.User");
    }
    auto shared_user = *get_internal<T, UserClass<T>>(user);
    if (shared_user->state() != SyncUser::State::Active) {
        throw std::runtime_error("User is no longer valid.");
    }
    if (!shared_user->is_admin()) {
        throw std::runtime_error("User needs to be an admin.");
    }
    std::string regex_string = Value::validated_to_string(ctx, arguments[3], "regex");
    std::regex regex(regex_string);

    Protected<GlobalContextType> protected_ctx = Context<T>::get_global_context(ctx);
    Protected<FunctionType> user_callback(ctx, Value::validated_to_function(ctx, arguments[4], "callback"));
    Protected<ObjectType> protected_this(ctx, this_object);

    SyncConfig sync_config_template(shared_user, url);

    auto realm_constructor = Value::validated_to_object(ctx, Object::get_global(ctx, "Realm"));
    auto sync_constructor = Object::validated_get_object(ctx, realm_constructor, "Sync");
    sync_config_template.bind_session_handler = SyncClass<T>::session_bind_callback(ctx, sync_constructor);

    if (arguments.count == 6) {
        ObjectType ssl_config_object = Value::validated_to_object(ctx, arguments[5], "ssl");
        SyncClass<T>::populate_sync_config_for_ssl(ctx, ssl_config_object, sync_config_template);
    }

    auto adapter = new Adapter(EventLoopDispatcher<void(std::string)>([=](auto realm_path) {
        HANDLESCOPE

        if (std::regex_match(realm_path, regex)) {
            ValueType arguments[1] = { Value::from_string(protected_ctx, realm_path) };
            Function::callback(protected_ctx, user_callback, protected_this, 1, arguments);
        }
    }), regex, path, std::move(sync_config_template));
    set_internal<T, AdapterClass<T>>(this_object, adapter);
}

namespace {
template<typename T>
class ConvertToJS : public nlohmann::json::json_sax_t {
public:
    using ContextType = typename T::Context;
    using ObjectType = typename T::Object;
    using ValueType = typename T::Value;
    using String = js::String<T>;
    using Object = js::Object<T>;
    using Value = js::Value<T>;

    ConvertToJS(ContextType ctx)
    : m_ctx(ctx)
    , m_root(Object::create_array(ctx))
    {
    }

    ObjectType result_array() const noexcept { return m_root; }

    bool null() override
    {
        return set_field(Value::from_null(m_ctx));
    }

    bool boolean(bool val) override
    {
        return set_field(Value::from_boolean(m_ctx, val));
    }

    bool number_integer(int64_t val) override
    {
        return set_number_field(val);
    }

    bool number_unsigned(uint64_t val) override
    {
        return set_number_field(val);
    }

    bool number_float(double val, std::string const& s) override
    {
        return set_number_field(val);
    }

    bool string(std::string& val) override
    {
        switch (m_array_state) {
            case ArrayState::None:
                return set_field(Value::from_nonnull_string(m_ctx, val));
            case ArrayState::Initial:
                if (val == "date")
                    m_array_state = ArrayState::Date;
                else if (val == "data")
                    m_array_state = ArrayState::Data;
                else if (val == "data64")
                    m_array_state = ArrayState::Data64;
                else
                    REALM_TERMINATE("Unexpected value in cooked changeset json");
                return true;
            case ArrayState::Data:
                // This key is no longer generated. We support it for backwards-compatibility only.
                return set_field(Value::from_binary(m_ctx, BinaryData(val)));
            case ArrayState::Data64: {
                auto data = util::base64_decode_to_vector(val);
                // The data we're parsing is data we generated so it should always be valid base64.
                REALM_ASSERT(data);
                return set_field(Value::from_binary(m_ctx, BinaryData(data->data(), data->size())));
            }
            default:
                REALM_TERMINATE("Unexpected value in cooked changeset json");
        }
    }

    bool start_object(std::size_t elements) override
    {
        auto obj = Object::create_empty(m_ctx);
        if (m_obj_stack.empty())
            Object::set_property(m_ctx, m_root, m_root_index++, obj);
        else
            set_field(obj);
        m_obj_stack.push_back(obj);
        return true;
    }

    bool end_object() override
    {
        m_obj_stack.pop_back();
        return true;
    }

    bool start_array(std::size_t elements) override
    {
        if (!m_obj_stack.empty())
            m_array_state = ArrayState::Initial;
        return true;
    }

    bool end_array() override
    {
        m_array_state = ArrayState::None;
        return true;
    }

    bool key(string_t& val) override
    {
		//NAPI: implement with NAPI. Why we go from std::string to v8::String using node::String here
        //m_key = &m_string_pool[val];
        //if (m_key->IsEmpty())
        //    *m_key =  node::String(val);
        return true;
    }

    bool parse_error(std::size_t position, const std::string& last_token, const nlohmann::json::exception& ex) override
    {
        throw ex;
    }

private:
    ContextType m_ctx;
    std::unordered_map<std::string, v8::Local<v8::String>> m_string_pool;
    v8::Local<v8::String>* m_key = nullptr;
    std::vector<ObjectType> m_obj_stack;
    enum class ArrayState {
        None,
        Initial,
        Date,
        Data,
        Data64,
    } m_array_state = ArrayState::None;
    ObjectType m_root;
    uint32_t m_root_index = 0;

    bool set_field(ValueType const& value)
    {
        REALM_ASSERT(m_key);
        REALM_ASSERT(!m_obj_stack.empty());
        // Use Nan::Set directly because going through Object::set_property()
        // will create a new v8 string rather than using our interned one
        Nan::TryCatch trycatch;
        Nan::Set(m_obj_stack.back(), *m_key, value);
        m_key = nullptr;
        if (trycatch.HasCaught()) {
            throw node::Exception(m_ctx, trycatch.Exception());
        }
        return true;
    }

    template<typename Number>
    bool set_number_field(Number val)
    {
        return set_field(m_array_state == ArrayState::Date ? (ValueType)Object::create_date(m_ctx, val)
                                                           : Value::from_number(m_ctx, val));
    }
};
} // anonymous namespace

template<typename T>
void AdapterClass<T>::current(ContextType ctx, ObjectType this_object, Arguments& arguments, ReturnValue &ret) {
    arguments.validate_count(1);
    auto adapter = get_internal<T, AdapterClass<T>>(this_object);
    auto change_set = adapter->current(Value::validated_to_string(ctx, arguments[0]));
    if (!change_set) {
        ret.set_undefined();
        return;
    }

    ConvertToJS<T> sax_handler(ctx);
    nlohmann::json::sax_parse(change_set->data(), change_set->data() + change_set->size(), &sax_handler);
    ret.set(sax_handler.result_array());
}

template<typename T>
void AdapterClass<T>::advance(ContextType ctx, ObjectType this_object, Arguments& arguments, ReturnValue &ret) {
    arguments.validate_count(1);
    auto adapter = get_internal<T, AdapterClass<T>>(this_object);
    adapter->advance(Value::validated_to_string(ctx, arguments[0]));
}

template<typename T>
void AdapterClass<T>::realm_at_path(ContextType ctx, ObjectType this_object, Arguments& arguments, ReturnValue &ret) {
    arguments.validate_between(1, 2);
    auto adapter = get_internal<T, AdapterClass<T>>(this_object);
    auto path = Value::validated_to_string(ctx, arguments[0]);

    typename Schema<T>::ObjectDefaultsMap defaults;
    typename Schema<T>::ConstructorMap constructors;
    util::Optional<realm::Schema> schema;
    bool update_schema = false;

    if (arguments.count == 2) {
        ObjectType schema_object = Value::validated_to_object(ctx, arguments[1], "schema");
        schema = Schema<T>::parse_schema(ctx, schema_object, defaults, constructors);
        update_schema = true;
    }

    realm::Realm::Config config = adapter->get_config(path, std::move(schema));
    auto realm = RealmClass<T>::create_shared_realm(ctx, config, update_schema, std::move(defaults), std::move(constructors));
    ret.set(create_object<T, RealmClass<T>>(ctx, new std::shared_ptr<Realm>(realm)));
}

template<typename T>
void AdapterClass<T>::close(ContextType ctx, ObjectType this_object, Arguments& arguments, ReturnValue &ret) {
    arguments.validate_count(0);
    get_internal<T, AdapterClass<T>>(this_object)->close();
}

} // js
} // realm
