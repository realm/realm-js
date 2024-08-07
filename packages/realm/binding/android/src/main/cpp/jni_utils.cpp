/*
 * Copyright 2018 Realm Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

#include "jni_utils.hpp"

#include <memory>

using namespace realm::jni_util;

static std::unique_ptr<JniUtils> s_instance;

void JniUtils::initialize(JavaVM* vm, jint vm_version) noexcept
{
    s_instance = std::unique_ptr<JniUtils>(new JniUtils(vm, vm_version));
}

void JniUtils::release()
{
    s_instance.release();
}

JNIEnv* JniUtils::get_env(bool attach_if_needed)
{
    JNIEnv* env;
    if (s_instance->m_vm->GetEnv(reinterpret_cast<void**>(&env), s_instance->m_vm_version) != JNI_OK) {
        if (attach_if_needed) {
            s_instance->m_vm->AttachCurrentThread(&env, nullptr);
        }
    }

    return env;
}

void JniUtils::detach_current_thread()
{
    s_instance->m_vm->DetachCurrentThread();
}
