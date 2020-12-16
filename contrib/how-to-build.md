# How To Build With `cmake`

To build this project you can still use `npm install`, but here some advice to improve your development experience:


## Getting Started

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
  npm install
```

## Compiling From Scratch

To build the project from scratch you can use the `rebuild` command:

```sh
npx cmake-js rebuild
```

## Fast Iteration

To improve the development speed, you should avoid recompiling the whole project each time you make new changes, to avoid that you can pass the `build` argument:

```sh
cmake-js build 
```
> Now `cmake` should detect changes in the workspace and compile only the necessary dependencies.

## Debug

In order to debug the binary we need to tell the compiler to add debug symbols into it:

```sh
npx cmake-js <build/rebuild> --debug
```
> Now you can use tools like lldb to debug the native module.
