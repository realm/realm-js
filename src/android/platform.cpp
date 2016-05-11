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
#include <unistd.h>
#include <cstdio>
#include <android/log.h>
#include <android/asset_manager.h>
#include "../platform.hpp"

#define REALM_FILE_FILTER ".realm"
#define REALM_FILE_FILTER_LEN strlen(REALM_FILE_FILTER)
AAssetManager* androidAssetManager;
inline bool isRealmFile(const char *str)
{
    size_t lenstr = strlen(str);
    if (REALM_FILE_FILTER_LEN > lenstr)
        return false;
    return strncmp(str + lenstr - REALM_FILE_FILTER_LEN, REALM_FILE_FILTER, REALM_FILE_FILTER_LEN) == 0;
}

std::string s_default_realm_directory;

namespace realm {

    void set_default_realm_file_directory(std::string dir)
    {
        s_default_realm_directory = dir;
    }

    void set_asset_manager(AAssetManager* assetManager)
    {
        androidAssetManager = assetManager;
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
        AAssetDir* assetDir = AAssetManager_openDir(androidAssetManager, "");

        const char* filename = (const char*)NULL;
        while ((filename = AAssetDir_getNextFileName(assetDir)) != NULL)
        {
          if (isRealmFile(filename))
          {
            AAsset* asset = AAssetManager_open(androidAssetManager, filename, AASSET_MODE_STREAMING);

            char buf[BUFSIZ];
            int nb_read = 0;

            const char* destFilename = (s_default_realm_directory + '/' + filename).c_str();
            if(access(destFilename, F_OK ) == -1 ) {
                // file doesn't exist, copy
                FILE* out = fopen(destFilename, "w");
                while ((nb_read = AAsset_read(asset, buf, BUFSIZ)) > 0)
                {
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
}
