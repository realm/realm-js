/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

#include "../platform.hpp"
 #include "../js_init.h"
#include <string>

namespace realm {

std::string default_realm_file_directory()
{
	// appFilesDir is defined in js_init.cpp
	return appFilesDir;
}

void ensure_directory_exists_for_file(const std::string &fileName)
{
}

void remove_realm_files_from_directory(const std::string &directory)
{
}
    
}
