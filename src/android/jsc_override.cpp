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

#include <dlfcn.h>
#include <string.h>
#include <unistd.h>
#include <sys/mman.h>
#include <mutex>
#include <JavaScriptCore/JSContextRef.h>

#include "jsc_init.h"
#include "shared_realm.hpp"
#include "realm_coordinator.hpp"

#if __arm__
#define HOOK_SIZE 8
#else
#define HOOK_SIZE 5
#endif

bool realmContextInjected;

static void swap_function() __attribute__((constructor));

static JSGlobalContextRef create_context(JSContextGroupRef group, JSClassRef global_class)
{
    static std::mutex s_mutex;
    std::lock_guard<std::mutex> lock(s_mutex);

    // Replace JSGlobalContextCreateInGroup with its original implementation and call it.
    swap_function();
    JSGlobalContextRef ctx = JSGlobalContextCreateInGroup(group, global_class);

    // Reinstall the hook.
    swap_function();

    // Clear cache from previous instances.
    realm::_impl::RealmCoordinator::clear_all_caches();

    RJSInitializeInContext(ctx);
    realmContextInjected = true;
    return ctx;
}

static void swap_function()
{
    static int8_t s_orig_code[HOOK_SIZE];
    static bool s_swapped = false;

    int8_t *orig_func = (int8_t*)&JSGlobalContextCreateInGroup;
    int8_t *new_func = (int8_t*)&create_context;

#if __arm__
    bool orig_thumb = (uintptr_t)orig_func % 4 != 0;
    if (orig_thumb) {
        orig_func--;
    }
#endif

    size_t page_size = sysconf(_SC_PAGESIZE);
    uintptr_t page_start = (uintptr_t)orig_func & ~(page_size - 1);
    uintptr_t code_end = (uintptr_t)orig_func + HOOK_SIZE;

    // Make this memory region writable.
    mprotect((void*)page_start, code_end - page_start, PROT_READ | PROT_WRITE | PROT_EXEC);

    if (s_swapped) {
        // Copy original code back into place.
        memcpy(orig_func, s_orig_code, HOOK_SIZE);
    } else {
        // Store the original code before replacing it.
        memcpy(s_orig_code, orig_func, HOOK_SIZE);

#if __arm__
        if (orig_thumb) {
            // LDR R3, [PC, #0]; BX R3;
            memcpy(orig_func, "\x00\x4b\x18\x47", 4);
            memcpy(orig_func + 4, &new_func, 4);
        } else {
            // LDR PC, [PC, #0];
            memcpy(orig_func, "\x00\xf0\x9f\xe5", 4);
            memcpy(orig_func + 4, &new_func, 4);
        }
#else
        int32_t jmp_offset = (int64_t)new_func - (int64_t)orig_func - HOOK_SIZE;

        // Change original function to jump to our new one.
        *orig_func = 0xE9; // JMP
        *(int32_t*)(orig_func + 1) = jmp_offset;
#endif
    }

    s_swapped = !s_swapped;

#if __arm__
    // Clear ARM instruction cache.
    {
        register unsigned long begin __asm("a1") = (unsigned long)orig_func;
        register unsigned long end __asm("a2") = (unsigned long)code_end;
        register unsigned long flag __asm("a3") = 0;
        register unsigned long scno __asm("r7") = 0xf0002;
        __asm __volatile (
            "swi 0 @ sys_cacheflush"
            : "=r" (begin)
            : "0" (begin), "r" (end), "r" (flag), "r" (scno)
        );
    };
#endif
    // Return this region to no longer being writable.
    mprotect((void*)page_start, code_end - page_start, PROT_READ | PROT_EXEC);
}
