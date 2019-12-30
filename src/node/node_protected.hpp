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

#pragma once

#include "node_types.hpp"

namespace realm {
namespace node {

template<typename MemberType>
class Protected {
protected:
	Napi::Env m_env;
	napi_ref m_ref;
	bool m_isValue;
public:
	Protected() : m_env(nullptr), m_ref(nullptr), m_isValue(false) {}

	Protected(Napi::Env env, MemberType value) : m_env(env), m_isValue(false) {
		napi_status status = napi_create_reference(env, value, 1, &m_ref);
		if (status == napi_object_expected) {
			m_isValue = true;
			Napi::Object object = Napi::Object::New(m_env);
			object.Set("value", value);
			status = napi_create_reference(env, object, 1, &m_ref);
		}

		if (status != napi_ok) {
			throw std::runtime_error(util::format("Can't create protected reference: napi_status %1", status));
		}

	}

	Protected(const Protected& other) : m_env(other.m_env), m_ref(other.m_ref), m_isValue(other.m_isValue) {
		uint32_t result;
		napi_status status = napi_reference_ref(m_env, m_ref, &result);
		if (status != napi_ok) {
			throw std::runtime_error(util::format("Can't increase protected reference count: napi_status %1", status));
		}
	}

	Protected& operator=(const Protected& other) {
		return *this = Protected(other);
	}

	~Protected() {
		try {
			uint32_t result;
			napi_status status = napi_reference_unref(m_env, m_ref, &result);
			REALM_ASSERT((status == napi_ok) && "~Protected: Can't decrease protected reference count");

			if (result == 0) {
				napi_status status = napi_delete_reference(m_env, m_ref);
				REALM_ASSERT((status == napi_ok) && "~Protected: Can't unallocate protected reference");
			}
		}
		catch (...) {}
	}

	operator MemberType() const {
		napi_value value;
		napi_status status = napi_get_reference_value(m_env, m_ref, &value);
		if (status != napi_ok) {
			throw std::runtime_error(util::format("Can't get protected reference: napi_status %1", status));
		}

		if (value == nullptr) {
			throw std::runtime_error(util::format("Can not use unallocated protected reference"));
		}

		if (m_isValue) {
			Napi::Object object = Napi::Object(m_env, value);
			return object.Get("value").As<MemberType>();
		}

		MemberType member = MemberType(m_env, value);
		return member;
	}

	explicit operator bool() const {
		napi_value value;
		napi_status status = napi_get_reference_value(m_env, m_ref, &value);
		if (status != napi_ok) {
			throw std::runtime_error(util::format("Can't get protected reference: napi_status %1", status));
		}

		if (value == nullptr) {
			throw std::runtime_error(util::format("Can not use unallocated protected reference"));
		}

		return value == nullptr;
	}

	bool operator==(const MemberType &other) const {
		MemberType memberType = *this;

	    return memberType == other;
	}

	bool operator!=(const MemberType& other) const {
		MemberType memberType = *this;
		return memberType != other;
	}

	bool operator==(const Protected<MemberType> &other) const {
		MemberType thisValue = *this;
		MemberType otherValue = *other;
		return thisValue == otherValue;
	}

	bool operator!=(const Protected<MemberType> &other) const {
		MemberType thisValue = *this;
		MemberType otherValue = *other;
		return thisValue != otherValue;
	}

	struct Comparator {
	    bool operator()(const Protected<MemberType>& a, const Protected<MemberType>& b) const {
			MemberType aValue = a;
			MemberType bValue = b;
			return aValue == bValue;
	    }
	};
};

} // node

namespace js {

template<>
class Protected<node::Types::GlobalContext> {
	node::Types::GlobalContext m_ctx;
  public:
	Protected(node::Types::GlobalContext ctx) : m_ctx(ctx) {}

	operator Napi::Env() const {
		return m_ctx;
    }

	//Napi: comparing Napi::Env does not have a meaning in Napi since Napi::Env maps to v8::Isolate not to v8::Context. Validate the runtime behavior of this
	//this is used in RealmClass<T>::set_binding_context -> REALM_ASSERT(js_binding_context->m_context == global_context);
	bool operator==(const Protected<node::Types::GlobalContext>& other) const {
		return true;
	}
};

template<>
class Protected<node::Types::Value> : public node::Protected<Napi::Value> {
  public:
    Protected(Napi::Env env, Napi::Value value) : node::Protected<Napi::Value>(env, value) {}
};

template<>
class Protected<node::Types::Object> : public node::Protected<Napi::Object> {
  public:
    Protected(Napi::Env env, Napi::Object object) : node::Protected<Napi::Object>(env, object) {}
};

template<>
class Protected<node::Types::Function> : public node::Protected<Napi::Function> {
  public:
    Protected(Napi::Env env, Napi::Function function) : node::Protected<Napi::Function>(env, function) {}
};

} // js
} // realm
