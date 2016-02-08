/* Copyright 2016 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

#pragma once

#include <string>

extern std::string s_default_realm_directory;

namespace realm {
//
// These methods are used internally and must be implemented
// separately for each platform
//

// set the directory where realm files should be stored
void set_default_realm_file_directory(std::string dir);

// return the directory in which realm files can/should be written to
std::string default_realm_file_directory();

// create the directories for the given filename
void ensure_directory_exists_for_file(const std::string &file);

// remove all realm files in the given directory
void remove_realm_files_from_directory(const std::string &directory);

}
