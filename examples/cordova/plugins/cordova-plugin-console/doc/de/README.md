<!---
# license: Licensed to the Apache Software Foundation (ASF) under one
#         or more contributor license agreements.  See the NOTICE file
#         distributed with this work for additional information
#         regarding copyright ownership.  The ASF licenses this file
#         to you under the Apache License, Version 2.0 (the
#         "License"); you may not use this file except in compliance
#         with the License.  You may obtain a copy of the License at
#
#           http://www.apache.org/licenses/LICENSE-2.0
#
#         Unless required by applicable law or agreed to in writing,
#         software distributed under the License is distributed on an
#         "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
#         KIND, either express or implied.  See the License for the
#         specific language governing permissions and limitations
#         under the License.
-->

# cordova-plugin-console

[![Build Status](https://travis-ci.org/apache/cordova-plugin-console.svg)](https://travis-ci.org/apache/cordova-plugin-console)

Dieses Plugin stellt sicher, dass der Befehl console.log() so hilfreich ist, wie er sein kann. Es fügt zusätzliche Funktion für iOS, Ubuntu, Windows Phone 8 und Windows. Teilweise kann es vorkommen, dass der Befehl console.log() nicht korrekt erkannt wird, und es zu Fehlern bzw. zu nicht angezeigten Logs in der Console kommt. Wenn Sie mit der derzeitigen Funktionsweise zufrieden sind, kann es sein, dass Sie dieses Plugin nicht benötigen.

Dieses Plugin wird ein global-`console`-Objekt definiert.

Obwohl das Objekt im globalen Gültigkeitsbereich ist, stehen Features von diesem Plugin nicht bis nach dem `deviceready`-Ereignis.

    document.addEventListener("deviceready", onDeviceReady, false);
    function onDeviceReady() {
        console.log("console.log works well");
    }
    

## Installation

    cordova plugin add cordova-plugin-console
    

### Android Eigenarten

Auf einigen Plattformen als Android fungieren console.log() auf mehrere Argumente wie console.log ("1", "2", "3"). Android wird jedoch nur auf das erste Argument fungieren. Nachfolgende Argumente zu console.log() werden ignoriert. Dieses Plugin ist nicht die Verantwortung dafür, es ist eine Einschränkung von Android selbst.