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

#pragma once

#include <string>

namespace realm {
//
// These methods are used internally and must be implemented
// separately for each platform
//

class JsPlatformHelpers {
public:
    // set the directory where realm files should be stored
    static void set_default_realm_file_directory(std::string dir);

    // return the directory in which realm files can/should be written to
    static std::string default_realm_file_directory();

    // create the directories for the given filename
    static void ensure_directory_exists_for_file(const std::string& file);

    // copy all realm files from resources directory to default realm dir
    static void copy_bundled_realm_files();

    // remove all realm files in the given directory
    static void remove_realm_files_from_directory(const std::string& directory);

    // remove file at the given path
    static void remove_file(const std::string& path);

    // remove directory at the given path
    static void remove_directory(const std::string& path);

    // the CPU architecture
    static std::string get_cpu_arch();

    // print something
    static void print(const char* fmt, ...);
};
} // namespace realm
