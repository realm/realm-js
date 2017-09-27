#!/usr/bin/ruby

require 'json'

ios_sim_default_device_type = ENV["IOS_SIM_DEVICE_TYPE"] or "iPhone 5s"
ios_sim_default_ios_version = ENV["IOS_SIM_OS"] or "iOS 10.1"
mode = ARGV[0]

devices = JSON.parse(%x{xcrun simctl list devices --json})['devices']
              .each { |os, group| group.each{ |dev| dev['os'] = os } }
              .flat_map { |x| x[1] }
if mode == "booted" then
    device = devices.select{|x| x['state'] == 'Booted'}
else
    device = devices
        .select{ |x| x['availability'] == '(available)' }
        .each { |x| x['score'] = (x['name'] == '$ios_sim_default_device_type' ? 1 : 0) + (x['os'] == '$ios_sim_default_ios_version' ? 1 : 0) }
        .sort_by! { |x| [x['score'], x['name']] }
        .reverse!
end

if device and device[0] then
    puts device[0]['udid']
end
