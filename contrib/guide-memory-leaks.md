# Guide: Debugging memory leaks

You're debugging an issue where using Realm JS takes up lot of memory, perhaps it grows linearly as the program runs and perhaps the process exits with out of memory exceptions.

Generally speaking memory leaks will fall into one of two categories:

- JavaScript objects referencing each other in a way that prevents garbage collection.
- Everything else.

## Leaking JavaScript objects

There's a couple of reasons this guide won't delve too much into this type of leak:
- JavaScript is garbage collected, which limits the risk of the most obvious mistakes.
- JavaScript is a minority language in our codebase.
- This is not where we've had leaks historically.

### Running a Node.js script (attaching with Chrome dev-tools)

Since both Node.js and Chrome are using the V8 JavaScript engine, we can use the Chromium dev-tools to inspect the process on any of our supported development platforms.

Run the process with the `--inspect` (or `--inspect-brk` to pause the process until the debugger attach) runtime parameter:

```
node --inspect index.js
```

Navigate a Chromium browser to and click the "inspect" link next to the target representing the Node.js process

```
chrome://inspect
```

Besides access to the console, ability to set breakpoints and execute code step-by-step, this allows you to profile memory allocation by taking and comparing snapshots of the JavaScript heap.

## Everything else ...

Majority of our code is C++ code wrapping the Realm Object Store to expose object and property access. This is probably the part of our repository most ripe for memory leaks.

### Running a Node.js script or React Native App (attaching with Instruments for macOS)

Instruments can either attach to a running process (on the host or a simulator) or you can "Choose Target ..." to have Instruments start and run the app (making it possible to attach from the beginning).

An advantage is that it provides a great GUI. Disadvantage is that it cannot attach to all processes (ex Android process running in a simulator) and that it's only available on macOS.

### Running a Node.js script (taking heap snapshots with Google Performance Tools)

[Google Performance Tools / gperftools](https://github.com/gperftools/gperftools) is a library that either gets statically linked to a program or dynamically loaded at runtime.

> gperftools is a collection of a high-performance multi-threaded malloc() implementation, plus some pretty nifty performance analysis tools.

gperftools can be installed using brew.

```
brew install gperftools
```

Start a Node.js and inject the tcmalloc dynamic library (use `LD_LIBRARY` environment variable on Linux).

```
HEAPPROFILE=heapprof DYLD_INSERT_LIBRARIES=/usr/local/Cellar/gperftools/2.8.1/lib/libtcmalloc.dylib node index.js
```

This will periodically save a snapshot of the heap to disk in the current working directory.

You can use the `pprof` CLI to generate an output (the example below outputs a `perf.svg` SVG) between a `base` snapshot (`heapprof.0001.heap` below) and a later snapshot `heapprof.0002.heap`.

```
pprof --svg --base=heapprof.0001.heap --add_lib=node_modules/realm/compiled/napi-v4_darwin_x64/realm.node $(which node) heapprof.0002.heap > perf.svg
```

Note: You might need to install the Graphviz tool as well (running `brew install gv` on macOS).

The SVG can be inspected to get an idea of the flow of allocations and hopefully locate the source of any memory leaks.

### Running a Node.js script using Valgrind

Some might say that Valgrind is not exactly the "new kid on the block" and as such has a UI and output which is harder to wrap your head around. Valgrind can be installed [via a brew tab](https://github.com/LouisBrunner/valgrind-macos) on macOS. 

```
brew tap LouisBrunner/valgrind
brew install --HEAD LouisBrunner/valgrind/valgrind
```

Running a Node.js script via Valgrind is pretty simple

```
valgrind --leak-check=full node index.js
```
