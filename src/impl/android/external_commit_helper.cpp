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

#include "impl/external_commit_helper.hpp"

#include "impl/realm_coordinator.hpp"


#include <assert.h>
#include <fcntl.h>
#include <sstream>
#include <sys/epoll.h>
#include <sys/time.h>
#include <system_error>
#include <unistd.h>
#include <android/log.h>

using namespace realm;
using namespace realm::_impl;

const char* log_tag = "REALM";
namespace {
// Write a byte to a pipe to notify anyone waiting for data on the pipe
void notify_fd(int fd)
{
    while (true) {
        char c = 0;
        ssize_t ret = write(fd, &c, 1);
        if (ret == 1) {
            break;
        }

        // If the pipe's buffer is full, we need to read some of the old data in
        // it to make space. We don't just read in the code waiting for
        // notifications so that we can notify multiple waiters with a single
        // write.
        assert(ret == -1 && errno == EAGAIN);
        char buff[1024];
        read(fd, buff, sizeof buff);
    }
}
} // anonymous namespace

void ExternalCommitHelper::FdHolder::close()
{
    if (m_fd != -1) {
        ::close(m_fd);
    }
    m_fd = -1;
}

ExternalCommitHelper::ExternalCommitHelper(RealmCoordinator& parent)
: m_parent(parent)
{
    m_kq = epoll_create(1);
    if (m_kq == -1) {
        throw std::system_error(errno, std::system_category());
    }

    auto path = parent.get_path() + ".note";

    // Create and open the named pipe
    int ret = mkfifo(path.c_str(), 0600);
    if (ret == -1) {
        int err = errno;
        if (err == ENOTSUP) {
            // Filesystem doesn't support named pipes, so try putting it in tmp instead
            // Hash collisions are okay here because they just result in doing
            // extra work, as opposed to correctness problems
            std::ostringstream ss;
            ss << getenv("TMPDIR");
            ss << "realm_" << std::hash<std::string>()(path) << ".note";
            path = ss.str();
            ret = mkfifo(path.c_str(), 0600);
            err = errno;
        }
        // the fifo already existing isn't an error
        if (ret == -1 && err != EEXIST) {
            throw std::system_error(err, std::system_category());
        }
    }

    m_notify_fd = open(path.c_str(), O_RDWR);
    if (m_notify_fd == -1) {
        throw std::system_error(errno, std::system_category());
    }

    // Make writing to the pipe return -1 when the pipe's buffer is full
    // rather than blocking until there's space available
    ret = fcntl(m_notify_fd, F_SETFL, O_NONBLOCK);
    if (ret == -1) {
        throw std::system_error(errno, std::system_category());
    }

    // Create the anonymous pipe
    int pipeFd[2];
    ret = pipe(pipeFd);
    if (ret == -1) {
        throw std::system_error(errno, std::system_category());
    }

    m_shutdown_read_fd = pipeFd[0];
    m_shutdown_write_fd = pipeFd[1];

    m_thread = std::thread([=] {
        try {
            listen();
        }
        catch (std::exception const& e) {
            fprintf(stderr, "uncaught exception in notifier thread: %s: %s\n", typeid(e).name(), e.what());
            __android_log_print(ANDROID_LOG_ERROR, log_tag, "uncaught exception in notifier thread: %s: %s", typeid(e).name(), e.what());
            throw;
        }
        catch (...) {
            fprintf(stderr,  "uncaught exception in notifier thread\n");
            __android_log_print(ANDROID_LOG_ERROR, log_tag, "uncaught exception in notifier thread");
            throw;
        }
    });
}

ExternalCommitHelper::~ExternalCommitHelper()
{
    notify_fd(m_shutdown_write_fd);
    m_thread.join(); // Wait for the thread to exit
}

void ExternalCommitHelper::listen()
{
    pthread_setname_np(pthread_self(), "RLMRealm notification listener");

    int ret;

    struct epoll_event event[2];

    event[0].events = EPOLLIN | EPOLLET;
    event[0].data.fd = m_notify_fd;
    ret = epoll_ctl(m_kq, EPOLL_CTL_ADD, m_notify_fd, &event[0]);
    assert(ret == 0);

    event[1].events = EPOLLIN;
    event[1].data.fd = m_shutdown_read_fd;
    ret = epoll_ctl(m_kq, EPOLL_CTL_ADD, m_shutdown_read_fd, &event[1]);
    assert(ret == 0);

    while (true) {
      struct epoll_event ev;
      ret = epoll_wait(m_kq, &ev, 1, -1);
      assert(ret >= 0);
      if (ret == 0) {
        // Spurious wakeup; just wait again
        continue;
      }


      if (ev.data.u32 == (uint32_t)m_shutdown_read_fd) {
        return;
      }
      assert(ev.data.u32 == (uint32_t)m_notify_fd);

      m_parent.on_change();
    }
}


void ExternalCommitHelper::notify_others()
{
    notify_fd(m_notify_fd);
}
