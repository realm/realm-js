<#
     Copyright 2016 Realm Inc.

     Licensed under the Apache License, Version 2.0 (the "License");
     you may not use this file except in compliance with the License.
     You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

     Unless required by applicable law or agreed to in writing, software
     distributed under the License is distributed on an "AS IS" BASIS,
     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     See the License for the specific language governing permissions and
     limitations under the License.
#>

Push-Location $PSScriptRoot\..
New-Item .\out -ItemType "directory"

npm install --ignore-scripts

foreach ($arch in "ia32", "x64") {
    foreach ($version in "4.0.0", "5.0.0", "6.0.0", "7.0.0", "8.0.0") {
        Remove-Item .\build, .\compiled -Recurse -Force -ErrorAction Ignore
        .\node_modules\node-pre-gyp\bin\node-pre-gyp.cmd rebuild --target_arch=$arch --target=$version
        .\node_modules\node-pre-gyp\bin\node-pre-gyp.cmd package --target_arch=$arch --target=$version
        Copy-Item .\build\stage\node-pre-gyp\**\*.tar.gz -Destination .\out
    }
}