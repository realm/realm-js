require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

# Building the podspec from a local .git repository when developing - GitHub otherwise
local_git_path = File.join(__dir__, '.git')
git_path = File.directory?(local_git_path) ? "file://#{local_git_path}" : 'https://github.com/realm/realm-js.git'

Pod::Spec.new do |s|
  s.name                 = package['name']
  s.version              = package['version']
  s.summary              = package['description']
  s.license              = package['license']

  s.authors              = package['author']
  s.homepage             = package['homepage']
  s.platform             = :ios, '9.0'

  s.source               = { :git => git_path, :tag => "v#{s.version}", :submodules => true }

  s.prepare_command      = 'npm ci && node ./scripts/download-realm.js ios --sync'

  source_files           = 'react-native/ios/RealmReact/*.{mm,h}',
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

  header_files           = 'vendor/realm-ios/include/**/*.{h,hpp}',
                           'src/object-store/src/**/*.hpp',
                           'src/object-store/external/catch/include/*.hpp',
                           'src/object-store/external/json/*.hpp',
                           'src/jsc/*.hpp',
                           'src/*.hpp'
  
  s.source_files         = source_files + header_files
  
  s.compiler_flags       = '-DREALM_HAVE_CONFIG -DREALM_ENABLE_SYNC'
  s.header_mappings_dir  = '.'
  s.pod_target_xcconfig  = { 'CLANG_CXX_LANGUAGE_STANDARD' => 'c++14',
                             'CLANG_WARN_OBJC_IMPLICIT_RETAIN_SELF' => 'NO',
                             'HEADER_SEARCH_PATHS' => '"${PODS_ROOT}/realm/src/object-store/src/" "${PODS_ROOT}/realm/vendor/realm-ios/include/"' }

  s.dependency 'React'
end
