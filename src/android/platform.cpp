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

#include <string>
#include <stdlib.h>
#include <stdarg.h>
#include <unistd.h>
#include <cstdio>
#include <android/asset_manager.h>
#include <android/log.h>

#include "../platform.hpp"

#define REALM_FILE_FILTER ".realm"
#define REALM_FILE_FILTER_LEN 6

static inline bool is_realm_file(const char* str)
{
    size_t lenstr = strlen(str);
    if (REALM_FILE_FILTER_LEN > lenstr)
        return false;
    return strncmp(str + lenstr - REALM_FILE_FILTER_LEN, REALM_FILE_FILTER, REALM_FILE_FILTER_LEN) == 0;
}

static AAssetManager* s_asset_manager;
static std::string s_default_realm_directory;

namespace realm {

    void set_default_realm_file_directory(std::string dir)
    {
        s_default_realm_directory = dir;
    }

    void set_asset_manager(AAssetManager* asset_manager)
    {
        s_asset_manager = asset_manager;
    }

    std::string default_realm_file_directory()
    {
        return s_default_realm_directory;
    }

    void ensure_directory_exists_for_file(const std::string &file)
    {

    }
    
    void copy_bundled_realm_files()
    {
        AAssetDir* assetDir = AAssetManager_openDir(s_asset_manager, "");
        const char* filename = nullptr;

        while ((filename = AAssetDir_getNextFileName(assetDir)) != nullptr) {
            if (is_realm_file(filename)) {
                AAsset* asset = AAssetManager_open(s_asset_manager, filename, AASSET_MODE_STREAMING);

                char buf[BUFSIZ];
                int nb_read = 0;

                const char* dest_filename = (s_default_realm_directory + '/' + filename).c_str();
                if (access(dest_filename, F_OK ) == -1) {
                    // file doesn't exist, copy
                    FILE* out = fopen(dest_filename, "w");
                    while ((nb_read = AAsset_read(asset, buf, BUFSIZ)) > 0) {
                        fwrite(buf, nb_read, 1, out);
                    }
                    fclose(out);
                }
                AAsset_close(asset);
            }
        }
        AAssetDir_close(assetDir);
    }

    void remove_realm_files_from_directory(const std::string &directory)
    {
        std::string cmd = "rm " + s_default_realm_directory + "/*.realm " +
                          s_default_realm_directory + "/*.realm.lock";
        system(cmd.c_str());
    }

    void remove_directory(const std::string &path)
    {
        std::string cmd_clear_dir = "rm " + path + "/*";
        system(cmd_clear_dir.c_str());

        std::string cmd_rmdir = "rmdir " + path;
        system(cmd_rmdir.c_str());
    }

    void remove_file(const std::string &path)
    {
        std::string cmd = "rm " + path;
        system(cmd.c_str());
    }

    void print(const char* fmt, ...)
    {
        va_list vl;
        va_start(vl, fmt);
        __android_log_vprint(ANDROID_LOG_INFO, "RealmJS", fmt, vl);
        va_end(vl);
    }
}
