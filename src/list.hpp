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

#include <realm/link_view.hpp>

#include <memory>

namespace realm {
template<typename T> class BasicRowExpr;
using RowExpr = BasicRowExpr<Table>;

class ObjectSchema;
class Realm;

class List {
public:
    List(std::shared_ptr<Realm> r, const ObjectSchema& s, LinkViewRef l) noexcept;
    ~List();

    const ObjectSchema& get_object_schema() const { return *m_object_schema; }
    const std::shared_ptr<Realm>& get_realm() const { return m_realm; }
    Query get_query() const;

    size_t size() const;
    RowExpr get(size_t row_ndx) const;
    void set(size_t row_ndx, size_t target_row_ndx);

    void add(size_t target_row_ndx);
    void remove(size_t list_ndx);
    void insert(size_t list_ndx, size_t target_row_ndx);

    void verify_in_transaction() const;

    // These are implemented in object_accessor.hpp
    template <typename ValueType, typename ContextType>
    void add(ContextType ctx, ValueType value);

    template <typename ValueType, typename ContextType>
    void insert(ContextType ctx, ValueType value, size_t list_ndx);

    template <typename ValueType, typename ContextType>
    void set(ContextType ctx, ValueType value, size_t list_ndx);

private:
    std::shared_ptr<Realm> m_realm;
    const ObjectSchema* m_object_schema;
    LinkViewRef m_link_view;

    void verify_valid_row(size_t row_ndx, bool insertion = false) const;
    void verify_attached() const;
};
}

#endif /* REALM_LIST_HPP */
