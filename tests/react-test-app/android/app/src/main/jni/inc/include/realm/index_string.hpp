/*************************************************************************
 *
 * REALM CONFIDENTIAL
 * __________________
 *
 *  [2011] - [2012] Realm Inc
 *  All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Realm Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Realm Incorporated
 * and its suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Realm Incorporated.
 *
 **************************************************************************/
#ifndef REALM_INDEX_STRING_HPP
#define REALM_INDEX_STRING_HPP

#include <iostream>
#include <cstring>
#include <memory>
#include <array>

#include <realm/array.hpp>
#include <realm/column_fwd.hpp>

namespace realm {

class Spec;

// to_str() is used by the integer index. The existing StringIndex is re-used for this
// by making IntegerColumn convert its integers to strings by calling to_str().
template<class T>
inline StringData to_str(const T& value)
{
    static_assert((std::is_same<T, int64_t>::value), "");
    const char* c = reinterpret_cast<const char*>(&value);
    return StringData(c, sizeof(T));
}

inline StringData to_str(const StringData& input)
{
    return input;
}

inline StringData to_str(null input)
{
    return input;
}

inline StringData to_str(float)
{
    REALM_ASSERT_RELEASE(false); // LCOV_EXCL_LINE; Index on float not supported
}

inline StringData to_str(double)
{
    REALM_ASSERT_RELEASE(false); // LCOV_EXCL_LINE; Index on double not supported
}

template<class T>
inline StringData to_str(const util::Optional<T>& value)
{
    if (value) {
        return to_str(*value);
    }
    else {
        return to_str(null{});
    }
}

// todo, should be removed
inline StringData to_str(const char* value)
{
    return StringData(value);
}

class StringIndex {
public:
    StringIndex(ColumnBase* target_column, Allocator&);
    StringIndex(ref_type, ArrayParent*, size_t ndx_in_parent, ColumnBase* target_column,
                bool allow_duplicate_values, Allocator&);
    ~StringIndex() noexcept {}
    void set_target(ColumnBase* target_column) noexcept;

    // Accessor concept:
    Allocator& get_alloc() const noexcept;
    void destroy() noexcept;
    void detach();
    bool is_attached() const noexcept;
    void set_parent(ArrayParent* parent, size_t ndx_in_parent) noexcept;
    size_t get_ndx_in_parent() const noexcept;
    void set_ndx_in_parent(size_t ndx_in_parent) noexcept;
    void update_from_parent(size_t old_baseline) noexcept;
    void refresh_accessor_tree(size_t, const Spec&);
    ref_type get_ref() const noexcept;

    // StringIndex interface:

    static const size_t string_conversion_buffer_size = 8; // 8 is the biggest element size of any non-string/binary Realm type
    using StringConversionBuffer = std::array<char, string_conversion_buffer_size>;

    bool is_empty() const;

    template<class T>
    void insert(size_t row_ndx, T value, size_t num_rows, bool is_append);
    template<class T>
    void insert(size_t row_ndx, util::Optional<T> value, size_t num_rows, bool is_append);

    template<class T>
    void set(size_t row_ndx, T new_value);
    template<class T>
    void set(size_t row_ndx, util::Optional<T> new_value);

    template<class T>
    void erase(size_t row_ndx, bool is_last);

    template<class T>
    size_t find_first(T value) const
    {
        // Use direct access method
        return m_array->index_string_find_first(to_str(value), m_target_column);
    }

    template<class T>
    void find_all(IntegerColumn& result, T value) const
    {
        // Use direct access method
        return m_array->index_string_find_all(result, to_str(value), m_target_column);
    }

    template<class T>
    FindRes find_all(T value, ref_type& ref) const
    {
        // Use direct access method
        return m_array->index_string_find_all_no_copy(to_str(value), ref, m_target_column);
    }

    template<class T>
    size_t count(T value) const
    {
        // Use direct access method
        return m_array->index_string_count(to_str(value), m_target_column);
    }

    template<class T>
    void update_ref(T value, size_t old_row_ndx, size_t new_row_ndx)
    {
        do_update_ref(to_str(value), old_row_ndx, new_row_ndx, 0);
    }

    void clear();

    void distinct(IntegerColumn& result) const;
    bool has_duplicate_values() const noexcept;

    /// By default, duplicate values are allowed.
    void set_allow_duplicate_values(bool) noexcept;

#ifdef REALM_DEBUG
    void verify() const;
    void verify_entries(const StringColumn& column) const;
    void do_dump_node_structure(std::ostream&, int) const;
    void to_dot() const { to_dot(std::cerr); }
    void to_dot(std::ostream&, StringData title = StringData()) const;
#endif

