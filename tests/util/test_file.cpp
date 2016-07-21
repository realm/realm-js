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

#include "util/test_file.hpp"

#include "impl/realm_coordinator.hpp"

#include <realm/disable_sync_to_disk.hpp>
#include <realm/string_data.hpp>

#include <cstdlib>
#include <unistd.h>

#if defined(__has_feature) && __has_feature(thread_sanitizer)
#include <condition_variable>
#include <functional>
#include <thread>
#include <map>
#endif

TestFile::TestFile()
{
    static std::string tmpdir = [] {
        realm::disable_sync_to_disk();

        const char* dir = getenv("TMPDIR");
        if (dir && *dir)
            return dir;
        return "/tmp";
    }();
    path = tmpdir + "/realm.XXXXXX";
    mktemp(&path[0]);
    unlink(path.c_str());
}

TestFile::~TestFile()
{
    unlink(path.c_str());
}

InMemoryTestFile::InMemoryTestFile()
{
    in_memory = true;
}

#if defined(__has_feature) && __has_feature(thread_sanitizer)
// A helper which synchronously runs on_change() on a fixed background thread
// so that ThreadSanitizer can potentially detect issues
// This deliberately uses an unsafe spinlock for synchronization to ensure that
// the code being tested has to supply all required safety
static class TsanNotifyWorker {
public:
    TsanNotifyWorker()
    {
        m_thread = std::thread([&] { work(); });
    }

    void work()
    {
        while (true) {
            auto value = m_signal.load(std::memory_order_relaxed);
            if (value == 0 || value == 1)
                continue;
            if (value == 2)
                return;

            if (value & 1) {
                // Synchronize on the first handover of a given coordinator.
                value &= ~1;
                m_signal.load();
            }

            auto c = reinterpret_cast<realm::_impl::RealmCoordinator *>(value);
            c->on_change();
            m_signal.store(1, std::memory_order_relaxed);
        }
    }

    ~TsanNotifyWorker()
    {
        m_signal = 2;
        m_thread.join();
    }

    void on_change(const std::shared_ptr<realm::_impl::RealmCoordinator>& c)
    {
        auto& it = m_published_coordinators[c.get()];
        if (it.lock()) {
            m_signal.store(reinterpret_cast<uintptr_t>(c.get()), std::memory_order_relaxed);
        } else {
            // Synchronize on the first handover of a given coordinator.
            it = c;
            m_signal = reinterpret_cast<uintptr_t>(c.get()) | 1;
        }

        while (m_signal.load(std::memory_order_relaxed) != 1) ;
    }

private:
    std::atomic<uintptr_t> m_signal{0};
    std::thread m_thread;
    std::map<realm::_impl::RealmCoordinator*, std::weak_ptr<realm::_impl::RealmCoordinator>> m_published_coordinators;
} s_worker;

void advance_and_notify(realm::Realm& realm)
{
    s_worker.on_change(realm::_impl::RealmCoordinator::get_existing_coordinator(realm.config().path));
    realm.notify();
}

#else // __has_feature(thread_sanitizer)

void advance_and_notify(realm::Realm& realm)
{
    realm::_impl::RealmCoordinator::get_existing_coordinator(realm.config().path)->on_change();
    realm.notify();
}
#endif
