# Working With Realm-JS


<!--ts-->
  * [Install Instructions For Mac](#instructions-for-macos)
  * [Hello World Projects To Practice](#test-projects)
  * [Building Realm for React Native **Android**](#building-for-android)
  * [Building Realm for React Native **iOS**](#ios)
  * [Building Realm for **NodeJS**](#building-for-nodejs)

<!--te-->


## Pre-Requisites

Clone [realm-js project](https://github.com/realm/realm-js) and install the required dependencies:

* XCode 9.4+
* [Node.js](https://nodejs.org/en/) version 10 or later. Consider [using NVM](https://github.com/nvm-sh/nvm#installing-and-updating) to enable fast switching between Node.js & NPM versions.
* Android SDK 23+ (available via [Android Studio](https://developer.android.com/studio))
* Android NDK 21.0
  - Available via the SDK Manager on Android Studio **Tools > SDK Manager**.

### Instructions for MacOS:

```sh
  #Install brew
  bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install.sh)"

  #Install NVM, OpenJDK 8 and cocoapods
  brew install nvm openjdk@8 cocoapods

```

Android Setup to build from the command-line:

```sh
# Before following this make sure java is available in the command line.
# Location of your Android SDK
export ANDROID_HOME=$HOME/Library/Android/sdk

#To install NDK
$ANDROID_HOME/tools/bin/sdkmanager --install "ndk;21.0.6113669"

#Setup NDK
export ANDROID_NDK_HOME=$ANDROID_HOME/ndk/21.0.6113669
```

### Optimisations

##### JDK
If you are a user of Android Studio you can reuse their embedded JDK instead, which save you from installing it yourself:  

```sh
# Add JAVA_HOME
export JAVA_HOME="/Applications/Android Studio.app/Contents/jre/jdk/Contents/Home"
```


##### CCache

To improve compilation speed you can use [ccache](https://ccache.dev/), to install you should do:

```sh
brew install ccache
```



### Projects For Testing

To test your changes on react native you can clone this sample project.

```sh
git clone https://github.com/cesarvr/react-native-realm sample-rn-project
cd sample-rn-project
npm install
```

To test your changes on NodeJS you can clone this example.

```sh
git clone https://github.com/cesarvr/hello-world-realm-js hello-sync
cd hello-sync
npm install
```

## Workflow Suggestion

This workflows are mere suggestions, feel free to include or improve:

### Deploying Changes

Right now you should have three folders:

```sh
  realm-js  #realm-js source code.

  hello-sync #nodejs project using realm.
  sample-rn-project #the sample react-native project.
```

What you want to do is to do all your work on the ```realm-js``` project and use the other two projects to test and deploy any new changes.

To do that you can use the help of this tool:

```sh
  cd realm-js  #Jump to the realm-js root folder.
  curl https://raw.githubusercontent.com/cesarvr/dev-lnk/master/index.js -o nlk.js #Download the file in there.
```

You can configure this tool to watch some sections of your ``realm-js`` and deploy those changes automatically to any of those projects.

Once you have the script you just need to go to the bottom and configure the files/folder you want to watch and update in your target, something similar to this:

```js
syncByAppend(
  '<source-folder>', // Source folder...
  '<target-folder>', // Target folder...
  <RegExp> /* Regular expression to match and update */
)
```



### On Android


First let's configure the ```nlk.js``` tool to watch for Android changes and deploy this into the React Native project.

Open ```nlk.js``` with your favourite text editor like ``vim``, go to the bottom and add:

```js
syncByAppend(
  './react-native/android/build/realm-react-ndk/all', // Source folder...
  '../sample-rn-project/node_modules/realm/android/src/main/jniLibs', // Target folder...
  RegExp('librealmreact.so'))  // copy librealmreact.so if a change has been detected...
```

> As you can see this is just a dumb script that copy files anytime they change... you can use [Regular Expressions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions) to handle more complex scenarios.


After adding that you can run it by doing:

```sh
node nlk.js # it will sleep and wait for changes...
```

#### Building for Android

Open a new terminal tab and start doing your changes on the ``realm-js/src`` folder for example and once your are ready you can build an Android binary by doing:


```sh
# from the realm-js root folder...

cd react-native/android/  # enter the React Native Android project.
./gradlew publishAndroid # Take a coffee...
```

As soon as the compilation finish this module will be deployed into the React Native project (``sample-rn-project``).


If you visit the script tab you will see the files that have been sync:

```sh
sync done for: librealmreact.so.  11:54:30   #arm
sync done for: librealmreact.so.  11:54:30   #x86
sync done for: librealmreact.so.  11:54:30   #x64 ...
sync done for: librealmreact.so.  11:54:30

```
> This will trigger any time a new binary object is created...


Now you can just can navigate to the React Native project and do:

```sh
npx react-native run-android
```



### iOS

For iOS the things is a bit different as per today we don't ship a pre-compiled binary like we do on Android.

But we can keep the source files in sync between the main source of truth the ``realm-js`` folder against the iOS project embedded in the React Native project (```sample-rn-project```).

First as we did with the Android project we add a new entry to the script:

```js
// Android
syncByAppend('./react-native/android/build/realm-react-ndk/all',
            '../sample-rn-project/node_modules/realm/android/src/main/jniLibs',
            RegExp('librealmreact.so'))

// iOS
syncByAppend('./src',
             '../sample-rn-project/node_modules/realm/src',
             RegExp('.*'))    
```

Now if make a change in the ```realm-js/src``` folder you will see this change propagate to your React Native project.

```sh
sync done for: js_logger.hpp.  12:54:26
sync done for: js_logger.hpp.  12:54:26
```

#### Building for iOS

Now you can just open the xcode project in `sample-rn-project` by doing:

```sh
cd sample-rn-project/ios/
pod install # Install iOS dependencies

open sample-rn-project/ios/MyAwesomeRealmApp.xcworkspace
#or just open MyAwesomeRealmApp.xcworkspace if you are inside the folder
```

After that you can press <kbd>Cmd ⌘</kbd> + <kbd>B</kbd> and see your changes compiled, then you do <kbd>Cmd ⌘</kbd> + <kbd>R</kbd> and you run the new code on the emulator.


### NodeJS

In NodeJS is really simple, we just need to sync the module generated using the included NodeJS [GYP](https://gyp.gsrc.io/).

Assuming we have the same folder structure:


```sh
  realm-js  #realm-js source code.

  hello-sync #nodejs project using realm.
  sample-rn-project #the sample react-native project.
```

We jump to the `realm-js` root folder and open the `nlk.js` script, jump to the bottom and add:

```js
// Android
syncByAppend('./react-native/android/build/realm-react-ndk/all',
            '../sample-rn-project/node_modules/realm/android/src/main/jniLibs',
            RegExp('librealmreact.so'))

// iOS
syncByAppend('./src',
             '../sample-rn-project/node_modules/realm/src',
             RegExp('.*'))    


// NodeJS  [ New ]
syncByAppend('./compiled',
          '../hello-sync/node_modules/realm/compiled',
          RegExp('realm.node'))

```

That's it run the script to start watching/sync for files:

```sh
node nlk.js
```

#### Building for NodeJS

Then once you are fine with changes, you just need to compile the NodeJS module using:

```sh
npm install --build-from-source=realm  # Take a coffee...

#... events from nlk ...
#sync done for: realm.node.  13:8:26
#sync done for: realm.node.  13:8:26

```

Once that finish you can go to your node project (``hello-sync``) and try your changes.
