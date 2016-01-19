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
        List(SharedRealm &r, const ObjectSchema &s, LinkViewRef l) : m_realm(r), m_object_schema(&s), m_link_view(l) {}

        const ObjectSchema &get_object_schema() const { return *m_object_schema; }
        SharedRealm realm() { return m_realm; }

        size_t size();
        Row get(std::size_t row_ndx);
        void set(std::size_t row_ndx, std::size_t target_row_ndx);

        void add(size_t target_row_ndx);
        void remove(size_t list_ndx);
        void insert(size_t list_ndx, size_t target_row_ndx);

        template<typename ValueType, typename ContextType>
        void add(ContextType ctx, ValueType value);

        template<typename ValueType, typename ContextType>
        void insert(ContextType ctx, ValueType value, size_t list_ndx);

        template<typename ValueType, typename ContextType>
        void set(ContextType ctx, ValueType value, size_t list_ndx);

        Query get_query();

        void verify_valid_row(std::size_t row_ndx, bool insertion = false);
        void verify_attached();
        void verify_in_tranaction();

      private:
        SharedRealm m_realm;
        const ObjectSchema *m_object_schema;
        LinkViewRef m_link_view;
    };
}

#endif /* REALM_LIST_HPP */
