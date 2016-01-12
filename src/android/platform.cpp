/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

#include "../platform.hpp"
 #include "../js_init.h"
#include <string>

std::string s_default_realm_directory;

namespace realm {

void set_default_realm_file_directory(std::string dir) {
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
}
    
}
