require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'MyWidgetCore'
  s.version        = package['version']
  s.summary        = 'Trader Edge Live Activity Module'
  s.description    = 'A local Expo module to interact with Live Activities via ActivityKit'
  s.license        = 'UNLICENSED'
  s.author         = 'Trader Edge'
  s.homepage       = 'https://example.com'
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.4'
  s.source         = { :path => '..' }

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.frameworks = 'ActivityKit'
  s.source_files = "Core/**/*.{h,m,swift}"
end
