////////////////////////////////////////////////////////////////////////////
//
// Copyright 2015 Realm Inc.
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

#ifndef REALM_LIST_HPP
#define REALM_LIST_HPP

#include "shared_realm.hpp"
#include <realm/link_view.hpp>

namespace realm {
    class List {
      public:
        List(SharedRealm &r, const ObjectSchema &s, LinkViewRef l) : object_schema(s), m_realm(r), m_link_view(l) {}

        const ObjectSchema &object_schema;
        SharedRealm realm() { return m_realm; }

        size_t size();
        Row get(size_t row_ndx);
        void set(size_t row_ndx, size_t target_row_ndx);

        void add(size_t target_row_ndx);
        void remove(size_t list_ndx);
        void insert(size_t list_ndx, size_t target_row_ndx);

        template<typename ValueType, typename ContextType>
        void add(ContextType ctx, ValueType value);

        template<typename ValueType, typename ContextType>
        void insert(ContextType ctx, ValueType value, size_t list_ndx);

        template<typename ValueType, typename ContextType>
        void set(ContextType ctx, ValueType value, size_t list_ndx);

        void verify_valid_row(size_t row_ndx, bool insertion = false);
        void verify_attached();
        void verify_in_tranaction();

      private:
        SharedRealm m_realm;
        LinkViewRef m_link_view;
    };
}

#endif /* REALM_LIST_HPP */
