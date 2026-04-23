require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))
repository_url = package.dig("repository", "url") || "https://github.com/your-org/emoji-main-color-react-native.git"

Pod::Spec.new do |s|
  s.name         = "emoji-main-color-react-native"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = repository_url
  s.license      = package["license"]
  s.authors      = package["author"]
  s.platforms    = { :ios => "13.0" }

  s.source       = { :git => repository_url, :tag => "#{s.version}" }
  s.source_files = "ios/**/*.{h,m,mm,swift}"

  s.swift_version = "5.5"

  s.dependency "React-Core"
end
