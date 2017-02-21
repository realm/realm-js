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

#include <vector>
#include <system_error>
#include <uv.h>

#include "../platform.hpp"

namespace realm {

struct FileSystemRequest : uv_fs_t {
    ~FileSystemRequest() {
        uv_fs_req_cleanup(this);
    }
};

std::string default_realm_file_directory()
{
    char buffer[MAX_PATH];
    size_t size = MAX_PATH;
    if (uv_cwd(buffer, &size) == 0) {
        return std::string(buffer, size);
    }

    return ".";
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
            throw std::system_error(req.sys_errno_, std::system_category(), uv_strerror(req.result));
        }
    }
}

void copy_bundled_realm_files()
{
    throw std::runtime_error("Realm for Node does not support this method.");
}

void remove_realm_files_from_directory(const std::string &dir_path)
{
    FileSystemRequest scandir_req;

    if (uv_fs_scandir(uv_default_loop(), &scandir_req, dir_path.c_str(), 0, nullptr) < 0) {
        throw std::system_error(scandir_req.sys_errno_, std::system_category(), uv_strerror(scandir_req.result));
    }

    std::vector<std::string> to_delete;

    uv_dirent_t entry;
    while (uv_fs_scandir_next(&scandir_req, &entry) != UV_EOF) {
        if (entry.type == UV_DIRENT_FILE) {
            std::string path(entry.name);

            static std::string suffix(".realm");
            if (path.size() > suffix.size() && path.compare(path.size() - suffix.size(), suffix.size(), suffix) == 0) {
                to_delete.push_back(path);
            }
        }
    }

    FileSystemRequest close_req;
    uv_fs_close(uv_default_loop(), &close_req, scandir_req.file.fd, nullptr);

    for (auto& path : to_delete) {
        FileSystemRequest delete_req;
        uv_fs_unlink(uv_default_loop(), &delete_req, path.c_str(), nullptr);
    }
}

} // realm
