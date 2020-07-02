require 'json'

package = JSON.parse(File.read(File.expand_path('package.json', __dir__)))

app_path = File.expand_path('../..', __dir__)

# There is no API to detect the use of "use_frameworks!" in the Podfile which depends on this Podspec.
# The "React" framework is only available and should be used if the Podfile calls use_frameworks!
# Therefore we make an assumption on the location of the Podfile and check if it contains "use_frameworks!" ...
podfile_path = File.expand_path('ios/Podfile', app_path)

if !ENV['REALM_USE_FRAMEWORKS'].present?
  begin
    podfile = File.read(podfile_path)
    uses_frameworks = podfile.scan(/\n\s*use_frameworks!\n/).any?
  rescue
    uses_frameworks = false
  end
else
  uses_frameworks = ENV['REALM_USE_FRAMEWORKS'] == 'true' ? true : false
end

if ENV['DEBUG_REALM_JS_PODSPEC'].present?
  puts "RealmJS thinks the Podfile #{uses_frameworks ? "is" : "is not"} calling use_frameworks!"
end

Pod::Spec.new do |s|
  s.name                   = "RealmJS"
  s.version                = package['version']
  s.summary                = package['description']
  s.license                = package['license']

  s.authors                = package['author']
  s.homepage               = package['homepage']
  s.platform               = :ios, '9.0'

  # The source field is a required field in the podspec, but it is not ment to be used.
  # This is because the Podspec is not ment to be published into a CocoaPod repository, instead React Native uses a :path style dependency when adding this to the users projects Podfile.
  # @see https://guides.cocoapods.org/using/the-podfile.html#using-the-files-from-a-folder-local-to-the-machine
  # @see https://github.com/react-native-community/cli/blob/master/docs/autolinking.md#platform-ios
  s.source                 = { :http => 'https://github.com/realm/realm-js/blob/master/CONTRIBUTING.md#how-to-debug-react-native-podspec' }

  # We run the download-realm.js script both:
  # 1) As "prepare_command" (executed when running `pod install`), to have the files available when  to modify the XCode project correctly.
  # 2) As "script_phase" (executed by XCode when building), to allow developers to commit their `ios/Pods` directory to their repository (and not run `pod install` after cloning it).
  # Note: It leaves a lock file, ensuring it will only download the archive once.
  s.prepare_command        = 'node ./scripts/download-realm.js ios --sync'
  s.script_phase           = { :name => 'Download Realm Core & Sync',
                               :script => 'echo "Using Node.js $(node --version)" && node ${PODS_TARGET_SRCROOT}/scripts/download-realm.js ios --sync',
                               :execution_position => :before_compile }

  s.source_files           = 'src/*.cpp',
                             'src/jsc/*.cpp',
                             'src/ios/*.mm',
                             'src/object-store/src/*.cpp',
                             'src/object-store/src/sync/*.cpp',
                             'src/object-store/src/sync/impl/*.cpp',
                             'src/object-store/src/sync/impl/apple/*.cpp',
                             'src/object-store/src/impl/*.cpp',
                             'src/object-store/src/impl/apple/*.cpp',
                             'src/object-store/src/util/*.cpp',
                             'src/object-store/src/util/apple/*.cpp',
                             'react-native/ios/RealmReact/*.mm',
                             'vendor/*.cpp'

  s.frameworks             = uses_frameworks ? ['JavaScriptCore', 'React'] : ['JavaScriptCore']

  s.library                = 'c++', 'z'
  s.compiler_flags         = '-DREALM_HAVE_CONFIG -DREALM_ENABLE_SYNC'
  s.pod_target_xcconfig    = { # Ensures ccache is used if installed on the users machine
                               'CC' => '$(PODS_TARGET_SRCROOT)/scripts/ccache-clang.sh',
                               'CXX' => '$(PODS_TARGET_SRCROOT)/scripts/ccache-clang++.sh',
                               # Setting up clang
                               'CLANG_CXX_LANGUAGE_STANDARD' => 'c++14',
                               'CLANG_CXX_LIBRARY' => 'libc++',
                               # Disabling warnings that object store, core and sync has a lot of
                               'CLANG_WARN_OBJC_IMPLICIT_RETAIN_SELF' => 'NO',
                               'CLANG_WARN_DOCUMENTATION_COMMENTS' => 'NO',
                               # Setting the current project version and versioning system to get a symbol for analytics
                               'CURRENT_PROJECT_VERSION' => s.version,
                               'VERSIONING_SYSTEM' => 'apple-generic',
                               # Header search paths are prefixes to the path specified in #include macros
                               'HEADER_SEARCH_PATHS' => [
                                 '"$(PODS_TARGET_SRCROOT)/src/"',
                                 '"$(PODS_TARGET_SRCROOT)/src/jsc/"',
                                 '"$(PODS_TARGET_SRCROOT)/src/object-store/src/"',
                                 '"$(PODS_TARGET_SRCROOT)/src/object-store/external/json/"',
                                 '"$(PODS_TARGET_SRCROOT)/vendor/"',
                                 '"$(PODS_TARGET_SRCROOT)/vendor/realm-ios/include/"',
                                 '"$(PODS_TARGET_SRCROOT)/react-native/ios/RealmReact/"',
                                 '"$(PODS_ROOT)/Headers/Public/React-Core/"'
                                 # "'#{app_path}/ios/Pods/Headers/Public/React-Core'" # Use this line instead of 👆 while linting
                               ].join(' ')
                             }

  # TODO: Consider providing an option to build with the -dbg binaries instead
  s.ios.vendored_libraries = 'vendor/realm-ios/librealm-ios.a', 'vendor/realm-ios/librealm-parser-ios.a'
  # s.watchos.vendored_libraries = 'vendor/realm-ios/librealm-watchos.a', 'vendor/realm-ios/librealm-parser-watchos.a'
  # s.tvos.vendored_libraries = 'vendor/realm-ios/librealm-tvos.a', 'vendor/realm-ios/librealm-parser-tvos.a'

  s.dependency 'React'
  # TODO: Ensure the same version of GCDWebServer is used for Android
  s.dependency 'GCDWebServer'
end
