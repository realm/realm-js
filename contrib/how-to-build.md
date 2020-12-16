# How To Build With `cmake`

To build this project you can still use `npm install`, but here some advice to improve your development experience:


## Getting Started

First clone the project:
```sh
git clone git@github.com:realm/realm-js.git

# The only branch supporting cmake at the moment is develop
git checkout develop
```

Pull the submodules:

```sh
git submodule update --init --recursive
```
> If this folder `src/object-store` exist then do a `git clean -xfd`.



## Configuration
Now you should get [cmake-js](https://www.npmjs.com/package/cmake-js) which is a [node-gyp](https://github.com/nodejs/node-gyp) replacement:

```sh
  npm install cmake-js -g
```

## Compiling From Scratch

To build the project from scratch you can use the `rebuild` command:

```sh
cmake-js rebuild
```

## Compiling Changes

To improve the development speed, you should avoid recompiling the whole project each time you make a change, that can be achieved passing the `build` argument:

```sh
cmake-js build
```

## Debug

In order to debug the binary we need to tell the compiler to add debug symbols into it:

```sh
cmake-js <build/rebuild> --debug

# Now you can use tools like lldb to debug the native module.
```
