<!--
#
# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
# 
# http://www.apache.org/licenses/LICENSE-2.0
# 
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
#  KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.
#
-->
# Release Notes

### 0.2.3 (Sept 25, 2013)
* CB-4889 bumping&resetting version
* CB-4889 renaming org.apache.cordova.core.console to org.apache.cordova.console
* Rename CHANGELOG.md -> RELEASENOTES.md
* [CB-4752] Incremented plugin version on dev branch.

 ### 0.2.4 (Oct 28, 2013)
* CB-5154 log formatting incorrectly to native
* CB-5128: added repo + issue tag to plugin.xml for console plugin
* [CB-4915] Incremented plugin version on dev branch.

### 0.2.5 (Dec 4, 2013)
* add ubuntu platform

### 0.2.6 (Jan 02, 2014)
* CB-5658 Add doc/index.md for Console plugin

### 0.2.7 (Feb 05, 2014)
* Native console needs to be called DebugConsole to avoid ambiguous reference. This commit requires the 3.4.0 version of the native class factory
* CB-4718 fixed Console plugin not working on wp

### 0.2.8 (Apr 17, 2014)
* CB-6460: Update license headers
* Add NOTICE file

### 0.2.9 (Jun 05, 2014)
* CB-6848 Add Android quirk, list applicable platforms
* CB-6796 Add license
* CB-6491 add CONTRIBUTING.md

### 0.2.10 (Aug 06, 2014)
* CB-6127 Updated translations for docs

### 0.2.11 (Sep 17, 2014)
* CB-7249 cordova-plugin-console documentation translation

### 0.2.12 (Dec 02, 2014)
* CB-7977 Mention `deviceready` in plugin docs
* CB-7700 cordova-plugin-console documentation translation: cordova-plugin-console

### 0.2.13 (Feb 04, 2015)
* CB-8351 ios: Use argumentForIndex rather than NSArray extension

### 1.0.0 (Apr 15, 2015)
* CB-8746 gave plugin major version bump
* CB-8683 changed plugin-id to pacakge-name
* CB-8653 updated translated docs to use new id
* Use TRAVIS_BUILD_DIR, install paramedic by npm
* docs: renamed Windows8 to Windows
* CB-8653 Updated Readme
* CB-8560 Integrate TravisCI
* CB-8438 cordova-plugin-console documentation translation: cordova-plugin-console
* CB-8538 Added package.json file
* CB-8362 Add Windows platform section to Console plugin

### 1.0.1 (Jun 17, 2015)
* move logger.js and console-via-logger.js to common modules, instead of the numerous repeats that were there.
* clean up tests, info is below log level so it does not exist by default.
* add a couple tests
* CB-9191 Add basic test
* CB-9128 cordova-plugin-console documentation translation: cordova-plugin-console
* attempt to fix npm markdown issue
