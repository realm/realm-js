# VSCode Debugging

<!-- TOC generated with https://github.com/ekalinin/github-markdown-toc : gh-md-toc --insert --no-backup --hide-footer contrib/vscode-debugging.md -->

<!--ts-->
* [VSCode Debugging](#vscode-debugging)
* [Quick start](#quick-start)
   * [Setup](#setup)
   * [Debugging Realm Unit Tests through Example](#debugging-realm-unit-tests-through-example)
* [Details on debugging C++](#details-on-debugging-c)
   * [Visual Studio Code configurations](#visual-studio-code-configurations)
      * [Configuration: LLDB Debug Unit Tests](#configuration-lldb-debug-unit-tests)
      * [Configuration: LLDB Debug Integration Tests](#configuration-lldb-debug-integration-tests)
      * [Configuration: LLDB Node REPL](#configuration-lldb-node-repl)
      * [Configuration: LLDB Attach to Process](#configuration-lldb-attach-to-process)
   * [Working with lldb in VS Code](#working-with-lldb-in-vs-code)
      * [Breaking on exceptions](#breaking-on-exceptions)
      * [Inspecting/interacting with variables when paused](#inspectinginteracting-with-variables-when-paused)
      * [Advanced features](#advanced-features)
   * [Using a debug version of Node](#using-a-debug-version-of-node)
      * [Compiling a debug version of Node](#compiling-a-debug-version-of-node)
      * [Using a debug version of Node](#using-a-debug-version-of-node-1)
   * [Other C++ debugging tricks](#other-c-debugging-tricks)
      * [Inspecting the type of an auto variable](#inspecting-the-type-of-an-auto-variable)
<!--te-->

# Quick start

## Setup

First make sure your environment is setup by following the [building instructions](./building.md)

Then you will need the following plugins for VSCode:
* [C/C++ by Microsoft](https://github.com/Microsoft/vscode-cpptools)
* [CodeLLDB](https://github.com/vadimcn/vscode-lldb)

## Debugging Realm Unit Tests through Example

First lets take a look at `.vscode/launch.json`.  This contains various ways to launch commands from vscode.  For this example we will look at the command `LLDB Debug Unit Tests`.

```json
{
    "type": "lldb",
    "request": "launch",
    "name": "LLDB Debug Unit Tests",
    "program": "node",
    "args": [
        "--expose_gc",
        "${workspaceFolder}/tests/node_modules/jasmine/bin/jasmine.js",
        "spec/unit_tests.js",
        "--filter=${input:testFilter}"
    ],
    "cwd": "${workspaceFolder}/tests",
    "preLaunchTask": "Build Node Tests"
}
```

A quick read through this code shows that the launch type is `lldb` provided by the CodeLLDB extension, and it is using the `node` command to invoke the `jasmine` test framework with our `spec/unit_tests.js`. The `${input:testFilter}` will prompt us for a string to use as filter to avoid running all tests every time. The `preLaunchTask` will compile Realm JS in debug mode before starting the debug session.

When prompted for a filter, try using "testListPush" as the input. As we are fairly certain this will perform a `push` command on a realm list, we can place a breakpoint in the push function in `src/js_list.hpp` by locating the push function and clicking next to the desired line number (see example below)

![Breakpoint in Code](./assets/pushBreakpoint.png)

Now we can run the test and see what happens.  Click on the debug tab in the left bar of vscode:

![Debug Icon](./assets/debugIcon.png)

Select the `LLDB Launch Unit Tests` from the run tab:

![Debug Run Tab](./assets/debugRunTab.png)

Now press play, type "testListPush" as filter and hit <kbd>Enter</kbd>

![Enter test filter](./assets/debug-enter-test-filter.png)

We should now arrive at our new breakpoint.

![Met Breakpoint](./assets/metBreakpoint.png)

To run all tests, simply leave the filter at the default (`.`).

# Details on debugging C++

## Visual Studio Code configurations

Visual Studio Code with the [CodeLLDB](https://marketplace.visualstudio.com/items?itemName=vadimcn.vscode-lldb) extension provides a good experience for debugging C++ code using the `lldb` debugger.

The [launch.json](https://github.com/realm/realm-js/blob/master/.vscode/launch.json) file contains various useful debugger launch configurations which attach `lldb` to the `node` process so that breakpoints can be set and exceptions can be caught. These profiles can be seected from the list in the top right of the "Run and Debug" pane in VS Code.

All the launch configurations are configured to [compile Realm JS in debug mode](https://github.com/realm/realm-js/blob/master/.vscode/launch.json#L98) before starting the debug session, so you do not need to remember to compile between sessions.

### Configuration: LLDB Debug Unit Tests

This configuration will run the [unit tests](https://github.com/realm/realm-js/tree/master/tests) with `lldb` attached. By default, it will ask for the filter for the run each time you invoke it. If you are debugging a specific test, it can save time if you temporarily hardcode the filter: https://github.com/realm/realm-js/blob/master/.vscode/launch.json#L88.

### Configuration: LLDB Debug Integration Tests

This configuration will run the [integration tests](https://github.com/realm/realm-js/tree/master/tests) with `lldb` attached. By default, it will ask for the grep pattern for the run each time you invoke it. If you are debugging a specific test, it can save time if you temporarily hardcode the filter: https://github.com/realm/realm-js/blob/master/.vscode/launch.json#L117.

A pre-requisite for running these tests is to start the [https://github.com/realm/realm-js/blob/master/packages/realm-app-importer](`realm-app-importer`) script in a terminal, by running: `npx lerna bootstrap --scope @realm/integration-tests --include-dependencies && cd integration-tests/tests && npm run app-importer` – this is usually started automatically when you run the tests, but as we need to connect `lldb` directly to the `node` instance that is running the tests, you need to start it manually.

### Configuration: LLDB Node REPL

This configuration starts a `node` REPL with the debugger attached. This allows you to easily evaluate statements and jump into the C++ debugger. If you are running the same commands over and over, you may want to save these to a temporary `.js` file and add this file's path to the `args` in https://github.com/realm/realm-js/blob/master/.vscode/launch.json#L98, so that `node` runs this script instead of a REPL.

### Configuration: LLDB Attach to Process

This configuration will attach `lldb` to a running process. This can be useful for debugging Electron applications, for example, in which case you might want to connect the debugger to the `main.js` process.

When this configuration is run, it will open a process picker. You should be able to identify the correct process by searching for a known string in the application name, though it might require some trial and error!

## Working with lldb in VS Code

### Breaking on exceptions

It can be helpful to tick the `C++: on throw` and/or `C++: on catch` default breakpoints, in order to catch exceptions.

### Inspecting/interacting with variables when paused

It is sometimes possible to get useful information on variables via the "Variables" panel in the debug pane, but sometimes it is not that helpful (e.g. with NAPI objects which just show as a memory address), or you might want to call methods on an instance rather than just inspect it.

The `lldb` `p` command can be used in the "Debug Console" pane (to the right of the terminal) to do this when you are paused at a breakpoint – you can inspect/interact with anything in the scope of the current breakpoint, for example `p my_array.size()` or `p napi_object.Type()`.

Note that this might not always work, e.g. sometimes it can crash when trying to inspect certain properties, in which case a useful technique is to add a line of code storing the value you are interested in temporarily so that you can inspect it in the variables window, e.g. `auto temp_type = napi_object.Type();`.

### Advanced features

There are many useful advanced `lldb` features, for example:
- you can add a breakpoint whenever a named method is called, even if you can't locate it in the source, with `br s -M method_name`, e.g. `br s -M ~realm::js::MyClass` to break whenever `realm::js::MyClass`'s destructor is called
- you can print the memory address of a variable with `expr --raw -- &variable_name`, which can be useful when trying to work out if you are accidentally working with a copy of an object
- you can make it break whenever a certain variable is read or modified, by right clicking on it in the Variables pane and clicking "Break on Value Read/Change/Access".

The [`lldb` documentation](https://lldb.llvm.org/) and the [`CodeLLDB` documentation](https://github.com/vadimcn/vscode-lldb/blob/master/MANUAL.md) are useful resources.

## Using a debug version of Node

It can sometimes be useful to use a debug version of Node. This allows you to view the source code of Node and v8 when inspecting stack traces, rather than the assembly code, and can also yield more useful stack traces when debugging deep C++ integration issues.

### Compiling a debug version of Node

1. Download the source code from https://nodejs.org/en/download/
2. Unzip the source code to wherever you want to keep the debug version of Node (note that the debug symbol paths get hardcoded, so you need to recompile if you move it around after compilation)
3. From the root of the Node source directory, run `./configure --debug -C` – this configures the build in debug mode, and `-C` outputs `compile_commands.json` so that you can get better debug information in VS Code.
4. Run `make -j32` to compile Node. `-j32` specifies the number of jobs to run in parallel – it seems that 2x the number of threads (which is 2x the number of cores) is recommended. You can play around with different values – 32 seems to saturate the CPU of a Macbook Pro 16" (which has 8 cores = 16 threads), while still leaving it usable, and compiles in under half an hour.

### Using a debug version of Node

To use a debug version of Node, change the path to `node` for the `lldb` launch configuration you are using to point to the debug version you compiled above, e.g. change https://github.com/realm/realm-js/blob/master/.vscode/launch.json#L103 to `"program": "/Users/my_name/dev/node-v16.13.2/out/Debug/node"`. You should now get full source code in stack traces.

You can also open the Node source directory in VS Code and use the launch config from https://joyeecheung.github.io/blog/2018/12/31/tips-and-tricks-node-core/ (which has some other useful tips) if you wish to go deeper into the Node source code.

## Other C++ debugging tricks

### Inspecting the type of an `auto` variable

Sometimes it can be non-obvious what type an `auto` variable has. The debugger can potentially help you here, by adding a breakpoint then inspecting the type in the Variables pane, but an alternative approach is to use the following template trick (from https://stackoverflow.com/a/38820784/17700221):

1. Add `template<typename T> struct TD;` somewhere at the top level of a header file before the code you are looking at (probably in the `.hpp` file you are working with, just above the method in question, for Realm JS)

2. Add `TD<decltype(variable_name)> td;` after the variable (`variable_name`) who's type you want to inspect.

3. Now when you compile, you will get an error like `error: implicit instantiation of undefined template 'realm::js::TD<const realm::ObjectSchema &>'` – the type parameter of `TD` is the type of the variable in question, in this case `const realm::ObjectSchema &`.