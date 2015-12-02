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

#ifndef REALM_UTIL_PLATFORM_SPECIFIC_CONDVAR
#define REALM_UTIL_PLATFORM_SPECIFIC_CONDVAR

// Enable this only on platforms where it might be needed
// currently none!
//#if REALM_PLATFORM_APPLE
//#define REALM_CONDVAR_EMULATION
//#endif

#include <realm/util/features.h>
#include <realm/util/thread.hpp>
#include <stdint.h>
#include <fcntl.h>
#include <sys/stat.h>
#include <semaphore.h>

namespace realm {
namespace util {




/// Condition variable for use in synchronization monitors.
/// This condition variable uses emulation based on semaphores
/// for the inter-process case, if enabled by REALM_CONDVAR_EMULATION.
/// Compared to a good pthread implemenation, the emulation carries an
/// overhead of at most 2 task switches for every waiter notified during
/// notify() or notify_all().
///
/// When a semaphore is allocated to a condvar, its name is formed
/// as prefix + "RLM" + three_letter_code, where the three letters are
/// created by hashing the path to the file containing the shared part
/// of the condvar and the offset within the file.
///
/// FIXME: This implementation will never release semaphores. This is unlikely
/// to be a problem as long as only a modest number of different database names
/// are in use within the kernel lifetime (all semaphores are released when the
/// kernel is rebooted).
///
/// A PlatformSpecificCondVar is always process shared.
class PlatformSpecificCondVar {
public:
    PlatformSpecificCondVar();
    ~PlatformSpecificCondVar() noexcept;

    /// To use the PlatformSpecificCondVar, you also must place a structure of type
    /// PlatformSpecificCondVar::SharedPart in memory shared by multiple processes
    /// or in a memory mapped file, and use set_shared_part() to associate
    /// the condition variable with it's shared part. You must initialize
    /// the shared part using PlatformSpecificCondVar::init_shared_part(), but only before
    /// first use and only when you have exclusive access to the shared part.

#ifdef REALM_CONDVAR_EMULATION
    struct SharedPart {
        uint64_t signal_counter;
        uint32_t waiters;
    };
#else
    typedef CondVar SharedPart;
#endif

    /// You need to bind the emulation to a SharedPart in shared/mmapped memory.
    /// The SharedPart is assumed to have been initialized (possibly by another process)
    /// earlier through a call to init_shared_part.
    void set_shared_part(SharedPart& shared_part, std::string path, size_t offset_of_condvar);

    /// Initialize the shared part of a process shared condition variable.
    /// A process shared condition variables may be represented by any number of
    /// PlatformSpecificCondVar instances in any number of different processes,
    /// all sharing a common SharedPart instance, which must be in shared memory.
    static void init_shared_part(SharedPart& shared_part);

    /// Wait for another thread to call notify() or notify_all().
    void wait(LockGuard& l) noexcept;

    template<class Func>
    void wait(RobustMutex& m, Func recover_func, const struct timespec* tp = nullptr);
    /// If any threads are waiting for this condition, wake up at least one.
    void notify() noexcept;

    /// Wake up every thread that is currently waiting on this condition.
    void notify_all() noexcept;

    /// Cleanup and release system resources if possible.
    void close() noexcept;

    /// For platforms imposing naming restrictions on system resources,
    /// a prefix can be set. This must be done before setting any SharedParts.
    static void set_resource_naming_prefix(std::string prefix);
private:
    sem_t* get_semaphore(std::string path, size_t offset_of_condvar);

    // non-zero if a shared part has been registered (always 0 on process local instances)
    SharedPart* m_shared_part;

    // semaphore used for emulation, zero if emulation is not used
    sem_t* m_sem;

    // name of the semaphore - FIXME: generate a name based on inode, device and offset of
    // the file used for memory mapping.
    static std::string internal_naming_prefix;
};




// Implementation:


inline void PlatformSpecificCondVar::wait(LockGuard& l) noexcept
{
    REALM_ASSERT(m_shared_part);
#ifdef REALM_CONDVAR_EMULATION
    m_shared_part->waiters++;
    uint64_t my_counter = m_shared_part->signal_counter;
    l.m_mutex.unlock();
    for (;;) {
        int r = sem_wait(m_sem);

        // retry if wait was interrupted by a signal
        if (r == EINTR)
            continue;

        l.m_mutex.lock();
        if (m_shared_part->signal_counter != my_counter)
            break;

        // notification wasn't meant for us, hand in on and wait for another
        sem_post(m_sem);
        l.m_mutex.unlock();
    }
#else
    m_shared_part->wait(l);
#endif
}







template<class Func>
inline void PlatformSpecificCondVar::wait(RobustMutex& m, Func recover_func, const struct timespec* tp)
{
    REALM_ASSERT(m_shared_part);
#ifdef REALM_CONDVAR_EMULATION
    m_shared_part->waiters++;
    uint64_t my_counter = m_shared_part->signal_counter;
    m.unlock();
    for (;;) {
        // FIXME: handle premature return due to signal
        int r;
#if REALM_PLATFORM_APPLE
        // no timeout support on apple
        REALM_ASSERT(tp == nullptr);
        static_cast<void>(tp);
#else
        if (tp) {
            r = sem_timedwait(m_sem, tp);
            if (r == ETIMEDOUT) return;
        }
        else
#endif
        {
            r = sem_wait(m_sem);
        }
        // if wait returns due to a signal, we must retry:
        if (r == EINTR)
            continue;
        m.lock(recover_func);
        if (m_shared_part->signal_counter != my_counter)
            break;

        // notification wasn't meant for us, hand in on and wait for another
        sem_post(m_sem);
        m.unlock();
    }
#else
    m_shared_part->wait(m, recover_func, tp);
#endif
}






inline void PlatformSpecificCondVar::notify() noexcept
{
    REALM_ASSERT(m_shared_part);
#ifdef REALM_CONDVAR_EMULATION
    m_shared_part->signal_counter++;
    if (m_shared_part->waiters) {
        sem_post(m_sem);
        --m_shared_part->waiters;
    }
#else
    m_shared_part->notify();
#endif
}





inline void PlatformSpecificCondVar::notify_all() noexcept
{
    REALM_ASSERT(m_shared_part);
#ifdef REALM_CONDVAR_EMULATION
    m_shared_part->signal_counter++;
    while (m_shared_part->waiters) {
        sem_post(m_sem);
        --m_shared_part->waiters;
    }
#else
    m_shared_part->notify_all();
#endif
}



} // namespace util
} // namespace realm


#endif
