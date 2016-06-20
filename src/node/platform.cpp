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

#include <dirent.h>
#include <string.h>
#include <sys/stat.h>
#include <stdlib.h>

#include <system_error>

#include "../platform.hpp"

namespace realm {

std::string default_realm_file_directory()
{
    // Relative paths should always be relative to the current working directory.
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
        if (mkdir(dir_path.c_str(), 0755) != 0 && errno != EEXIST) {
            throw std::system_error(errno, std::system_category());
        }
    }
}

void copy_bundled_realm_files()
{
    throw std::runtime_error("Realm for Node does not support this method.");
}

void remove_realm_files_from_directory(const std::string &dir_path)
{
    std::string delete_realms = "rm -rf '" + dir_path + "'/*.realm*";
    system(delete_realms.c_str());
}

} // realm
