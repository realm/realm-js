/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

'use strict';

var exec = require('child_process').execFileSync;
var fs = require('fs');
var path = require('path');
var xcode = require('xcode');

module.exports = function(context) {
    updateXcodeProject(context);
    buildFramework(context);
};

function updateXcodeProject(context) {
    var glob = context.requireCordovaModule('glob');
    var root = path.join(context.opts.projectRoot, 'platforms', 'ios');
    var pbx = glob.sync(path.join(root, '*.xcodeproj', 'project.pbxproj'));

    if (!pbx.length) {
        throw new Error('Xcode project not found!');
    }

    var pbxfile = pbx[0];
    var pbxproj = xcode.project(pbxfile);
    pbxproj.parseSync();

    // There is only one target in Cordova Xcode projects.
    var target = pbxproj.getFirstTarget().uuid;

    // Add 'Embed Frameworks' build phase if not already present.
    if (!pbxproj.buildPhaseObject('PBXCopyFilesBuildPhase', 'Embed Frameworks', target)) {
        var phase = pbxproj.addBuildPhase([], 'PBXCopyFilesBuildPhase', 'Embed Frameworks', target);
        phase.buildPhase.dstSubfolderSpec = 10; // = Frameworks
    }

    // Make sure the executable actually finds the embedded framework.
    pbxproj.addBuildProperty('LD_RUNPATH_SEARCH_PATHS', '"$(inherited) @executable_path/Frameworks"');

    fs.writeFileSync(pbxfile, pbxproj.writeSync());
}

function buildFramework(context) {
    var config = 'Release';
    var target = 'RealmJS';
    var dir = context.opts.plugin.dir;
    var outdir = path.resolve(dir, 'build');
    var xcodeproj;

    // Search for RealmJS.xcodeproj in parent directories.
    do {
        if (dir == '/') {
            throw new Error('Could not find ' + target + '.xcodeproj');
        }
        dir = path.resolve(dir, '..');
        xcodeproj = path.join(dir, target + '.xcodeproj');
    } while (!fs.existsSync(xcodeproj));

    var sdks = ['iphoneos', 'iphonesimulator'];
    var products = [];
    var binaries = [];

    sdks.forEach(function(sdk) {
        var product = path.join(dir, 'build', config + '-' + sdk, target + '.framework');
        products.push(product);
        binaries.push(path.join(product, target));

        var args = [
            '-project', xcodeproj,
            '-target', target,
            '-configuration', config,
            '-sdk', sdk,
        ];

        if (sdk == 'iphonesimulator') {
            args.push(
                '-arch', 'i386',
                '-arch', 'x86_64',
                'ONLY_ACTIVE_ARCH=NO'
            );
        }

        exec('xcodebuild', args);
    });

    var framework = path.join(outdir, target + '.framework');
    var output = path.join(framework, target);

    exec('mkdir', ['-p', outdir]);
    exec('rm', ['-rf', framework]);
    exec('cp', ['-R', products[0], framework]);

    // Ironically use lipo to create a *fat* binary.
    exec('xcrun', ['lipo', '-create'].concat(binaries).concat('-output', output));
}
