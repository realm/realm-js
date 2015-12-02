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
#ifndef REALM_REPLICATION_HPP
#define REALM_REPLICATION_HPP

#include <algorithm>
#include <limits>
#include <memory>
#include <exception>
#include <string>

#include <realm/util/assert.hpp>
#include <realm/util/tuple.hpp>
#include <realm/util/safe_int_ops.hpp>
#include <realm/util/buffer.hpp>
#include <realm/util/string_buffer.hpp>
#include <realm/util/logger.hpp>
#include <realm/history.hpp>
#include <realm/impl/transact_log.hpp>

namespace realm {

// FIXME: Be careful about the possibility of one modification functions being called by another where both do transaction logging.

// FIXME: The current table/subtable selection scheme assumes that a TableRef of a subtable is not accessed after any modification of one of its ancestor tables.

// FIXME: Checking on same Table* requires that ~Table checks and nullifies on match. Another option would be to store m_selected_table as a TableRef. Yet another option would be to assign unique identifiers to each Table instance vial Allocator. Yet another option would be to explicitely invalidate subtables recursively when parent is modified.

/// Replication is enabled by passing an instance of an implementation of this
/// class to the SharedGroup constructor.
class Replication: public _impl::TransactLogConvenientEncoder, protected _impl::TransactLogStream {
public:
    // Be sure to keep this type aligned with what is actually used in
    // SharedGroup.
    using version_type = History::version_type;
    using InputStream = _impl::NoCopyInputStream;
    class TransactLogApplier;
    class Interrupted; // Exception
    class SimpleIndexTranslator;

    std::string get_database_path();

    /// Reset transaction logs. This call informs the commitlog subsystem of
    /// the initial version chosen as part of establishing a sharing scheme
    /// (also called a "session").
    /// Following a crash, the commitlog subsystem may hold multiple commitlogs
    /// for versions which are lost during the crash. When SharedGroup establishes
    /// a sharing scheme it will continue from the last version commited to
    /// the database.
    ///
    /// The call also indicates that the current thread (and current process)
    /// has exclusive access to the commitlogs, allowing them to reset
    /// synchronization variables. This can be beneficial on systems without
    /// proper support for robust mutexes.
    virtual void reset_log_management(version_type last_version);

    /// Cleanup, remove any log files
    virtual void stop_logging();

    /// The commitlog subsystem can be operated in either of two modes:
    /// server-synchronization mode and normal mode.
    /// When operating in server-synchronization mode.
    /// - the log files are persisted in a crash safe fashion
    /// - when a sharing scheme is established, the logs are assumed to exist already
    ///   (unless we are creating a new database), and an exception is thrown if they
    ///   are missing.
    /// - even after a crash which leaves the log files out of sync wrt to the database,
    ///   the log files can re-synchronized transparently
    /// When operating in normal-mode
    /// - the log files are not updated in a crash safe way
    /// - the log files are removed when the session ends
    /// - the log files are not assumed to be there when a session starts, but are
    ///   created on demand.
    virtual bool is_in_server_synchronization_mode();

    /// Called by SharedGroup during a write transaction, when readlocks are
    /// recycled, to keep the commit log management in sync with what versions
    /// can possibly be interesting in the future.
    virtual void set_last_version_seen_locally(version_type last_seen_version_number) noexcept;


    //@{