    typedef int32_t key_type;

    static key_type create_key(StringData) noexcept;
    static key_type create_key(StringData, size_t) noexcept;

private:
    std::unique_ptr<Array> m_array;
    ColumnBase* m_target_column;
    bool m_deny_duplicate_values;

    struct inner_node_tag {};
    StringIndex(inner_node_tag, Allocator&);

    static Array* create_node(Allocator&, bool is_leaf);

    void insert_with_offset(size_t row_ndx, StringData value, size_t offset);
    void insert_row_list(size_t ref, size_t offset, StringData value);
    key_type get_last_key() const;

    /// Add small signed \a diff to all elements that are greater than, or equal
    /// to \a min_row_ndx.
    void adjust_row_indexes(size_t min_row_ndx, int diff);

    void validate_value(StringData data) const;
    void validate_value(int64_t value) const noexcept;

    struct NodeChange {
        size_t ref1;
        size_t ref2;
        enum ChangeType { none, insert_before, insert_after, split } type;
        NodeChange(ChangeType t, size_t r1=0, size_t r2=0) : ref1(r1), ref2(r2), type(t) {}
        NodeChange() : ref1(0), ref2(0), type(none) {}
    };

    // B-Tree functions
    void TreeInsert(size_t row_ndx, key_type, size_t offset, StringData value);
    NodeChange do_insert(size_t ndx, key_type, size_t offset, StringData value);
    /// Returns true if there is room or it can join existing entries
    bool leaf_insert(size_t row_ndx, key_type, size_t offset, StringData value, bool noextend=false);
    void node_insert_split(size_t ndx, size_t new_ref);
    void node_insert(size_t ndx, size_t ref);
    void do_delete(size_t ndx, StringData, size_t offset);
    void do_update_ref(StringData value, size_t row_ndx, size_t new_row_ndx, size_t offset);

    StringData get(size_t ndx, StringConversionBuffer& buffer) const;

