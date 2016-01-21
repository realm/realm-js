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

#include "collection_notifications.hpp"

#include "impl/background_collection.hpp"

#include <realm/link_view.hpp>
#include <realm/table_view.hpp>
#include <realm/util/assert.hpp>

using namespace realm;

NotificationToken::NotificationToken(std::shared_ptr<_impl::BackgroundCollection> query, size_t token)
: m_query(std::move(query)), m_token(token)
{
}

NotificationToken::~NotificationToken()
{
    // m_query itself (and not just the pointed-to thing) needs to be accessed
    // atomically to ensure that there are no data races when the token is
    // destroyed after being modified on a different thread.
    // This is needed despite the token not being thread-safe in general as
    // users find it very surpringing for obj-c objects to care about what
    // thread they are deallocated on.
    if (auto query = m_query.exchange({})) {
        query->remove_callback(m_token);
    }
}

NotificationToken::NotificationToken(NotificationToken&& rgt) = default;

NotificationToken& NotificationToken::operator=(realm::NotificationToken&& rgt)
{
    if (this != &rgt) {
        if (auto query = m_query.exchange({})) {
            query->remove_callback(m_token);
        }
        m_query = std::move(rgt.m_query);
        m_token = rgt.m_token;
    }
    return *this;
}

CollectionChangeIndices::CollectionChangeIndices(IndexSet deletions,
                                                 IndexSet insertions,
                                                 IndexSet modifications,
                                                 std::vector<Move> moves)
: deletions(std::move(deletions))
, insertions(std::move(insertions))
, modifications(std::move(modifications))
, moves(std::move(moves))
{
    for (auto&& move : this->moves) {
        this->deletions.add(move.from);
        this->insertions.add(move.to);
    }
    verify();
}

void CollectionChangeIndices::merge(realm::CollectionChangeIndices&& c)
{
    if (c.empty())
        return;
    if (empty()) {
        *this = std::move(c);
        return;
    }

    verify();
    c.verify();

    // First update any old moves
    if (!c.moves.empty() || !c.deletions.empty() || !c.insertions.empty()) {
        auto it = remove_if(begin(moves), end(moves), [&](auto& old) {
            // Check if the moved row was moved again, and if so just update the destination
            auto it = find_if(begin(c.moves), end(c.moves), [&](auto const& m) {
                return old.to == m.from;
            });
            if (it != c.moves.end()) {
                old.to = it->to;
                *it = c.moves.back();
                c.moves.pop_back();
                ++it;
                return false;
            }

            // Check if the destination was deleted
            if (c.deletions.contains(old.to))
                return true;

            // Update the destination to adjust for any new insertions and deletions
            old.to = c.insertions.shift(c.deletions.unshift(old.to));
            return false;
        });
        moves.erase(it, end(moves));
    }

    // Ignore new moves of rows which were previously inserted (the implicit
    // delete from the move will remove the insert)
    if (!insertions.empty()) {
        c.moves.erase(remove_if(begin(c.moves), end(c.moves),
                              [&](auto const& m) { return insertions.contains(m.from); }),
                    end(c.moves));
    }

    // Update the source position of new moves to compensate for the changes made
    // in the old changeset
    if (!deletions.empty() || !insertions.empty()) {
        for (auto& move : c.moves)
            move.from = deletions.shift(insertions.unshift(move.from));
    }

    moves.insert(end(moves), begin(c.moves), end(c.moves));

    // New deletion indices have been shifted by the insertions, so unshift them
    // before adding
    deletions.add_shifted_by(insertions, c.deletions);

    // Drop any inserted-then-deleted rows, then merge in new insertions
    insertions.erase_at(c.deletions);
    insertions.insert_at(c.insertions);

    // Ignore new mmodifications to previously inserted rows
    c.modifications.remove(insertions);

    modifications.erase_at(c.deletions);
    modifications.shift_for_insert_at(c.insertions);
    modifications.add(c.modifications);

    c = {};
    verify();
}

void CollectionChangeIndices::modify(size_t ndx)
{
    if (!insertions.contains(ndx))
        modifications.add(ndx);
    // FIXME: this breaks mapping old row indices to new
    // FIXME: is that a problem?
    // If this row was previously moved, unmark it as a move
    moves.erase(remove_if(begin(moves), end(moves),
                          [&](auto move) { return move.to == ndx; }),
                end(moves));
}

