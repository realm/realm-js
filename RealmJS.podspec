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

  s.prepare_command        = <<-CMD
    # Run `npm ci` to install the dependencies the download script needs, if not installed as a node_module
    ([ -d '../../node_modules' ] || npm ci) && node ./scripts/download-realm.js ios --sync;
    # Clean up from any previous builds
    rm -rf include
    # Build up the include directory
    mkdir -p include include/jsc include/impl/apple include/util/apple include/sync/impl/apple
    # Copy headers from Realm JS
    cp src/*.hpp include
    # Copy headers from RealmReact
    cp react-native/ios/RealmReact/*.h include
    # Copy headers from the vendor root directory
    cp vendor/*.hpp include
    # Copy headers from core + sync
    cp -r vendor/realm-ios/include include/core+sync
    # Copy headers from object store
    cp src/object-store/src/*.hpp include
    cp src/object-store/src/sync/*.hpp include/sync
    cp src/object-store/src/sync/impl/*.hpp include/sync/impl
    cp src/object-store/src/sync/impl/apple/*.hpp include/sync/impl/apple
    cp src/object-store/src/impl/*.hpp include/impl
    cp src/object-store/src/impl/apple/*.hpp include/impl/apple
    cp src/object-store/src/util/*.hpp include/util
    cp src/object-store/src/util/apple/*.hpp include/util/apple
    cp src/object-store/external/json/*.hpp include
  CMD

  s.source_files           = 'src/*.cpp',
                             'src/jsc/*.{cpp,hpp,h}',
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
  
  s.frameworks             = 'Security', 'JavaScriptCore'
  s.library                = 'c++', 'z'
  s.compiler_flags         = '-DREALM_HAVE_CONFIG -DREALM_ENABLE_SYNC'
  s.header_mappings_dir    = 'include'
  s.preserve_paths         = 'include', 'scripts'
  s.pod_target_xcconfig    = { 'CC' => '$(PODS_TARGET_SRCROOT)/scripts/ccache-clang.sh',
                               'CXX' => '$(PODS_TARGET_SRCROOT)/scripts/ccache-clang++.sh',
                               'CLANG_CXX_LANGUAGE_STANDARD' => 'c++14',
                               'CLANG_CXX_LIBRARY' => 'libc++',
                               'CLANG_WARN_OBJC_IMPLICIT_RETAIN_SELF' => 'NO',
                               'CLANG_WARN_DOCUMENTATION_COMMENTS' => 'NO',
                               'CURRENT_PROJECT_VERSION' => s.version,
                               'VERSIONING_SYSTEM' => 'apple-generic',
                               'HEADER_SEARCH_PATHS' => [
                                 '"$(PODS_TARGET_SRCROOT)/include/"',
                                 '"$(PODS_TARGET_SRCROOT)/include/core+sync/"',
                                 "'#{app_path}/ios/Pods/Headers/Public/'/**"
                               ].join(' ')
                             }
  
  s.ios.deployment_target  = '8.0'
  # TODO: Consider providing an option to build with the -dbg binaries instead
  s.ios.vendored_libraries = 'vendor/realm-ios/librealm-ios.a',
                             'vendor/realm-ios/librealm-parser-ios.a'

  s.dependency 'React'
  # TODO: Ensure the same version of GCDWebServer is used for Android
  s.dependency 'GCDWebServer'
end
