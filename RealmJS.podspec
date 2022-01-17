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

  # The source field is a required field in the podspec, but it is not ment to be used.
  # This is because the Podspec is not ment to be published into a CocoaPod repository, instead React Native uses a :path style dependency when adding this to the users projects Podfile.
  # @see https://guides.cocoapods.org/using/the-podfile.html#using-the-files-from-a-folder-local-to-the-machine
  # @see https://github.com/react-native-community/cli/blob/master/docs/autolinking.md#platform-ios
  s.source                 = { :http => 'https://github.com/realm/realm-js/blob/master/CONTRIBUTING.md#how-to-debug-react-native-podspec' }

  s.source_files           = 'react-native/ios/RealmReact/*.mm'
  s.public_header_files    = 'react-native/ios/RealmReact/*.h'

  s.frameworks             = uses_frameworks ? ['React'] : []

  s.library                = 'c++', 'z', 'compression'

  s.pod_target_xcconfig    = {
                                # Setting up clang
                                'CLANG_CXX_LANGUAGE_STANDARD' => 'c++17',
                                'CLANG_CXX_LIBRARY' => 'libc++',
                                # Setting the current project version and versioning system to get a symbol for analytics
                                'CURRENT_PROJECT_VERSION' => s.version,
                                'VERSIONING_SYSTEM' => 'apple-generic',
                                # Header search paths are prefixes to the path specified in #include macros
                                'HEADER_SEARCH_PATHS' => [
                                  '"$(PODS_TARGET_SRCROOT)/react-native/ios/RealmReact/"',
                                  '"$(PODS_ROOT)/Headers/Public/React-Core/"'
                                  #"'#{app_path}/ios/Pods/Headers/Public/React-Core'" # Use this line instead of 👆 while linting
                                ].join(' ')
                              }

  # TODO: Consider providing an option to build with the -dbg binaries instead
  s.vendored_frameworks = 'react-native/ios/realm-js-ios.xcframework'

  s.dependency 'React'
end
