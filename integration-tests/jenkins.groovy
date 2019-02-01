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

// Running any of the methods exported by this module depends on:
// - The entire sourcecode being stashed as 'source'
// - The packaged library being stashed as 'package'

def electron = load 'environments/electron/jenkins.groovy'
def nodeJs = load 'environments/node/jenkins.groovy'
def reactNative = load 'environments/react-native/jenkins.groovy'

return this
