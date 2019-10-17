require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name         = package['name']
  s.version      = package['version']
  s.summary      = package['description']
  s.license      = package['license']

  s.authors      = package['author']
  s.homepage     = package['homepage']
  s.platform     = :ios, "9.0"

  s.source       = { :git => "https://github.com/realm/realm-js.git", :tag => "v#{s.version}" }
  s.source_files = "src/object-store/src/*.{cpp,hpp}",
                   "react-native/ios/**/*.{m,mm,h}",
                   "src/ios/*.mm",
                   "src/jsc/*.{cpp,hpp}",
                   "src/*.{cpp,hpp}"

  s.dependency 'React'
end
