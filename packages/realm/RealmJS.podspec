# coding: utf-8
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

  # The source field is a required field in the podspec, but it is not meant to be used.
  # This is because the Podspec is not meant to be published into a CocoaPod repository, instead React Native uses a :path style dependency when adding this to the users projects Podfile.
  # @see https://guides.cocoapods.org/using/the-podfile.html#using-the-files-from-a-folder-local-to-the-machine
  # @see https://github.com/react-native-community/cli/blob/master/docs/autolinking.md#platform-ios
  s.source                 = { :http => 'https://github.com/realm/realm-js/blob/main/CONTRIBUTING.md#how-to-debug-react-native-podspec' }

  s.source_files           = 'binding/jsi/*.cpp',
                             'binding/apple/*.mm'

  s.public_header_files    = 'binding/apple/*.h'
  s.resource_bundles       = { 'RealmJS' => ['PrivacyInfo.xcprivacy'] }

  s.frameworks             = uses_frameworks ? ['React'] : []

  s.library                = 'c++', 'z', 'compression'

  s.pod_target_xcconfig    = {
                                # Setting up clang
                                'CLANG_CXX_LANGUAGE_STANDARD' => 'c++20',
                                'CLANG_CXX_LIBRARY' => 'libc++',
                                'GCC_PREPROCESSOR_DEFINITIONS' => '$(inherited) REALM_ENABLE_SYNC=1',
                                'GCC_SYMBOLS_PRIVATE_EXTERN' => 'YES',
                                # Header search paths are prefixes to the path specified in #include macros
                                'HEADER_SEARCH_PATHS' => [
                                  # Bootstrapper for React Native
                                  '"${PODS_TARGET_SRCROOT}/binding/apple/"',
                                  # Copy of the Realm Core headers (no longer needed as these are included in the XCFramework)
                                  # '"${PODS_TARGET_SRCROOT}/prebuilds/ios/include/"',
                                  # Logger and JS-SDK specific helpers
                                  '"${PODS_TARGET_SRCROOT}/binding/"',
                                  # Platform specific helpers used by the generated binding code
                                  '"${PODS_TARGET_SRCROOT}/bindgen/src/"',
                                  # Platform independent helpers
                                  '"${PODS_TARGET_SRCROOT}/bindgen/vendor/realm-core/bindgen/src/"',
                                  # No need for the Realm Core src, because these are coppied to 'react-native/ios/include'
                                  # '"${PODS_TARGET_SRCROOT}/bindgen/vendor/realm-core/src/"',
                                ]
                              }

  s.vendored_frameworks = 'prebuilds/apple/realm-core.xcframework'

  s.dependency 'React'
end
