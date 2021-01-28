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

#include <common/mixed_type.hpp>
#include <common/types.hpp>

#include "js_realm_object.hpp"

namespace realm {
namespace js {

template <typename JavascriptEngine>
struct LinkObject {
private:
    using Value = js::Value<JavascriptEngine>;
    using ValueType = typename JavascriptEngine::Value;
    using Context = typename JavascriptEngine::Context;
    using Object = js::Object<JavascriptEngine>;
    using RealmClass = RealmObjectClass<JavascriptEngine>;

    std::shared_ptr<Realm> realm;
    Context context;

    /* Nothing to do with realm::Obj, this one is from realm-core */
    realm::Object* into_realm_object(ValueType value) {
        auto object = Value::validated_to_object(context, value);
        return get_internal<JavascriptEngine, RealmClass>(context, object);
    }

public:
    LinkObject(std::shared_ptr<Realm> _realm, Context ctx)
        : realm{_realm}, context{ctx} {}

    realm::Obj create(ValueType value) {
        auto realm_object = into_realm_object(value);
        return realm_object->obj();
    }

    ValueType to_javascript_value(realm::Obj realm_object, const realm::ObjectSchema *schema) {
        if (!realm_object.is_valid()) {
            return Value::from_null(context);
        }
        return RealmClass::create_instance(
            context, realm::Object(realm, *schema, realm_object));
    }

    ValueType to_javascript_value(realm::ObjLink link) {
        realm::Object realm_object(realm, link);
        return RealmClass::create_instance(context, realm_object);
    }

    bool is_instance(ValueType value) {
        auto object = Value::validated_to_object(context, value);
        return Object::template is_instance<RealmClass>(context, object);
    }

    bool belongs_to_realm(ValueType value){
        auto realm_object = into_realm_object(value);
        return realm_object->realm() == realm;
    }

    template <typename Policies>
    bool is_read_only(Policies policy) {
        return !policy.copy && !policy.update && !policy.create;
    }

    realm::Obj create_empty() { return realm::Obj(); }
};

template <typename T>
class MixedLink : public MixedWrapper<typename T::Context, typename T::Value> {
   private:
    using Context = typename T::Context;
    using Value = typename T::Value;

    LinkObject<T> *link_object = nullptr;

   public:
    MixedLink(LinkObject<T> *link): link_object{link} {}

    Mixed wrap(Context context, Value const& value) {
        auto realm_object = link_object->create(value);
        return Mixed(realm_object);
    }

    Value unwrap(Context context, Mixed mixed) {
        return link_object->to_javascript_value(mixed.get_link());
    }
};

}  // namespace js
}  // namespace realm