    void node_add_key(ref_type ref);

#ifdef REALM_DEBUG
    static void dump_node_structure(const Array& node, std::ostream&, int level);
    void to_dot_2(std::ostream&, StringData title = StringData()) const;
    static void array_to_dot(std::ostream&, const Array&);
    static void keys_to_dot(std::ostream&, const Array&, StringData title = StringData());
#endif
};




// Implementation:

inline StringIndex::StringIndex(ColumnBase* target_column, Allocator& alloc):
    m_array(create_node(alloc, true)), // Throws
    m_target_column(target_column),
    m_deny_duplicate_values(false)
{
}

inline StringIndex::StringIndex(ref_type ref, ArrayParent* parent, size_t ndx_in_parent,
                                ColumnBase* target_column,
                                bool deny_duplicate_values, Allocator& alloc):
    m_array(new Array(alloc)),
    m_target_column(target_column),
    m_deny_duplicate_values(deny_duplicate_values)
{
    REALM_ASSERT(Array::get_context_flag_from_header(alloc.translate(ref)));
    m_array->init_from_ref(ref);
    set_parent(parent, ndx_in_parent);
}

inline StringIndex::StringIndex(inner_node_tag, Allocator& alloc):
    m_array(create_node(alloc, false)), // Throws
    m_target_column(nullptr),
    m_deny_duplicate_values(false)
{
}

inline void StringIndex::set_allow_duplicate_values(bool allow) noexcept
{
    m_deny_duplicate_values = !allow;
}

// Byte order of the key is *reversed*, so that for the integer index, the least significant
// byte comes first, so that it fits little-endian machines. That way we can perform fast
// range-lookups and iterate in order, etc, as future features. This, however, makes the same
// features slower for string indexes. Todo, we should reverse the order conditionally, depending
// on the column type.
inline StringIndex::key_type StringIndex::create_key(StringData str) noexcept
{
    key_type key = 0;

    if (str.size() >= 4) goto four;
    if (str.size() < 2) {
        if (str.size() == 0) goto none;
        goto one;
    }
    if (str.size() == 2) goto two;
    goto three;

    // Create 4 byte index key
    // (encoded like this to allow literal comparisons
    // independently of endianness)
  four:
    key |= (key_type(static_cast<unsigned char>(str[3])) <<  0);
  three:
    key |= (key_type(static_cast<unsigned char>(str[2])) <<  8);
  two:
    key |= (key_type(static_cast<unsigned char>(str[1])) << 16);
  one:
    key |= (key_type(static_cast<unsigned char>(str[0])) << 24);
  none:
    return key;
}

// Index works as follows: All non-NULL values are stored as if they had appended an 'X' character at the end. So
// "foo" is stored as if it was "fooX", and "" (empty string) is stored as "X". And NULLs are stored as empty strings.
inline StringIndex::key_type StringIndex::create_key(StringData str, size_t offset) noexcept
{
    if (str.is_null())
        return 0;

    if (offset > str.size())
        return 0;

    // for very short strings
    size_t tail = str.size() - offset;
    if (tail <= sizeof(key_type)-1) {
        char buf[sizeof(key_type)];
        memset(buf, 0, sizeof(key_type));
        buf[tail] = 'X';
        memcpy(buf, str.data() + offset, tail);
        return create_key(StringData(buf, tail + 1));
    }
    // else fallback
    return create_key(str.substr(offset));
}

template<class T>
void StringIndex::insert(size_t row_ndx, T value, size_t num_rows, bool is_append)
{
    REALM_ASSERT_3(row_ndx, !=, npos);

    // If the new row is inserted after the last row in the table, we don't need
    // to adjust any row indexes.
    if (!is_append) {
        for (size_t i = 0; i < num_rows; ++i) {
            size_t row_ndx_2 = row_ndx + i;
            adjust_row_indexes(row_ndx_2, 1); // Throws
        }
    }

    for (size_t i = 0; i < num_rows; ++i) {
        size_t row_ndx_2 = row_ndx + i;
        size_t offset = 0; // First key from beginning of string
        insert_with_offset(row_ndx_2, to_str(value), offset); // Throws
    }
}

template<class T>
void StringIndex::insert(size_t row_ndx, util::Optional<T> value, size_t num_rows, bool is_append)
{
    if (value) {
        insert(row_ndx, *value, num_rows, is_append);
    }
    else {
        insert(row_ndx, null{}, num_rows, is_append);
    }
}

template<class T>
void StringIndex::set(size_t row_ndx, T new_value)
{
    StringConversionBuffer buffer;
    StringData old_value = get(row_ndx, buffer);
    StringData new_value2 = to_str(new_value);

    // Note that insert_with_offset() throws UniqueConstraintViolation.

    if (REALM_LIKELY(new_value2 != old_value)) {
        size_t offset = 0; // First key from beginning of string
        insert_with_offset(row_ndx, new_value2, offset); // Throws

        bool is_last = true; // To avoid updating refs
        erase<T>(row_ndx, is_last); // Throws
    }
}

template<class T>
void StringIndex::set(size_t row_ndx, util::Optional<T> new_value)
{
    if (new_value) {
        set(row_ndx, *new_value);
    }
    else {
        set(row_ndx, null{});
    }
}

template<class T>
void StringIndex::erase(size_t row_ndx, bool is_last)
{
    StringConversionBuffer buffer;
    StringData value = get(row_ndx, buffer);

    do_delete(row_ndx, value, 0);

    // Collapse top nodes with single item
    while (m_array->is_inner_bptree_node()) {
        REALM_ASSERT(m_array->size() > 1); // node cannot be empty
        if (m_array->size() > 2)
            break;

        ref_type ref = m_array->get_as_ref(1);
        m_array->set(1, 1); // avoid destruction of the extracted ref
        m_array->destroy_deep();
        m_array->init_from_ref(ref);
        m_array->update_parent();
    }

    // If it is last item in column, we don't have to update refs
    if (!is_last)
        adjust_row_indexes(row_ndx, -1);
}

inline
void StringIndex::destroy() noexcept
{
    return m_array->destroy_deep();
}

inline
bool StringIndex::is_attached() const noexcept
{
    return m_array->is_attached();
}

inline
void StringIndex::refresh_accessor_tree(size_t, const Spec&)
{
    m_array->init_from_parent();
}

inline
ref_type StringIndex::get_ref() const noexcept
{
    return m_array->get_ref();
}

inline
void StringIndex::set_parent(ArrayParent* parent, size_t ndx_in_parent) noexcept
{
    m_array->set_parent(parent, ndx_in_parent);
}

inline
size_t StringIndex::get_ndx_in_parent() const noexcept
{
    return m_array->get_ndx_in_parent();
}

inline
void StringIndex::set_ndx_in_parent(size_t ndx_in_parent) noexcept
{
    m_array->set_ndx_in_parent(ndx_in_parent);
}

inline
void StringIndex::update_from_parent(size_t old_baseline) noexcept
{
    m_array->update_from_parent(old_baseline);
}

} //namespace realm

#endif // REALM_INDEX_STRING_HPP
