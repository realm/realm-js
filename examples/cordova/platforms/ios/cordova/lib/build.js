/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 * 
 * http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 *  KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/*jshint node: true*/

var Q     = require('q'),
    nopt  = require('nopt'),
    path  = require('path'),
    shell = require('shelljs'),
    spawn = require('./spawn'),
    check_reqs = require('./check_reqs'),
    fs = require('fs');

var projectPath = path.join(__dirname, '..', '..');
var projectName = null;

module.exports.run = function (argv) {

    var args = nopt({
        // "archs": String,     // TODO: add support for building different archs
        'debug': Boolean,
        'release': Boolean,
        'device': Boolean,
        'emulator': Boolean,
        'codeSignIdentity': String,
        'codeSignResourceRules': String,
        'provisioningProfile': String,
        'buildConfig' : String
    }, {'-r': '--release'}, argv);

    if (args.debug && args.release) {
        return Q.reject('Only one of "debug"/"release" options should be specified');
    }

    if (args.device && args.emulator) {
        return Q.reject('Only one of "device"/"emulator" options should be specified');
    }

    if(args.buildConfig) {
        if(!fs.existsSync(args.buildConfig)) {
            return Q.reject('Build config file does not exist:' + args.buildConfig);
        }
        console.log('Reading build config file:', path.resolve(args.buildConfig));
        var buildConfig = JSON.parse(fs.readFileSync(args.buildConfig, 'utf-8'));
        if(buildConfig.ios) {
            var buildType = args.release ? 'release' : 'debug';
            var config = buildConfig.ios[buildType];
            if(config) {
                ['codeSignIdentity', 'codeSignResourceRules', 'provisioningProfile'].forEach( 
                    function(key) {
                        args[key] = args[key] || config[key];
                    });
            }
        }
    }
    
    return check_reqs.run().then(function () {
        return findXCodeProjectIn(projectPath);
    }).then(function (name) {
        projectName = name;
        var extraConfig = '';
        if (args.codeSignIdentity) {
            extraConfig += 'CODE_SIGN_IDENTITY = ' + args.codeSignIdentity + '\n';
            extraConfig += 'CODE_SIGN_IDENTITY[sdk=iphoneos*] = ' + args.codeSignIdentity + '\n';
        }
        if (args.codeSignResourceRules) {
            extraConfig += 'CODE_SIGN_RESOURCE_RULES_PATH = ' + args.codeSignResourceRules + '\n';
        }
        if (args.provisioningProfile) {
            extraConfig += 'PROVISIONING_PROFILE = ' + args.provisioningProfile + '\n';
        }
        return Q.nfcall(fs.writeFile, path.join(__dirname, '..', 'build-extras.xcconfig'), extraConfig, 'utf-8');
    }).then(function () {
        var configuration = args.release ? 'Release' : 'Debug';

        console.log('Building project  : ' + path.join(projectPath, projectName + '.xcodeproj'));
        console.log('\tConfiguration : ' + configuration);
        console.log('\tPlatform      : ' + (args.device ? 'device' : 'emulator'));

        var xcodebuildArgs = getXcodeArgs(projectName, projectPath, configuration, args.device);
        return spawn('xcodebuild', xcodebuildArgs, projectPath);
    }).then(function () {
        if (!args.device) {
            return;
        }
        var buildOutputDir = path.join(projectPath, 'build', 'device');
        var pathToApp = path.join(buildOutputDir, projectName + '.app');
        var pathToIpa = path.join(buildOutputDir, projectName + '.ipa');
        var xcRunArgs = ['-sdk', 'iphoneos', 'PackageApplication', 
            '-v', pathToApp, 
            '-o', pathToIpa];
        if (args.codeSignIdentity) {
            xcRunArgs.concat('--sign', args.codeSignIdentity);
        }
        if (args.provisioningProfile) {
            xcRunArgs.concat('--embed', args.provisioningProfile);
        }
        return spawn('xcrun', xcRunArgs, projectPath);
    });
};

/**
 * Searches for first XCode project in specified folder
 * @param  {String} projectPath Path where to search project
 * @return {Promise}            Promise either fulfilled with project name or rejected
 */
