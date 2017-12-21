#!/usr/bin/ruby

require 'json'

runtime = JSON.parse(%x{xcrun simctl list devices --json})['runtimes']
    .select{|x| (x['identifier'].include? 'com.apple.CoreSimulator.SimRuntime.iOS') &&
     (x['availability'] == "(available)")}[0]["identifier"]

puts runtime
