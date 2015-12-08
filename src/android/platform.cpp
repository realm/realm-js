/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

#include "../platform.hpp"
#include <string>

namespace realm {

std::string default_realm_file_directory()
{
    return std::string("");
}

void ensure_directory_exists_for_file(const std::string &fileName)
{
}

void remove_realm_files_from_directory(const std::string &directory)
{
}
    
}
