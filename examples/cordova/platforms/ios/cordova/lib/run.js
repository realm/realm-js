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

/*jshint node: true*/

var Q = require('q'),
    nopt  = require('nopt'),
    path  = require('path'),
    build = require('./build'),
    spawn = require('./spawn'),
    check_reqs = require('./check_reqs');

var cordovaPath = path.join(__dirname, '..');
var projectPath = path.join(__dirname, '..', '..');

module.exports.run = function (argv) {

    // parse args here
    // --debug and --release args not parsed here
    // but still valid since they can be passed down to build command 
    var args  = nopt({
        // "archs": String,     // TODO: add support for building different archs
        'list': Boolean,
        'nobuild': Boolean,
        'device': Boolean, 'emulator': Boolean, 'target': String
    }, {}, argv);

    // Validate args
    if (args.device && args.emulator) {
        return Q.reject('Only one of "device"/"emulator" options should be specified');
    }

    // validate target device for ios-sim
    // Valid values for "--target" (case sensitive):
    var validTargets = ['iPhone-4s', 'iPhone-5', 'iPhone-5s', 'iPhone-6-Plus', 'iPhone-6',
        'iPad-2', 'iPad-Retina', 'iPad-Air', 'Resizable-iPhone', 'Resizable-iPad'];
    if (args.target && validTargets.indexOf(args.target) < 0 ) {
        return Q.reject(args.target + ' is not a valid target for emulator');
    }

    // support for CB-8168 `cordova/run --list`
    if (args.list) {
        if (args.device) return listDevices();
        if (args.emulator) return listEmulators();
        // if no --device or --emulator flag is specified, list both devices and emulators
        return listDevices().then(function () {
            return listEmulators();
        });
    }

    // check for either ios-sim or ios-deploy is available
    // depending on arguments provided
    var checkTools = args.device ? check_reqs.check_ios_deploy() : check_reqs.check_ios_sim();

    return checkTools.then(function () {
        // if --nobuild isn't specified then build app first
        if (!args.nobuild) {
            return build.run(argv);
        }
    }).then(function () {
        return build.findXCodeProjectIn(projectPath);
    }).then(function (projectName) {
        var appPath = path.join(projectPath, 'build', (args.device ? 'device' : 'emulator'), projectName + '.app');
        // select command to run and arguments depending whether
        // we're running on device/emulator
        if (args.device) {
            return checkDeviceConnected().then(function () {
                return deployToDevice(appPath);
            }, function () {
                // if device connection check failed use emulator then
                return deployToSim(appPath, args.target);
            });
        } else {
            return deployToSim(appPath, args.target);
        }
    });
};

/**
 * Checks if any iOS device is connected
 * @return {Promise} Fullfilled when any device is connected, rejected otherwise
 */
function checkDeviceConnected() {
    return spawn('ios-deploy', ['-c']);
}

/**
 * Deploy specified app package to connected device
 * using ios-deploy command
 * @param  {String} appPath Path to application package
 * @return {Promise}        Resolves when deploy succeeds otherwise rejects
 */
function deployToDevice(appPath) {
    // Deploying to device...
    return spawn('ios-deploy', ['-d', '-b', appPath]);
}

/**
 * Deploy specified app package to ios-sim simulator
 * @param  {String} appPath Path to application package
 * @param  {String} target  Target device type
 * @return {Promise}        Resolves when deploy succeeds otherwise rejects
 */
function deployToSim(appPath, target) {
    // Select target device for emulator. Default is 'iPhone-6' 
    if (!target) {
        target = 'iPhone-6';
        console.log('No target specified for emulator. Deploying to ' + target + ' simulator');
    }
    var logPath = path.join(cordovaPath, 'console.log');
    var simArgs = ['launch', appPath,
        '--devicetypeid', 'com.apple.CoreSimulator.SimDeviceType.' + target,
        // We need to redirect simulator output here to use cordova/log command
        // TODO: Is there any other way to get emulator's output to use in log command?
        '--stderr', logPath, '--stdout', logPath,
        '--exit'];
    return spawn('ios-sim', simArgs);
}

function listDevices() {
    return require('./list-devices').run()
    .then(function (devices) {
        console.log('Available iOS Devices:');
        devices.forEach(function (device) {
            console.log('\t' + device);
        });
    });
}

function listEmulators() {
    return require('./list-emulator-images').run()
    .then(function (emulators) {
        console.log('Available iOS Virtual Devices:');
        emulators.forEach(function (emulator) {
            console.log('\t' + emulator);
        });
    });
}

module.exports.help = function () {
    console.log('\nUsage: run [ --device | [ --emulator [ --target=<id> ] ] ] [ --debug | --release | --nobuild ]');
    // TODO: add support for building different archs
    // console.log("           [ --archs=\"<list of target architectures>\" ] ");
    console.log('    --device      : Deploys and runs the project on the connected device.');
    console.log('    --emulator    : Deploys and runs the project on an emulator.');
    console.log('    --target=<id> : Deploys and runs the project on the specified target.');
    console.log('    --debug       : Builds project in debug mode. (Passed down to build command, if necessary)');
    console.log('    --release     : Builds project in release mode. (Passed down to build command, if necessary)');
    console.log('    --nobuild     : Uses pre-built package, or errors if project is not built.');
    // TODO: add support for building different archs
    // console.log("    --archs       : Specific chip architectures (`anycpu`, `arm`, `x86`, `x64`).");
    console.log('');
    console.log('Examples:');
    console.log('    run');
    console.log('    run --device');
    console.log('    run --emulator --target=\"iPhone-6-Plus\"');
    console.log('    run --device --release');
    console.log('    run --emulator --debug');
    console.log('');
    process.exit(0);
};