# Build using Mac Catalyst
This page details steps required for building your Realm application when
using [Mac Catalyst](https://developer.apple.com/mac-catalyst/) with [React
Native version 0.64 and below](https://reactnative.dev/versions).

> **NOTE:**
> Version 10.6.0 and above of the Realm React Native SDK supports Mac Catalyst.
>

> **IMPORTANT:**
> Version 0.65 and above of React Native do not require these additional steps to build using Mac Catalyst.
>

> Seealso:
> Install the React Native SDK
>

## Procedure
#### Update Your Build Phase Settings
Before you can use Mac Catalyst in your React Native application, you must
specify the platform name. Click Build Phases in XCode, and within
the Bundle React Native code and images tab, add the following to
specify "ios" as the platform name.

```none
export PLATFORM_NAME=ios
```

#### Update Your Podfile
> **NOTE:**
> This is a temporary step that will not be necessary when the following Cocoapods issue is solved:
[[Catalyst] Podspec Resource Bundle requires a development team](https://github.com/CocoaPods/CocoaPods/issues/8891)
>

Currently, there is a [Cocoapods bug](https://github.com/CocoaPods/CocoaPods/issues/8891) that causes XCode to require a development
team when building for Mac Catalyst. This bug prevents signing locally. As a
workaround, you can alter your Podfile to fix your bundle target's signing
certificate to sign to run locally.

Replace the post-install script in your Podfile by removing the following lines:

```none
  :caption: /ios/Podfile
post_install do |installer|
  react_native_post_install(installer)
end
```

And copy the following lines where your previous post-install script was:

```none
  :caption: /ios/Podfile
post_install do |installer|
  react_native_post_install(installer)
  installer.pods_project.targets.each do |target|
    # Fix bundle targets' 'Signing Certificate' to 'Sign to Run Locally'
    if target.respond_to?(:product_type) and target.product_type == "com.apple.product-type.bundle"
      target.build_configurations.each do |config|
        config.build_settings['CODE_SIGN_IDENTITY[sdk=macosx*]'] = '-'
      end
    end
  end
end
```

#### Activate and Test Catalyst in Your Project
To test out Catalyst in your project, activate Mac in the general
tab of your XCode project workspace. To do this, click Mac in the
Deployment Info section. Select "Scale Interface to Match iPad".
This makes "My Mac" selectable, allowing you to run your application on your Mac.

