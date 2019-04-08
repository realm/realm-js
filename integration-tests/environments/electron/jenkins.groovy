////////////////////////////////////////////////////////////////////////////
//
// Copyright 2019 Realm Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
////////////////////////////////////////////////////////////////////////////

def onLinux() {
  def electronVersion = args.get('electronVersion', '4.0.8')
  return {
    node('docker') {
      unstash 'source'
      docker.build(
        'ci/realm-js:electron',
        // Based on node:10, installing xvbf
        '-f integration-tests/environments/electron/Dockerfile .'
      ).inside(
        '-e HOME=/tmp' // NPM will create folders in ~/.npm
      ) {
        dir('integration-tests') {
          unstash "electron-pre-gyp-linux-${electronVersion}"
        }
        // Install the packaged version of realm into the app and run the tests
        dir('integration-tests/environments/electron') {
          sh 'npm install'
          timeout(30) { // minutes
            // Run both main and renderer tests catching any errors
            def error = null;
            // First the main process
            try {
              // Using xvfb to allow Electron to open a window
              sh 'xvfb-run npm run test/main -- main-test-results.xml'
            } catch (Exception e) {
              error = e;
            }
            // Then the renderer process
            try {
              // Using xvfb to allow Electron to open a window
              sh 'xvfb-run npm run test/renderer -- renderer-test-results.xml'
            } catch (Exception e) {
              error = e;
            }
            // Archive all test results
            junit(
              allowEmptyResults: true,
              testResults: '*-test-results.xml',
            )
            // Throw any errors that might have occurred
            if (error) {
              throw error
            }
          }
        }
      }
    }
  }
}


def onMacOS(Map args=[:]) {
  def electronVersion = args.get('electronVersion', '4.0.8')
  def nodeVersion = args.get('nodeVersion', '10')
  return {
    node('macos') {
      unstash 'source'
      nvm(nodeVersion) {
        dir('integration-tests') {
          unstash "electron-pre-gyp-macos-${electronVersion}"
        }
        // Install the packaged version of realm into the app and run the tests
        dir('integration-tests/environments/electron') {
          sh 'npm install'
          timeout(30) { // minutes
            // Run both main and renderer tests catching any errors
            def error = null;
            // First the main process
            try {
              // Using xvfb to allow Electron to open a window
              sh 'npm run test/main -- main-test-results.xml'
            } catch (Exception e) {
              error = e;
            }
            // Then the renderer process
            try {
              // Using xvfb to allow Electron to open a window
              sh 'npm run test/renderer -- renderer-test-results.xml'
            } catch (Exception e) {
              error = e;
            }
            // Archive all test results
            junit(
              allowEmptyResults: true,
              testResults: '*-test-results.xml',
            )
            // Throw any errors that might have occurred
            if (error) {
              throw error
            }
          }
        }
      }
    }
  }
}

return this
