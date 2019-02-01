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

def onMacOS(Map args=[:]) {
  def nodeVersion = args.get('nodeVersion', '10')
  return {
    node('macos') {
      // Unstash the files in the repository
      unstash 'source'
      nvm(nodeVersion) {
        // Unstash the package produced when packaging
        dir('integration-tests') {
          unstash 'package'
        }
        // Install the packaged version of realm into the app and run the tests
        dir('integration-tests/environments/node') {
          sh 'npm install'
          try {
            sh 'npm test -- --reporter mocha-junit-reporter'
          } finally {
            junit(
              allowEmptyResults: true,
              testResults: 'test-results.xml',
            )
          }
        }
      }
    }
  }
}

def onLinux(Map args=[:]) {
  def nodeVersion = args.get('nodeVersion', '10')
  return {
    node('docker') {
      // Unstash the files in the repository
      unstash 'source'
      docker.image(
        "node:${nodeVersion}"
      ).inside(
        '-e HOME=/tmp' // NPM will create folders in ~/.npm
      ) {
        // Unstash the package produced when packaging
        dir('integration-tests') {
          unstash 'package'
        }
        // Install the packaged version of realm into the app and run the tests
        dir('integration-tests/environments/node') {
          sh 'npm install'
          try {
            sh 'npm test -- --reporter mocha-junit-reporter'
          } finally {
            junit(
              allowEmptyResults: true,
              testResults: 'test-results.xml',
            )
          }
        }
      }
    }
  }
}
