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
    path  = require('path'),
    shell = require('shelljs'),
    spawn = require('./spawn'),
    check_reqs = require('./check_reqs');

var projectPath = path.join(__dirname, '..', '..');

module.exports.run = function() {
    var projectName = shell.ls(projectPath).filter(function (name) {
        return path.extname(name) === '.xcodeproj';
    })[0];

    if (!projectName) {
        return Q.reject('No Xcode project found in ' + projectPath);
    }

    return check_reqs.run().then(function() {
        return spawn('xcodebuild', ['-project', projectName, '-configuration', 'Debug', '-alltargets', 'clean'], projectPath);
    }).then(function () {
        return spawn('xcodebuild', ['-project', projectName, '-configuration', 'Release', '-alltargets', 'clean'], projectPath);
    }).then(function () {
        return shell.rm('-rf', path.join(projectPath, 'build'));
    });
};
