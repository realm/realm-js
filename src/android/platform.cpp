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

#include "../platform.hpp"
 #include "../js_init.h"
#include <string>
#include <stdlib.h>

std::string s_default_realm_directory;

namespace realm {

    void set_default_realm_file_directory(std::string dir)
    {
        s_default_realm_directory = dir;
    }

    std::string default_realm_file_directory()
    {
        return s_default_realm_directory;
    }

    void ensure_directory_exists_for_file(const std::string &fileName)
    {
    }

    void remove_realm_files_from_directory(const std::string &directory)
    {
        std::string cmd = "rm " + s_default_realm_directory + "/*.realm " +
                          s_default_realm_directory + "/*.realm.lock";
        system(cmd.c_str());
    }
}
