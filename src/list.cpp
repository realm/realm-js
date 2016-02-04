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

#include "list.hpp"

#include "shared_realm.hpp"

#include <stdexcept>

using namespace realm;

List::List() noexcept = default;
List::~List() = default;

List::List(std::shared_ptr<Realm> r, const ObjectSchema& s, LinkViewRef l) noexcept
: m_realm(std::move(r))
, m_object_schema(&s)
, m_link_view(std::move(l))
{
}

size_t List::size() const
{
    verify_attached();
    return m_link_view->size();
}

RowExpr List::get(size_t row_ndx) const
{
    verify_attached();
    verify_valid_row(row_ndx);
    return m_link_view->get(row_ndx);
}

void List::set(size_t row_ndx, size_t target_row_ndx)
{
    verify_in_transaction();
    verify_valid_row(row_ndx);
    m_link_view->set(row_ndx, target_row_ndx);
}

void List::add(size_t target_row_ndx)
{
    verify_in_transaction();
    m_link_view->add(target_row_ndx);
}

void List::insert(size_t row_ndx, size_t target_row_ndx)
{
    verify_in_transaction();
    verify_valid_row(row_ndx, true);
    m_link_view->insert(row_ndx, target_row_ndx);
}

void List::remove(size_t row_ndx)
{
    verify_in_transaction();
    verify_valid_row(row_ndx);
    m_link_view->remove(row_ndx);
}

Query List::get_query() const
{
    verify_attached();
    return m_link_view->get_target_table().where(m_link_view);
}

void List::verify_valid_row(size_t row_ndx, bool insertion) const
{
    size_t size = m_link_view->size();
    if (row_ndx > size || (!insertion && row_ndx == size)) {
        throw std::out_of_range("Index " + std::to_string(row_ndx) + " is outside of range 0..." +
                                std::to_string(size) + ".");
    }
}

void List::verify_attached() const
{
    if (!m_link_view->is_attached()) {
        throw std::runtime_error("LinkView is not attached");
    }
    m_realm->verify_thread();
}

void List::verify_in_transaction() const
{
    verify_attached();
    if (!m_realm->is_in_transaction()) {
        throw std::runtime_error("Can only mutate a list within a transaction.");
    }
}
