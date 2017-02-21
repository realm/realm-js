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

#include <stdexcept>
#include <vector>
#include <uv.h>

#include "../platform.hpp"

namespace realm {

class UVException : public std::runtime_error {
public:
    UVException(uv_errno_t error)
    : std::runtime_error(uv_strerror(error))
    , m_error(error)
    { }

    const uv_errno_t m_error;
};

struct FileSystemRequest : uv_fs_t {
    ~FileSystemRequest() {
        uv_fs_req_cleanup(this);
    }
};

std::string default_realm_file_directory()
{
    std::vector<char> buffer;
    size_t size = 64;

    buffer.resize(size);
    if (uv_cwd(buffer.data(), &size) == UV_ENOBUFS) {
        buffer.resize(size);
        uv_cwd(buffer.data(), &size);
    }

    return std::string(buffer.data(), size);
}

void ensure_directory_exists_for_file(const std::string &file_path)
{
    size_t pos = 0;

    while ((pos = file_path.find_first_of('/', pos)) != std::string::npos) {
        // Skip for leading slash.
        if (pos == 0) {
            pos++;
            continue;
        }

        std::string dir_path = file_path.substr(0, pos++);
        FileSystemRequest req;
        if (uv_fs_mkdir(uv_default_loop(), &req, dir_path.c_str(), 0755, nullptr) < 0 && req.result != UV_EEXIST) {
            throw UVException(static_cast<uv_errno_t>(req.result));
        }
    }
}

void copy_bundled_realm_files()
{
    throw std::runtime_error("Realm for Node does not support this method.");
}

inline bool ends_with(const std::string& str, const std::string& suffix) {
    return str.size() > suffix.size() && str.compare(str.size() - suffix.size(), suffix.size(), suffix) == 0;
}

void remove_realm_files_from_directory(const std::string &dir_path)
{
    FileSystemRequest scandir_req;
    if (uv_fs_scandir(uv_default_loop(), &scandir_req, dir_path.c_str(), 0, nullptr) < 0) {
        throw UVException(static_cast<uv_errno_t>(scandir_req.result));
    }

    uv_dirent_t entry;
    while (uv_fs_scandir_next(&scandir_req, &entry) != UV_EOF) {
        if (entry.type == UV_DIRENT_FILE) {
            std::string path(dir_path + '/' + entry.name);

            static std::string realm_extension(".realm");
            if (ends_with(path, realm_extension)) {
                FileSystemRequest delete_req;
                if (uv_fs_unlink(uv_default_loop(), &delete_req, path.c_str(), nullptr) != 0) {
                    throw UVException(static_cast<uv_errno_t>(delete_req.result));
                }
            }
        }
    }
}

} // realm
