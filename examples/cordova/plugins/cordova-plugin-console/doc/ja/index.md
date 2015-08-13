<!---
    Licensed to the Apache Software Foundation (ASF) under one
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

このプラグインは、その console.log() がすることができます便利なことを確認するものです。 それは、iOS、Ubuntu、Windows Phone 8 および Windows 8 の追加関数を追加します。 場合はあなたのための console.log() の作品に満足しているし、おそらく必要はありませんこのプラグイン。

このプラグインでは、グローバル ・ `console` オブジェクトを定義します。

オブジェクトは、グローバル スコープでですが、このプラグインによって提供される機能は、`deviceready` イベントの後まで使用できません。

    document.addEventListener("deviceready", onDeviceReady, false);
    function onDeviceReady() {
        console.log("console.log works well");
    }
    

## インストール

    cordova plugin add cordova-plugin-console
    

### Android の癖

アンドロイド以外のいくつかのプラットフォームで console.log() は console.log (「1」、「2」、「3」) など、複数の引数に動作します。 しかし、アンドロイドは、最初の引数でのみ動作します。 console.log() に後続の引数は無視されます。 このプラグインが原因ではない、それは Android の自体の制限です。
