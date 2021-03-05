# VSCode Debugging

## Setup

First make sure your environment is setup by following the [building instructions](./building.md)

Then you will need the following plugins for VSCode:
* [C/C++ by Microsoft](https://github.com/Microsoft/vscode-cpptools)
* [CodeLLDB](https://github.com/vadimcn/vscode-lldb)

## Building

In order to debug C++, you must first build the project in debug mode.  This can be done with the command

```bash
$ npm run rebuild --debug
```

After this is completed there should be a `debug` folder visible in your `compiled` directory.  If not, perhaps delete the `compiled` directory and try again.

## Debugging Realm Unit Tests through Example

First lets take a look at `.vscode/launch.json`.  This contains various ways to launch commands from vscode.  For this example we will look at the command `LLDB Launch Unit Tests`.

```json
{
    "type": "lldb",
    "request": "launch",
    "name": "LLDB Launch Unit Tests",
    "program": "node",
    "args": [
        "--expose_gc",
        "${workspaceFolder}/tests/node_modules/jasmine/bin/jasmine.js",
        "spec/unit_tests.js",
        "--filter=${input:testFilter}"
    ],
    "cwd": "${workspaceFolder}/tests"
}
```

A quick read through this code shows that the launch type is `lldb` provided by the CodeLLDB extension, and it is using the `node` command to invoke the `jasmine` test framework with our `spec/unit_tests.js`. The `${input:testFilter}` will prompt us for a string to use as filter to avoid running all tests every time.

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
