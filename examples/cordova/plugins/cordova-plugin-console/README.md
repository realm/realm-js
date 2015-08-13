<!---
 license: Licensed to the Apache Software Foundation (ASF) under one
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
-->

# cordova-plugin-console

[![Build Status](https://travis-ci.org/apache/cordova-plugin-console.svg)](https://travis-ci.org/apache/cordova-plugin-console)

This plugin is meant to ensure that console.log() is as useful as it can be.
It adds additional function for iOS, Ubuntu, Windows Phone 8, and Windows. If
you are happy with how console.log() works for you, then you probably
don't need this plugin.

This plugin defines a global `console` object.

Although the object is in the global scope, features provided by this plugin
are not available until after the `deviceready` event.

    document.addEventListener("deviceready", onDeviceReady, false);
    function onDeviceReady() {
        console.log("console.log works well");
    }

## Installation

    cordova plugin add cordova-plugin-console

### Android Quirks

On some platforms other than Android, console.log() will act on multiple
arguments, such as console.log("1", "2", "3"). However, Android will act only
on the first argument. Subsequent arguments to console.log() will be ignored.
This plugin is not the cause of that, it is a limitation of Android itself.
