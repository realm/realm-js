/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

#ifndef REALM_RESULTS_HPP
#define REALM_RESULTS_HPP

#include "shared_realm.hpp"

#include <realm/table_view.hpp>
#include <realm/table.hpp>
#include <realm/util/optional.hpp>

namespace realm {
template<typename T> class BasicRowExpr;
using RowExpr = BasicRowExpr<Table>;
class Mixed;

struct SortOrder {
    std::vector<size_t> columnIndices;
    std::vector<bool> ascending;

    explicit operator bool() const
    {
        return !columnIndices.empty();
    }
};

class Results {
public:
    // Results can be either be backed by nothing, a thin wrapper around a table,
    // or a wrapper around a query and a sort order which creates and updates
    // the tableview as needed
    Results() = default;
    Results(SharedRealm r, const ObjectSchema *o, Table& table);
    Results(SharedRealm r, const ObjectSchema *o, Query q, SortOrder s = {});

    // Results is copyable and moveable
    Results(Results const&) = default;
    Results(Results&&) = default;
    Results& operator=(Results&&) = default;
    Results& operator=(Results const&) = default;

    // Get the Realm
    SharedRealm get_realm() const { return m_realm; }
    
    // Object schema describing the vendored object type
    const ObjectSchema *object_schema() { return m_object_schema; }
    
    // Get a query which will match the same rows as is contained in this Results
    // Returned query will not be valid if the current mode is Empty
    Query get_query() const;

    // Get the currently applied sort order for this Results
    SortOrder const& get_sort() const noexcept { return m_sort; }

    // Get a tableview containing the same rows as this Results
    TableView get_tableview();

    // Get the object type which will be returned by get()
    StringData get_object_type() const noexcept { return m_object_schema->name; }

    // Get the size of this results
    // Can be either O(1) or O(N) depending on the state of things
    size_t size();

    // Get the row accessor for the given index
    // Throws OutOfBoundsIndexException if index >= size()
    RowExpr get(size_t index);

    // Get a row accessor for the first/last row, or none if the results are empty
    // More efficient than calling size()+get()
    util::Optional<RowExpr> first();
    util::Optional<RowExpr> last();

    // Get the first index of the given row in this results, or not_found
    // Throws DetachedAccessorException if row is not attached
    // Throws IncorrectTableException if row belongs to a different table
    size_t index_of(size_t row_ndx);
    size_t index_of(Row const& row);

    // Delete all of the rows in this Results from the Realm
    // size() will always be zero afterwards
    // Throws InvalidTransactionException if not in a write transaction
    void clear();

    // Create a new Results by further filtering or sorting this Results
    Results filter(Query&& q) const;
    Results sort(SortOrder&& sort) const;

    // Get the min/max/average/sum of the given column
    // All but sum() returns none when there are zero matching rows
    // sum() returns 0, except for when it returns none
    // Throws UnsupportedColumnTypeException for sum/average on datetime or non-numeric column
    // Throws OutOfBoundsIndexException for an out-of-bounds column
    util::Optional<Mixed> max(size_t column);
    util::Optional<Mixed> min(size_t column);
    util::Optional<Mixed> average(size_t column);
    util::Optional<Mixed> sum(size_t column);

    enum class Mode {
        Empty, // Backed by nothing (for missing tables)
        Table, // Backed directly by a Table
        Query, // Backed by a query that has not yet been turned into a TableView
        TableView // Backed by a TableView created from a Query
    };
    // Get the currrent mode of the Results
    // Ideally this would not be public but it's needed for some KVO stuff
    Mode get_mode() const { return m_mode; }

    // The Results object has been invalidated (due to the Realm being invalidated)
    // All non-noexcept functions can throw this
    struct InvalidatedException : public std::runtime_error
    {
        InvalidatedException() : std::runtime_error("Access to invalidated Results objects") {}
    };

    // The input index parameter was out of bounds
    struct OutOfBoundsIndexException : public std::out_of_range
    {
        OutOfBoundsIndexException(size_t r, size_t c) : requested(r), valid_count(c),
            std::out_of_range((std::string)"Requested index " + std::to_string(r) +
                              " greater than max " + std::to_string(c)) {}
        const size_t requested;
        const size_t valid_count;
    };

    // The input Row object is not attached
    struct DetatchedAccessorException : public std::runtime_error {
        DetatchedAccessorException() : std::runtime_error("Atempting to access an invalid object") {}
    };

    // The input Row object belongs to a different table
    struct IncorrectTableException : public std::runtime_error {
        IncorrectTableException(StringData e, StringData a, const std::string &error) :
            expected(e), actual(a), std::runtime_error(error) {}
        const StringData expected;
        const StringData actual;
    };

    // The requested aggregate operation is not supported for the column type
    struct UnsupportedColumnTypeException : public std::runtime_error {
        size_t column_index;
        StringData column_name;
        DataType column_type;

        UnsupportedColumnTypeException(size_t column, const Table* table);
    };

private:
    SharedRealm m_realm;
    Query m_query;
    TableView m_table_view;
    Table* m_table = nullptr;
    SortOrder m_sort;
    const ObjectSchema *m_object_schema;

    Mode m_mode = Mode::Empty;

    void validate_read() const;
    void validate_write() const;

    void update_tableview();

    template<typename Int, typename Float, typename Double, typename DateTime>
    util::Optional<Mixed> aggregate(size_t column, bool return_none_for_empty,
                                    Int agg_int, Float agg_float,
                                    Double agg_double, DateTime agg_datetime);
};
}

#endif /* REALM_RESULTS_HPP */