    /// From the point of view of the Replication class, a transaction is
    /// initiated when, and only when the associated SharedGroup object calls
    /// initiate_transact() and the call is successful. The associated
    /// SharedGroup object must terminate every such transaction either by
    /// calling finalize_commit() or by calling abort_transact(). It may only
    /// call finalize_commit(), however, after calling prepare_commit(), and
    /// only when prepare_commit() succeeds. If prepare_commit() fails (i.e.,
    /// throws) abort_transact() must still be called.
    ///
    /// The associated SharedGroup object is supposed to terminate a transaction
    /// as soon as possible, and is required to terminate it before attempting
    /// to initiate a new one.
    ///
    /// initiate_transact() is called by the associated SharedGroup object as
    /// part of the initiation of a transaction, and at a time where the caller
    /// has acquired excluse write access to the local Realm. The Replication
    /// implementation is allowed perform "precursor transactions" on the local
    /// Realm at this time. During the impending transaction, the associated
    /// SharedGroup object must inform the Replication object of all modifying
    /// operations by calling set_value() and friends.
    ///
    /// FIXME: There is currently no way for implementations to perform
    /// precursor transactions, since a regular transaction would cause a dead
    /// lock when it tries to acquire a write lock. Consider allowing special
    /// non-locking precursor transactions via an extra argument to this
    /// function.
    ///
    /// prepare_commit() serves as the first phase of a two-phase commit. This
    /// function is called by the associated SharedGroup instance immediately
    /// before the commit operation on the local Realm. The associated
    /// SharedGroup object will then, as the second phase, call either
    /// finalize_commit() or abort_transact() depending on whether the commit
    /// operation suceeded or not.
    ///
    /// initiate_transact() and prepare_commit() are allowed to block the
    /// calling thread if, for example, they need to communicate over the
    /// network. If a calling thread is blocked in one of these functions, it
    /// must be possible to interrupt the blocking operation by having another
    /// thread call interrupt(). The contract is as follows: When interrupt() is
    /// called, then any execution of initiate_transact() or prepare_commit(),
    /// initiated before the interruption, must complete without blocking, or
    /// the execution must be aborted by throwing an Interrupted exception. If
    /// initiate_transact() or prepare_commit() throws Interrupted, it counts as
    /// a failed operation.
    ///
    /// finalize_commit() is called by the associated SharedGroup instance
    /// immediately after a successful commit operation on the local Realm.
    ///
    /// abort_transact() is called by the associated SharedGroup object to
    /// terminate a transaction without committing. That is, any transaction
    /// that is not terminated by finalize_commit() is terminated by
    /// abort_transact(). This could be due to an explicit rollback, or due to a
    /// failed commit attempt.
    ///
    /// Note that finalize_commit() and abort_transact() are not allowed to
    /// throw.
    ///
    /// \param shared_group The associated SharedGRoup object.
    ///
    /// \param current_version The version of the snapshot that the current
    /// transaction is based on.
    ///
    /// \return prepare_commit() returns the version of the new snapshot
    /// produced by the transaction.
    ///
    /// \throw Interrupted Thrown by initiate_transact() and prepare_commit() if
    /// a blocking operation was interrupted.

    void initiate_transact(SharedGroup& shared_group, version_type current_version);
    version_type prepare_commit(SharedGroup& shared_group, version_type current_version);
    void finalize_commit(SharedGroup& shared_group) noexcept;
    void abort_transact(SharedGroup& shared_group) noexcept;

    //@}


    /// Interrupt any blocking call to a function in this class. This function
    /// may be called asyncronously from any thread, but it may not be called
    /// from a system signal handler.
    ///
    /// Some of the public function members of this class may block, but only
    /// when it it is explicitely stated in the documention for those functions.
    ///
    /// FIXME: Currently we do not state blocking behaviour for all the
    /// functions that can block.
    ///
    /// After any function has returned with an interruption indication, the
    /// only functions that may safely be called are abort_transact() and the
    /// destructor. If a client, after having received an interruption
    /// indication, calls abort_transact() and then clear_interrupt(), it may
    /// resume normal operation through this Replication instance.
    void interrupt() noexcept;

    /// May be called by a client to reset this replication instance after an
    /// interrupted transaction. It is not an error to call this function in a
    /// situation where no interruption has occured.
    void clear_interrupt() noexcept;

    /// Called by the local coordinator to apply a transaction log received from
    /// another local coordinator.
    ///
    /// \param logger If specified, and the library was compiled in debug mode,
    /// then a line describing each individual operation is writted to the
    /// specified logger.
    ///
    /// \throw BadTransactLog If the transaction log could not be successfully
    /// parsed, or ended prematurely.
    static void apply_changeset(InputStream& transact_log, Group& target,
                                util::Logger* logger = nullptr);

    virtual ~Replication() noexcept {}

protected:
    Replication();

    virtual std::string do_get_database_path() = 0;


    //@{

    /// do_initiate_transact() is called by initiate_transact(), and likewise
    /// for do_prepare_commit), do_finalize_commit(), and do_abort_transact().
    ///
    /// Implementations are allowed to assume that every call to
    /// do_initiate_transact(), do_prepapre_commit(), do_finalize_commit(), and
    /// do_abort_transact() will pass a reference to the same SharedGroup
    /// object.
    ///
    /// With respect to exception safety, the Replication implementation has two
    /// options: It can prepare to accept the accumulated changeset in
    /// do_prepapre_commit() by allocating all required resources, and delay the
    /// actual acceptance to do_finalize_commit(), which requires that the final
    /// acceptance can be done without any risk of failure. Alternatively, the
    /// Replication implementation can fully accept the changeset in
    /// do_prepapre_commit() (allowing for failure), and then discard that
    /// changeset during the next invocation of do_initiate_transact() if
    /// `current_version` indicates that the previous transaction failed.

