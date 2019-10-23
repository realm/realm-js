require 'json'

package = JSON.parse(File.read(File.expand_path('package.json', __dir__)))

# Building the podspec from a local .git repository when developing - GitHub otherwise
git_path_local = File.expand_path('.git', __dir__)
git_path = File.directory?(git_path_local) ? "file://#{git_path_local}" : 'https://github.com/realm/realm-js.git'

node_modules_path = File.expand_path('../../node_modules', __dir__)
react_native_module_path = File.expand_path('react-native', node_modules_path)
if not File.directory?(react_native_module_path)
  raise "Couldn't find React Native node module (#{react_native_module_path}) - did you install `npm install react-native`?"
end

Pod::Spec.new do |s|
  s.name                   = "Realm"
  s.version                = package['version']
  s.summary                = package['description']
  s.license                = package['license']

  s.authors                = package['author']
  s.homepage               = package['homepage']
  s.platform               = :ios, '9.0'

  s.source                 = { :git => git_path, :tag => "v#{s.version}", :submodules => true }

  s.prepare_command        = 'node ./scripts/download-realm.js ios --sync'

  source_files             = 'react-native/ios/RealmReact/*.mm',
                             'src/*.cpp',
                             'src/ios/*.mm',
                             'src/jsc/*.cpp',
                             'src/object-store/src/*.cpp',
                             'src/object-store/src/sync/*.cpp',
                             'src/object-store/src/sync/impl/*.cpp',
                             'src/object-store/src/sync/impl/apple/*.cpp',
                             'src/object-store/src/impl/*.cpp',
                             'src/object-store/src/impl/apple/*.cpp',
                             'src/object-store/src/util/*.cpp',
                             'src/object-store/src/util/apple/*.cpp'

  header_files             = 'react-native/ios/RealmReact/*.h',
                             'src/object-store/src/*.hpp',
                             'src/object-store/src/sync/*.hpp',
                             'src/object-store/src/sync/impl/*.hpp',
                             'src/object-store/src/impl/*.hpp',
                             'src/object-store/src/util/*.hpp',
                             'src/object-store/external/catch/include/*.hpp',
                             'src/object-store/external/json/*.hpp',
                             'src/jsc/*.{h,hpp}',
                             'src/*.hpp'
  
  s.source_files           = source_files + header_files
  
  # s.framework              = 'Security'
  s.compiler_flags         = '-DREALM_HAVE_CONFIG -DREALM_ENABLE_SYNC'
  s.header_mappings_dir    = '.'
  s.preserve_paths         = 'vendor' # TODO: Be more specific here
  s.pod_target_xcconfig    = { 'CLANG_CXX_LANGUAGE_STANDARD' => 'c++14',
                               'CLANG_WARN_OBJC_IMPLICIT_RETAIN_SELF' => 'NO',
                               # 'OTHER_LINKER_FLAGS' => '-isystem "${PODS_ROOT}/realm/vendor/realm-ios/include" -lz -lstdc++ -fPIC -framework CoreFoundation',
                               'HEADER_SEARCH_PATHS' => [
                                 "'#{node_modules_path}/realm/src/'",
                                 "'#{node_modules_path}/realm/src/object-store/src/'",
                                 "'#{node_modules_path}/realm/src/object-store/external/'",
                                 "'#{node_modules_path}/realm/vendor/realm-ios/include/'",
                                 "'#{node_modules_path}/realm/vendor/'",
                                 "'#{node_modules_path}/react-native'/**",
                               ].join(' ')
                             }
  
  s.ios.deployment_target  = '8.0'
  s.ios.vendored_libraries = 'vendor/realm-ios/librealm-ios.a',
                             'vendor/realm-ios/librealm-parser-ios.a'

  # s.dependency 'React'
end
