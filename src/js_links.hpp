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


    template <typename T>
class RealmLink {
private:

    using ValueType = typename T::Value;
    using Context = typename T::Context;
    using Object = js::Object<T>;
    using ObjectType =  typename Object::ObjectType;
    using RealmClass =  RealmObjectClass<T>;
    using Value =  js::Value<T>;

    Context context;
    ObjectType js_object;

public:
    RealmLink(Context _context, ValueType value): context{_context} {
        js_object = Value::validated_to_object(context, value);
    }

    realm::Object* get_os_object(){ return get_internal<T, RealmClass>(context, js_object); }

    bool is_instance() {
        return Object::template is_instance<RealmClass>(context, js_object);
    }

    bool belongs_to_realm(std::shared_ptr<Realm> realm){
        return is_instance() && get_os_object()->realm() == realm;
    }

    bool is_read_only(realm::CreatePolicy policy) {
        return !policy.copy && !policy.update && !policy.create;
    }

    realm::Obj get_realm_object(){ return get_os_object()->obj(); }
};

template <typename T>
class MixedLink : public MixedWrapper<typename T::Context, typename T::Value> {
   private:
    using Context = typename T::Context;
    using Value = typename T::Value;
    using RealmClass =  RealmObjectClass<T>;

    std::shared_ptr<Realm> realm;

   public:
    MixedLink(std::shared_ptr<Realm> _realm): realm{_realm} {}

    Mixed wrap(Context context, Value const& value) {

        RealmLink<T> realm_link {context, value};

        if(!realm_link.is_instance() ||
        !realm_link.belongs_to_realm(realm)){
            throw std::runtime_error("Only Realm objects are supported.");
        }

        auto realm_object = realm_link.get_realm_object();
        return Mixed(realm_object);
    }

    Value unwrap(Context context, Mixed mixed) {
        realm::Object realm_object(realm, mixed.get_link());
        return RealmClass::create_instance(context, realm_object);
    }

    static void add_strategy(std::shared_ptr<Realm> realm){
        TypeMixed<T>::get_instance().register_strategy(types::Object, new MixedLink<T>{realm});
    }


    static void remove_strategy(){
        TypeMixed<T>::get_instance().unregister(types::Object);
    }
};

}  // namespace js
}  // namespace realm
