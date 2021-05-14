////////////////////////////////////////////////////////////////////////////
//
// Copyright 2021 Realm Inc.
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

#if REALM_ANDROID
#include <android/log.h>
#else
#include <iostream>
#endif

namespace realm {
    namespace js {
        namespace utils {
            struct NoLogs{
                static void info(std::string title, std::string message){
                    //By leaving this empty the compiler is allowed to retire this completely.
                }
            };

#if REALM_ANDROID
            struct AndroidLogs{
                static void info(std::string title, std::string message){
                    __android_log_print(ANDROID_LOG_INFO, title.c_str(), "%s",
                                        message.c_str());
                }
            };
#else
            struct IOSLogs{
                static void info(std::string title, std::string message){
                    std::cout << title.c_str() << ": " << message.c_str() << "\n";
                }
            };
#endif

            struct Logs: public NoLogs {};
        }
    }
}