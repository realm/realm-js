/*************************************************************************
 *
 * REALM CONFIDENTIAL
 * __________________
 *
 *  [2011] - [2015] Realm Inc
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

#ifndef REALM_HISTORY_HPP
#define REALM_HISTORY_HPP

#include <stdint.h>

#include <realm/binary_data.hpp>

namespace realm {


class History {
public:
    using version_type = uint_fast64_t;

    /// Get all changesets between the specified versions. References to those
    /// changesets will be made availble in successive entries of `buffer`. The
    /// number of retreived changesets is exactly `end_version -
    /// begin_version`. If this number is greater than zero, the changeset made
    /// avaialable in `buffer[0]` is the one that brought the database from
    /// `begin_version` to `begin_version + 1`.
    ///
    /// The calee retains ownership of the memory referenced by those entries,
    /// i.e., the memory referenced by `buffer[i].changeset` is **not** handed
    /// over to the caller.
    ///
    /// The caller must **not** assume that this memory remains valid
    /// indefinitely. It is the responsibility of the implementing subclass to
    /// specify the rules that govern the period of validity of this memory.
    virtual void get_changesets(version_type begin_version, version_type end_version,
                                BinaryData* buffer) const noexcept = 0;

    virtual BinaryData get_uncommitted_changes() noexcept = 0;

    virtual ~History() noexcept {}
};


} // namespace realm

#endif // REALM_HISTORY_HPP
