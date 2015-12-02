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

#ifndef REALM_IMPL_SIMULATED_FAILURE_HPP
#define REALM_IMPL_SIMULATED_FAILURE_HPP

#include <exception>

#include <realm/util/features.h>

namespace realm {
namespace _impl {

class SimulatedFailure: public std::exception {
public:
    enum type {
        slab_alloc__reset_free_space_tracking,
        slab_alloc__remap,
        shared_group__grow_reader_mapping,
        _num_failure_types
    };

    class PrimeGuard;

    // Prime the specified failure type on the calling thread.
    static void prime(type);

    // Unprime the specified failure type on the calling thread.
    static void unprime(type) noexcept;

    // If the specified failure type was primed on the calling thread and
    // REALM_DEBUG was defined during compilation, then this throw
    // SimulatedFailure after unpriming the failure type. If REALM_DEBUG was not
    // defined, this function does nothing.
    static void check(type);

private:
#ifdef REALM_DEBUG
    static void do_prime(type);
    static void do_unprime(type) noexcept;
    static void do_check(type);
#endif
};


class SimulatedFailure::PrimeGuard {
public:
    PrimeGuard(type failure_type):
        m_type(failure_type)
    {
        prime(m_type);
    }

    ~PrimeGuard() noexcept
    {
        unprime(m_type);
    }

private:
    const type m_type;
};





// Implementation

inline void SimulatedFailure::prime(type failure_type)
{
#ifdef REALM_DEBUG
    do_prime(failure_type);
#else
    static_cast<void>(failure_type);
#endif
}

inline void SimulatedFailure::unprime(type failure_type) noexcept
{
#ifdef REALM_DEBUG
    do_unprime(failure_type);
#else
    static_cast<void>(failure_type);
#endif
}

inline void SimulatedFailure::check(type failure_type)
{
#ifdef REALM_DEBUG
    do_check(failure_type);
#else
    static_cast<void>(failure_type);
#endif
}

} // namespace _impl
} // namespace realm

#endif // REALM_IMPL_SIMULATED_FAILURE_HPP
