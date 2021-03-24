jobs
   \_ mac environment setup
        \_ build 
            \_ macOS x86_64 NAPI
            \_ iOS RN
   \_ linux enviroment setup
   \_ windows enviroment
        \_ Linux x86_64 NAPI
        \_ Linux armhf NAPI #raspi
        \_ Windows ia32 NAPI
        \_ Windows x64 NAPI 
        \_ Android RN
    - static code analysis 
    - 
checkout project

pretest
    eslint-ci
    jsdoc - publishHtml?

build steps
    macOS x86_64 NAPI
    Linux x86_64 NAPI
    Linux armhf NAPI #raspi
    Windows ia32 NAPI
    Windows x64 NAPI 
    # -> uploaded to remote store (for prebuild)
    Android RN
    iOS RN
    # -> binaries -> tar.gz

    upload-artifact

tests
    pre: download-artifact
    macOS node ${nodeTestVersion} Debug
    macOS node ${nodeTestVersion} Release
    macOS test runners ${nodeTestVersion}
    Linux node ${nodeTestVersion} Release
    Linux test runners ${nodeTestVersion}
    Windows node ${nodeTestVersion}
    React Native Android Release
    React Native iOS Release # react-tests
    React Native iOS Example Release # react-example
    macOS Electron Debug
    macOS Electron Release
    #Linux armhf #raspi

#prepare integration tests
    #pack up the build artifacts

run integration tests
    Node.js on Mac
    Node.js on Linux
    Electron on Mac
    Electron on Linux
    React Native on Android
    React Native on iOS
    #Linux armhf #raspi

publish
    node binary
    npm package
    tag versions