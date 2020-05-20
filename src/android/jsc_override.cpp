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
#include "impl/realm_coordinator.hpp"

/**
`__attribute__((constructor))` will trigger a first call to swap_function() which will install the function hook.

The hook function is simply a technique (originally published in 1999 https://www.microsoft.com/en-us/research/project/detours/#!publications) to replace
 the original function call by another one by substituting the address of the original function `JSGlobalContextCreateInGroup` by an assembly JUMP instruction in order to branch into our custom function `create_context`
 (which has the same signature as the original).The custom function will then remove the hook to be able to invoke the original `JSGlobalContextCreateInGroup`
 in order to obtain the JS context, needed to initialize Realm.

 The assembly code to perform the jump is architecture specific, similarly for the size of this "Hook". Here's how it's calculated for the various architectures

 - ARM 32 bit:
 ARM supports two instruction mode, Thumb & ARM (with different size for the opcodes).
 if we're using Thumb then the jump is performed using the BX instruction (see https://web.eecs.umich.edu/~prabal/teaching/eecs373-f10/readings/ARMv7-M_ARM.pdf)
 BX allows to branch to a specific address stored in a global register with the option to switch instruction from Thumb to ARM. This is performed using this code
  LDR R3, [PC, #0]; <---- This load the current address referenced by the current Program Counter address with a 0 offset
  BX R3; <---- This will perform the jump

  memcpy(orig_func, "\x00\x4b\x18\x47", 4);
  memcpy(orig_func + 4, &new_func, 4);

For non-Thumb we simply set the current program PC to the address of the new function (swap_function)
    LDR	PC, [PC] <---- [PC] get the address of the current PC (remember the first call of swap_function is triggered automatically when loading the shared object) so when
                        execute this assembly later at the address of the original function, this will jump to swap_function

    memcpy(orig_func, "\x00\xf0\x9f\xe5", 4);
    memcpy(orig_func + 4, &new_func, 4);

- ARM 64 bit:
Doesn't have Thumb instruction, but also doesn't expose the program counter (PC) as a general register so it cannot be used anymore. The workaround is to use a `BR`
instruction (see https://static.docs.arm.com/ddi0596/a/DDI_0596_ARM_a64_instruction_set_architecture.pdf) (be careful to not use `BLR` accidentally BLR perform the same thing as BR
but as a side effect will set the PC to PC + 4 after the jump, 4 is the size of the instruction, the idea of BLR is to jump to a subroutine, then go back to the next instruction
in the assembly after the jump completes, the next instruction is located at current PC + 4, this is not our use case since we want to perform an unconditional jump).
    LDR X3, .+8 <--- load into the global register X3 the address of the current PC + an offset of 8 bytes
    BR X3 <---- perform the jump into the address of the new function (swap_function) located 8 bytes after the previous two assembly instructions.

    memcpy(orig_func, "\x43\x00\x00\x58\x60\x00\x1F\xD6", 8);
    memcpy(orig_func + 8, &new_func, 8);

How is the assembly transformed into hex code:
- You can use the manual instruction to work out the instruction value based on the opcodes.
- You can also write the assembly then cross-compile to access the hexcode after disassembling it
Example:
create a file `hook.s` with the following assembly content
```
.section .text
.global _start

_start:
ldr x3, .+8
br x3
````
you can now cross compile it to AARCH64 on mac using the NDK toolchain
$NDK_HOME/toolchains/arm-linux-androideabi-4.9/prebuilt/darwin-x86_64/aarch64-linux-android/bin/as hook.s -o hook.o

you can link it using
$NDK_HOME/toolchains/arm-linux-androideabi-4.9/prebuilt/darwin-x86_64/aarch64-linux-android/bin/ld hook.o -o hook

now inspect the ARM64 executable using
objdump -d hook
```
hook:	file format ELF64-aarch64-little

Disassembly of section .text:
_start:
  4000b0:	43 00 00 58 	ldr	x3, #8
  4000b4:	60 00 1f d6 	br	x3
```
This is the method used for AMR 64bit

- You can also use this online tool to convert hex to assembly & assembly to hex http://armconverter.com


The ARM_FUNCTION_HOOK_SIZE is the number of bytes the hook need to rewrite to install the jump code.

Example for AARCH64:
 It's simply two ARM64 instructions, 4 bytes each (the first memcpy is 8) and the actual function address will also be 8 bytes (second memcpy)
 so the total is 16 bytes.
*/
#if __aarch64__
#define HOOK_SIZE 16
#define ARM_FUNCTION_HOOK "\x43\x00\x00\x58\x60\x00\x1F\xD6"
#define ARM_FUNCTION_HOOK_SIZE 8
#elif defined(__arm__)
#define HOOK_SIZE 8
#define ARM_FUNCTION_HOOK "\x00\xf0\x9f\xe5"
#define ARM_FUNCTION_HOOK_SIZE 4
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
    // TODO: should we do a byte alignment for s_orig_code using alignas(16) or similar?
    static int8_t s_orig_code[HOOK_SIZE];
    static bool s_swapped = false;

    int8_t *orig_func = (int8_t*)&JSGlobalContextCreateInGroup;
    int8_t *new_func = (int8_t*)&create_context;

    bool orig_thumb = false;
#if __arm__ && !defined(__aarch64__)
    orig_thumb = (uintptr_t)orig_func % 4 != 0;
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

#if __arm__ || __aarch64__
        if (orig_thumb) {
            // LDR R3, [PC, #0]; BX R3;
            memcpy(orig_func, "\x00\x4b\x18\x47", ARM_FUNCTION_HOOK_SIZE);
            memcpy(orig_func + ARM_FUNCTION_HOOK_SIZE, &new_func, ARM_FUNCTION_HOOK_SIZE);
        } else {
            memcpy(orig_func, ARM_FUNCTION_HOOK, ARM_FUNCTION_HOOK_SIZE);
            memcpy(orig_func + ARM_FUNCTION_HOOK_SIZE, &new_func, ARM_FUNCTION_HOOK_SIZE);
        }
#else
        // TODO: It would be safer to generate an indirect jump to an absolute address since distance might be greater than +/- 2^31
        int32_t jmp_offset = (int64_t)new_func - (int64_t)orig_func - HOOK_SIZE;

        // Change original function to jump to our new one.
        *orig_func = 0xE9; // JMP
        *(int32_t*)(orig_func + 1) = jmp_offset;
#endif
    }

    s_swapped = !s_swapped;

    __builtin___clear_cache((char *)page_start, (char *)code_end);

    // Return this region to no longer being writable.
    mprotect((void*)page_start, code_end - page_start, PROT_READ | PROT_EXEC);
}