    virtual void do_initiate_transact(SharedGroup&, version_type current_version) = 0;
    virtual version_type do_prepare_commit(SharedGroup&, version_type orig_version) = 0;
    virtual void do_finalize_commit(SharedGroup&) noexcept = 0;
    virtual void do_abort_transact(SharedGroup&) noexcept = 0;

    //@}


    virtual void do_interrupt() noexcept = 0;

    virtual void do_clear_interrupt() noexcept = 0;

    // Part of a temporary ugly hack to avoid generating new transaction logs
    // during application of ones that have olready been created elsewhere. See
    // ReplicationImpl::do_initiate_transact() in
    // realm/replication/simplified/provider.cpp for more on this.
    static void set_replication(Group&, Replication*) noexcept;

    /// Must be called only from do_initiate_transact(), do_prepare_commit(), or
    /// do_abort_transact().
    static version_type get_current_version(SharedGroup&);

    friend class _impl::TransactReverser;
};

// re server_version: This field is written by Sync (if enabled) on commits which
// are foreign. It is carried over as part of a commit, allowing other threads involved
// with Sync to observet it. For local commits, the value of server_version is taken
// from any previous forewign commmit.


class Replication::Interrupted: public std::exception {
public:
    const char* what() const noexcept override
    {
        return "Interrupted";
    }
};


class TrivialReplication: public Replication {
public:
    ~TrivialReplication() noexcept {}

protected:
    typedef Replication::version_type version_type;

    TrivialReplication(const std::string& database_file);

    virtual void prepare_changeset(const char* data, size_t size,
                                   version_type new_version) = 0;

    virtual void finalize_changeset() noexcept = 0;

    static void apply_changeset(const char* data, size_t size, SharedGroup& target,
                                util::Logger* logger = nullptr);

private:
    const std::string m_database_file;
    util::Buffer<char> m_transact_log_buffer;

    std::string do_get_database_path() override;
    void do_initiate_transact(SharedGroup&, version_type) override;
    version_type do_prepare_commit(SharedGroup&, version_type orig_version) override;
    void do_finalize_commit(SharedGroup&) noexcept override;
    void do_abort_transact(SharedGroup&) noexcept override;
    void do_interrupt() noexcept override;
    void do_clear_interrupt() noexcept override;
    void transact_log_reserve(size_t n, char** new_begin, char** new_end) override;
    void transact_log_append(const char* data, size_t size, char** new_begin,
                             char** new_end) override;
    void internal_transact_log_reserve(size_t, char** new_begin, char** new_end);

    size_t transact_log_size();
};


// Implementation:

inline Replication::Replication():
    _impl::TransactLogConvenientEncoder(static_cast<_impl::TransactLogStream&>(*this))
{
}


inline std::string Replication::get_database_path()
{
    return do_get_database_path();
}

inline void Replication::reset_log_management(version_type)
{
}

inline bool Replication::is_in_server_synchronization_mode()
{
    return false;
}

inline void Replication::stop_logging()
{
}

inline void Replication::set_last_version_seen_locally(version_type) noexcept
{
}

inline void Replication::initiate_transact(SharedGroup& sg, version_type current_version)
{
    do_initiate_transact(sg, current_version);
    reset_selection_caches();
}

inline Replication::version_type
Replication::prepare_commit(SharedGroup& sg, version_type orig_version)
{
    return do_prepare_commit(sg, orig_version);
}

inline void Replication::finalize_commit(SharedGroup& sg) noexcept
{
    do_finalize_commit(sg);
}

inline void Replication::abort_transact(SharedGroup& sg) noexcept
{
    do_abort_transact(sg);
}

inline void Replication::interrupt() noexcept
{
    do_interrupt();
}

inline void Replication::clear_interrupt() noexcept
{
    do_clear_interrupt();
}

inline TrivialReplication::TrivialReplication(const std::string& database_file):
    m_database_file(database_file)
{
}

inline size_t TrivialReplication::transact_log_size()
{
    return write_position() - m_transact_log_buffer.data();
}

inline void TrivialReplication::transact_log_reserve(size_t n, char** new_begin, char** new_end)
{
    internal_transact_log_reserve(n, new_begin, new_end);
}

inline void TrivialReplication::internal_transact_log_reserve(size_t n, char** new_begin, char** new_end)
{
    char* data = m_transact_log_buffer.data();
    size_t size = write_position() - data;
    m_transact_log_buffer.reserve_extra(size, n);
    data = m_transact_log_buffer.data(); // May have changed
    *new_begin = data + size;
    *new_end = data + m_transact_log_buffer.size();
}

} // namespace realm

#endif // REALM_REPLICATION_HPP
