////////////////////////////////////////////////////////////////////////////
//
// Copyright 2021 Realm Inc.
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

#include "realm/object-store/dictionary.hpp"

#if REALM_PLATFORM_NODE

struct Subscriber {
    virtual void notify(Napi::Object &, realm::DictionaryChangeSet &) = 0;
    virtual bool equals(const Subscriber *) const = 0;
    virtual Napi::Function callback() const = 0;

    // TODO
    // virtual ~Subscriber() = 0;
};

struct IOCollection {
    virtual void set(Napi::Env, std::string, Napi::Value) = 0;
    virtual Napi::Value get(Napi::Env, std::string) = 0;
};

#else

struct Subscriber {
    virtual void notify(JSObjectRef &, realm::DictionaryChangeSet &) = 0;
    virtual bool equals(const Subscriber *) const = 0;
    virtual JSValueRef callback() const = 0;

    // TODO
    // virtual ~Subscriber() = 0;
};

struct IOCollection {
    virtual void set(JSContextRef, std::string, JSValueRef) = 0;
    virtual JSValueRef get(JSContextRef, std::string) = 0;
};

#endif

struct ObjectObserver {
    virtual void subscribe(Subscriber *) = 0;
    virtual void remove_subscription(const Subscriber *) = 0;
    virtual void unsubscribe_all() = 0;
};