void CollectionChangeIndices::insert(size_t index, size_t count)
{
    modifications.shift_for_insert_at(index, count);
    insertions.insert_at(index, count);

    for (auto& move : moves) {
        if (move.to >= index)
            ++move.to;
    }
}

void CollectionChangeIndices::erase(size_t index)
{
    modifications.erase_at(index);
    size_t unshifted = insertions.erase_and_unshift(index);
    if (unshifted != npos)
        deletions.add_shifted(unshifted);

    for (size_t i = 0; i < moves.size(); ++i) {
        auto& move = moves[i];
        if (move.to == index) {
            moves.erase(moves.begin() + i);
            --i;
        }
        else if (move.to > index)
            --move.to;
    }
}

void CollectionChangeIndices::clear(size_t old_size)
{
    for (auto range : deletions)
        old_size += range.second - range.first;
    for (auto range : insertions)
        old_size -= range.second - range.first;

    modifications.clear();
    insertions.clear();
    moves.clear();
    deletions.set(old_size);
}

void CollectionChangeIndices::move(size_t from, size_t to)
{
    REALM_ASSERT(from != to);

    bool updated_existing_move = false;
    for (auto& move : moves) {
        if (move.to != from) {
            // Shift other moves if this row is moving from one side of them
            // to the other
            if (move.to >= to && move.to < from)
                ++move.to;
            else if (move.to < to && move.to > from)
                --move.to;
            continue;
        }
        REALM_ASSERT(!updated_existing_move);

        // Collapse A -> B, B -> C into a single A -> C move
        move.to = to;
        modifications.erase_at(from);
        insertions.erase_at(from);

        modifications.shift_for_insert_at(to);
        insertions.insert_at(to);
        updated_existing_move = true;
    }
    if (updated_existing_move)
        return;

    if (!insertions.contains(from)) {
        auto shifted_from = insertions.unshift(from);
        shifted_from = deletions.add_shifted(shifted_from);

        // Don't record it as a move if the source row was newly inserted or
        // was previously changed
        if (!modifications.contains(from))
            moves.push_back({shifted_from, to});
    }

    modifications.erase_at(from);
    insertions.erase_at(from);

    modifications.shift_for_insert_at(to);
    insertions.insert_at(to);
}

void CollectionChangeIndices::move_over(size_t row_ndx, size_t last_row)
{
    REALM_ASSERT(row_ndx <= last_row);
    if (row_ndx == last_row) {
        erase(row_ndx);
        return;
    }

    bool updated_existing_move = false;
    for (size_t i = 0; i < moves.size(); ++i) {
        auto& move = moves[i];
        REALM_ASSERT(move.to <= last_row);

        if (move.to == row_ndx) {
            REALM_ASSERT(!updated_existing_move);
            moves[i] = moves.back();
            moves.pop_back();
            --i;
            updated_existing_move = true;
        }
        else if (move.to == last_row) {
            REALM_ASSERT(!updated_existing_move);
            move.to = row_ndx;
            updated_existing_move = true;
        }
    }
    if (!updated_existing_move) {
        moves.push_back({last_row, row_ndx});
    }

    if (insertions.contains(row_ndx)) {
        insertions.remove(row_ndx);
    }
    else {
        if (modifications.contains(row_ndx)) {
            modifications.remove(row_ndx);
        }
        deletions.add(row_ndx);
    }

    if (insertions.contains(last_row)) {
        insertions.remove(last_row);
        insertions.add(row_ndx);
    }
    else if (modifications.contains(last_row)) {
        modifications.remove(last_row);
        modifications.add(row_ndx);
    }
}

void CollectionChangeIndices::verify()
{
#ifdef REALM_DEBUG
    for (auto&& move : moves) {
        REALM_ASSERT(deletions.contains(move.from));
        REALM_ASSERT(insertions.contains(move.to));
    }
    for (auto index : modifications.as_indexes())
        REALM_ASSERT(!insertions.contains(index));
    for (auto index : insertions.as_indexes())
        REALM_ASSERT(!modifications.contains(index));
#endif
}
