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

Questo plugin è intesa a garantire che console.log() è tanto utile quanto può essere. Aggiunge una funzione aggiuntiva per iOS, Ubuntu, Windows Phone 8 e Windows. Se sei soddisfatto di come console.log() funziona per voi, quindi probabilmente non è necessario questo plugin.

Questo plugin definisce un oggetto globale `console`.

Sebbene l'oggetto sia in ambito globale, funzionalità fornite da questo plugin non sono disponibili fino a dopo l'evento `deviceready`.

    document.addEventListener("deviceready", onDeviceReady, false);
    function onDeviceReady() {
        console.log("console.log works well");
    }
    

## Installazione

    cordova plugin add cordova-plugin-console
    

### Stranezze Android

Su alcune piattaforme diverse da Android, console.log() agirà su più argomenti, come ad esempio console ("1", "2", "3"). Tuttavia, Android agirà solo sul primo argomento. Argomenti successivi a console.log() verranno ignorati. Questo plugin non è la causa di ciò, è una limitazione di Android stesso.