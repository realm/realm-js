require 'json'

package = JSON.parse(File.read(File.expand_path('package.json', __dir__)))

# Building the podspec from a local .git repository when developing - GitHub otherwise
git_path_local = File.expand_path('.git', __dir__)
git_path = File.directory?(git_path_local) ? "file://#{git_path_local}" : 'https://github.com/realm/realm-js.git'

app_path = File.expand_path('../..', __dir__)
node_modules_path = File.expand_path('node_modules', app_path)
react_native_module_path = File.expand_path('react-native', node_modules_path)
if not File.directory?(react_native_module_path)
  raise "Couldn't find React Native node module (#{react_native_module_path}) - did you install `npm install react-native`?"
end

Pod::Spec.new do |s|
  s.name                   = "RealmJS"
  s.version                = package['version']
  s.summary                = package['description']
  s.license                = package['license']

  s.authors                = package['author']
  s.homepage               = package['homepage']
  s.platform               = :ios, '9.0'

  s.source                 = { :git => git_path, :tag => "v#{s.version}", :submodules => true }

  # Run `npm ci` to install the dependencies the download script needs, if not installed as a node_module
  s.prepare_command        = "([ -d '../../node_modules' ] || npm ci) && node ./scripts/download-realm.js ios --sync"

  source_files             = 'src/*.cpp',
                             'src/ios/*.mm',
                             'src/jsc/*.cpp',
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

  header_files             = 'src/*.hpp',
                             'src/jsc/*.{h,hpp}',
                             'src/object-store/src/*.hpp',
                             'src/object-store/src/sync/*.hpp',
                             'src/object-store/src/sync/impl/*.hpp',
                             'src/object-store/src/sync/impl/apple/*.hpp',
                             'src/object-store/src/impl/*.hpp',
                             'src/object-store/src/impl/apple/*.hpp',
                             'src/object-store/src/util/*.hpp',
                             'src/object-store/src/util/apple/*.hpp',
                             'src/object-store/external/catch/include/*.hpp',
                             'src/object-store/external/json/*.hpp',
                             'react-native/ios/RealmReact/*.h',
                             'vendor/*.hpp'
  
  s.source_files           = source_files + header_files
  
  s.frameworks             = 'Security', 'JavaScriptCore'
  s.library                = 'c++', 'z'
  s.compiler_flags         = '-DREALM_HAVE_CONFIG -DREALM_ENABLE_SYNC'
  s.header_mappings_dir    = '.'
  s.preserve_paths         = 'vendor'
  s.pod_target_xcconfig    = { 'CLANG_CXX_LANGUAGE_STANDARD' => 'c++14',
                               'CLANG_CXX_LIBRARY' => 'libc++',
                               'CLANG_WARN_OBJC_IMPLICIT_RETAIN_SELF' => 'NO',
                               'CLANG_WARN_DOCUMENTATION_COMMENTS' => 'NO',
                               'HEADER_SEARCH_PATHS' => [
                                 '"${PODS_ROOT}/RealmJS/src/"',
                                 '"${PODS_ROOT}/RealmJS/src/object-store/src/"',
                                 '"${PODS_ROOT}/RealmJS/src/object-store/external/"',
                                 '"${PODS_ROOT}/RealmJS/vendor/realm-ios/include/"',
                                 '"${PODS_ROOT}/RealmJS/vendor/"',
                                 '"${PODS_ROOT}/RealmJS/vendor/GCDWebServer/GCDWebServer"/**',
                                 "'#{node_modules_path}/react-native/React'/**",
                                 "'#{app_path}/ios/Pods/Headers'/**",
                               ].join(' ')
                             }
  
  s.ios.deployment_target  = '8.0'
  # s.ios.vendored_libraries = 'vendor/realm-ios/librealm-ios-dbg.a',
  #                           'vendor/realm-ios/librealm-parser-ios-dbg.a'
  s.ios.vendored_libraries = 'vendor/realm-ios/librealm-ios.a',
                             'vendor/realm-ios/librealm-parser-ios.a'

  s.dependency 'React'
  s.dependency 'GCDWebServer'
end
