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

#include <common/types.hpp>

#include "js_realm_object.hpp"

namespace realm {
namespace js {

template <typename JavascriptEngine>
struct LinkObject {
    using Value = js::Value<JavascriptEngine>;
    using ValueType = typename JavascriptEngine::Value;
    using Context = typename JavascriptEngine::Context;
    using Object = js::Object<JavascriptEngine>;
    using RealmClass = RealmObjectClass<JavascriptEngine>;

    const ObjectSchema* schema = nullptr;
    std::shared_ptr<Realm> realm;
    Context context;

    LinkObject(std::shared_ptr<Realm> _realm, Context ctx)
        : realm{_realm}, context{ctx} {}

    LinkObject(std::shared_ptr<Realm> _realm, Context ctx,
               const ObjectSchema* _schema)
        : realm{_realm}, context{ctx}, schema{_schema} {}

    void set_schema(const ObjectSchema* schm) { schema = schm; }

    realm::Obj create(ValueType value) {
        auto object = Value::validated_to_object(context, value);
        auto realm_object =
            get_internal<JavascriptEngine, RealmClass>(context, object);

        if (realm_object->realm() != realm) {
            throw std::runtime_error("Realm object is from another Realm");
        }

        return realm_object->obj();
    }

    ValueType to_javascript_value(realm::Obj realm_object) {
        if (!realm_object.is_valid()) {
            return Value::from_null(context);
        }
        return RealmClass::create_instance(
            context, realm::Object(realm, *schema, realm_object));
    }

    bool is_instance(ValueType value) {
        auto object = Value::validated_to_object(context, value);
        return Object::template is_instance<RealmClass>(context, object);
    }

    bool not_from_this_realm(realm::CreatePolicy policy) {
        return !policy.copy && !policy.update && !policy.create;
    }

    realm::Obj create_empty() { return realm::Obj(); }
};

}  // namespace js
}  // namespace realm
