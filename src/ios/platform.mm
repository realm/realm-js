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

#include "platform.hpp"
#include <string>

#import <Foundation/Foundation.h>

namespace realm {

std::string default_realm_file_directory()
{
#if TARGET_OS_IPHONE
    // On iOS the Documents directory isn't user-visible, so put files there
    NSString *path = NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES)[0];
#else
    // On OS X it is, so put files in Application Support. If we aren't running
    // in a sandbox, put it in a subdirectory based on the bundle identifier
    // to avoid accidentally sharing files between applications
    NSString *path = NSSearchPathForDirectoriesInDomains(NSApplicationSupportDirectory, NSUserDomainMask, YES)[0];
    if (![[NSProcessInfo processInfo] environment][@"APP_SANDBOX_CONTAINER_ID"]) {
        NSString *identifier = [[NSBundle mainBundle] bundleIdentifier];
        if ([identifier length] == 0) {
            identifier = [[[NSBundle mainBundle] executablePath] lastPathComponent];
        }
        path = [path stringByAppendingPathComponent:identifier];

        // create directory
        [[NSFileManager defaultManager] createDirectoryAtPath:path
                                  withIntermediateDirectories:YES
                                                   attributes:nil
                                                        error:nil];
    }
#endif
    return std::string(path.UTF8String);
}

void ensure_directory_exists_for_file(const std::string &fileName)
{
    NSString *docsDir = [@(fileName.c_str()) stringByDeletingLastPathComponent];
    NSFileManager *manager = [NSFileManager defaultManager];

    if (![manager fileExistsAtPath:docsDir]) {
        NSError *error = nil;
        [manager createDirectoryAtPath:docsDir withIntermediateDirectories:YES attributes:nil error:&error];
        if (error) {
            throw std::runtime_error([[error description] UTF8String]);
        }
    }
}

void copy_bundled_realm_files()
{
    NSString *docsDir = @(default_realm_file_directory().c_str());
    NSFileManager *manager = [NSFileManager defaultManager];
    for (id bundle in [NSBundle allBundles]) {
        NSString *resourcePath = [bundle resourcePath];
        for (NSString *path in [manager enumeratorAtPath:resourcePath]) {
            if (![path containsString:@".realm"]) {
                continue;
            }
            
            NSString *docsPath = [docsDir stringByAppendingPathComponent:path];
            if ([manager fileExistsAtPath:docsPath]) {
                continue;
            }
            
            if (![manager copyItemAtPath:[resourcePath stringByAppendingPathComponent:path] toPath:docsPath error:nil]) {
                throw std::runtime_error((std::string)"Failed to copy file at path " + path.UTF8String + " to path " + docsPath.UTF8String);
            }
        }
    }
}
    
void remove_realm_files_from_directory(const std::string &directory)
{
    NSFileManager *manager = [NSFileManager defaultManager];
    NSString *fileDir = @(directory.c_str());

    for (NSString *path in [manager enumeratorAtPath:fileDir]) {
        if (![path.pathExtension isEqualToString:@"realm"] && ![path.pathExtension isEqualToString:@"realm.lock"] && ![path.pathExtension isEqualToString:@"realm.management"]) {
            continue;
        }
        if (![manager removeItemAtPath:[fileDir stringByAppendingPathComponent:path] error:nil]) {
            throw std::runtime_error((std::string)"Failed to delete file at path " + path.UTF8String);
        }
    }
}
    
}