function findXCodeProjectIn(projectPath) {
    // 'Searching for Xcode project in ' + projectPath);
    var xcodeProjFiles = shell.ls(projectPath).filter(function (name) {
        return path.extname(name) === '.xcodeproj';
    });
    
    if (xcodeProjFiles.length === 0) {
        return Q.reject('No Xcode project found in ' + projectPath);
    }
    if (xcodeProjFiles.length > 1) {
        console.warn('Found multiple .xcodeproj directories in \n' +
            projectPath + '\nUsing first one');
    }

    var projectName = path.basename(xcodeProjFiles[0], '.xcodeproj');
    return Q.resolve(projectName);
}

module.exports.findXCodeProjectIn = findXCodeProjectIn;

/**
 * Returns array of arguments for xcodebuild
 * @param  {String}  projectName   Name of xcode project
 * @param  {String}  projectPath   Path to project file. Will be used to set CWD for xcodebuild
 * @param  {String}  configuration Configuration name: debug|release
 * @param  {Boolean} isDevice      Flag that specify target for package (device/emulator)
 * @return {Array}                 Array of arguments that could be passed directly to spawn method
 */
function getXcodeArgs(projectName, projectPath, configuration, isDevice) {
    var xcodebuildArgs;
    if (isDevice) {
        xcodebuildArgs = [
            '-xcconfig', path.join(__dirname, '..', 'build-' + configuration.toLowerCase() + '.xcconfig'),
            '-project', projectName + '.xcodeproj',
            'ARCHS=armv7 armv7s arm64',
            '-target', projectName,
            '-configuration', configuration,
            '-sdk', 'iphoneos',
            'build',
            'VALID_ARCHS=armv7 armv7s arm64',
            'CONFIGURATION_BUILD_DIR=' + path.join(projectPath, 'build', 'device'),
            'SHARED_PRECOMPS_DIR=' + path.join(projectPath, 'build', 'sharedpch')
        ];
    } else { // emulator
        xcodebuildArgs = [
            '-xcconfig', path.join(__dirname, '..', 'build-' + configuration.toLowerCase() + '.xcconfig'),
            '-project', projectName + '.xcodeproj',
            'ARCHS=i386',
            '-target', projectName ,
            '-configuration', configuration,
            '-sdk', 'iphonesimulator',
            'build',
            'VALID_ARCHS=i386',
            'CONFIGURATION_BUILD_DIR=' + path.join(projectPath, 'build', 'emulator'),
            'SHARED_PRECOMPS_DIR=' + path.join(projectPath, 'build', 'sharedpch')
        ];
    }
    return xcodebuildArgs;
}

// help/usage function
module.exports.help = function help() {
    console.log('');
    console.log('Usage: build [--debug | --release] [--archs=\"<list of architectures...>\"]');
    console.log('             [--device | --simulator] [--codeSignIdentity=\"<identity>\"]');
    console.log('             [--codeSignResourceRules=\"<resourcerules path>\"]');
    console.log('             [--provisioningProfile=\"<provisioning profile>\"]');
    console.log('    --help                  : Displays this dialog.');
    console.log('    --debug                 : Builds project in debug mode. (Default)');
    console.log('    --release               : Builds project in release mode.');
    console.log('    -r                      : Shortcut :: builds project in release mode.');
    // TODO: add support for building different archs
    // console.log("    --archs   : Builds project binaries for specific chip architectures (`anycpu`, `arm`, `x86`, `x64`).");
    console.log('    --device, --simulator');
    console.log('                            : Specifies, what type of project to build');
    console.log('    --codeSignIdentity      : Type of signing identity used for code signing.');
    console.log('    --codeSignResourceRules : Path to ResourceRules.plist.');
    console.log('    --provisioningProfile   : UUID of the profile.');
    console.log('');
    console.log('examples:');
    console.log('    build ');
    console.log('    build --debug');
    console.log('    build --release');
    console.log('    build --codeSignIdentity="iPhone Distribution" --provisioningProfile="926c2bd6-8de9-4c2f-8407-1016d2d12954"');
    // TODO: add support for building different archs
    // console.log("    build --release --archs=\"armv7\"");
    console.log('');
    process.exit(0);
};
