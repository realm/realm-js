/*
       Licensed to the Apache Software Foundation (ASF) under one
       or more contributor license agreements.  See the NOTICE file
       distributed with this work for additional information
       regarding copyright ownership.  The ASF licenses this file
       to you under the Apache License, Version 2.0 (the
       "License"); you may not use this file except in compliance
       with the License.  You may obtain a copy of the License at

         http://www.apache.org/licenses/LICENSE-2.0

       Unless required by applicable law or agreed to in writing,
       software distributed under the License is distributed on an
       "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
       KIND, either express or implied.  See the License for the
       specific language governing permissions and limitations
       under the License.
*/

/* jshint node:true, bitwise:true, undef:true, trailing:true, quotmark:true,
          indent:4, unused:vars, latedef:nofunc,
          sub:true, laxcomma:true, laxbreak:true
*/

var Q     = require('Q'),
    os    = require('os'),
    shell = require('shelljs'),
    versions = require('./versions');

var XCODEBUILD_MIN_VERSION = '4.6.0';

var IOS_SIM_MIN_VERSION = '3.0.0';
var IOS_SIM_NOT_FOUND_MESSAGE = 'ios-sim was not found. Please download, build and install version ' + IOS_SIM_MIN_VERSION +
    ' or greater from https://github.com/phonegap/ios-sim into your path.' +
    ' Or \'npm install -g ios-sim\' using node.js: http://nodejs.org';

var IOS_DEPLOY_MIN_VERSION = '1.2.0';
var IOS_DEPLOY_NOT_FOUND_MESSAGE = 'ios-deploy was not found. Please download, build and install version ' + IOS_DEPLOY_MIN_VERSION +
    ' or greater from https://github.com/phonegap/ios-deploy into your path.' +
    ' Or \'npm install -g ios-deploy\' using node.js: http://nodejs.org';

/**
 * Checks if xcode util is available
 * @return {Promise} Returns a promise either resolved with xcode version or rejected
 */
module.exports.run = module.exports.check_xcodebuild = function () {
    return checkTool('xcodebuild', XCODEBUILD_MIN_VERSION);
};

/**
 * Checks if ios-deploy util is available
 * @return {Promise} Returns a promise either resolved with ios-deploy version or rejected
 */
module.exports.check_ios_deploy = function () {
    return checkTool('ios-deploy', IOS_DEPLOY_MIN_VERSION, IOS_DEPLOY_NOT_FOUND_MESSAGE);
};

/**
 * Checks if ios-sim util is available
 * @return {Promise} Returns a promise either resolved with ios-sim version or rejected
 */
module.exports.check_ios_sim = function () {
    return checkTool('ios-sim', IOS_SIM_MIN_VERSION, IOS_SIM_NOT_FOUND_MESSAGE);
};

module.exports.help = function () {
    console.log('Usage: check_reqs or node check_reqs');
};

/**
 * Checks if specific tool is available.
 * @param  {String} tool       Tool name to check. Known tools are 'xcodebuild', 'ios-sim' and 'ios-deploy'
 * @param  {Number} minVersion Min allowed tool version.
 * @param  {String} optMessage Message that will be used to reject promise.
 * @return {Promise}           Returns a promise either resolved with tool version or rejected
 */
function checkTool (tool, minVersion, optMessage) {
    if (os.platform() !== 'darwin'){
        // Build iOS apps available for OSX platform only, so we reject on others platforms
        return Q.reject('Cordova tooling for iOS requires Apple OS X');
    }
    // Check whether tool command is available at all
    var tool_command = shell.which(tool);
    if (!tool_command) {
        return Q.reject(optMessage || (tool + 'command is unavailable.'));
    }
    // check if tool version is greater than specified one
    return versions.get_tool_version(tool).then(function (version) {
        return versions.compareVersions(version, minVersion) >= 0 ?
            Q.resolve(version) :
            Q.reject('Cordova needs ' + tool + ' version ' + minVersion +
              ' or greater, you have version ' + version + '.');
    });
}
