/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

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

void remove_realm_files_from_directory(const std::string &directory)
{
    NSFileManager *manager = [NSFileManager defaultManager];
    NSString *fileDir = @(directory.c_str());
    for (NSString *path in [manager enumeratorAtPath:fileDir]) {
        if (![manager removeItemAtPath:[fileDir stringByAppendingPathComponent:path] error:nil]) {
            throw std::runtime_error((std::string)"Failed to delete file at path " + path.UTF8String);
        }
    }
}
    
}
