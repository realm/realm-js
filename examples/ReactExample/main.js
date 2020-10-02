////////////////////////////////////////////////////////////////////////////
//
// Copyright 2016 Realm Inc.
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

'use strict';

//FIX: Remove this when test app is upgraded to RN >= 0.60:
//RN version < 0.60 does not have an AbortController implementation. Define an empty one so require('realm') does not throw 
//////////////
if (global && global.window && !global.window.AbortController) {
    global.window.AbortController = { 
        signal: {},
        abort : () => {}
    }
}
////////////

import { AppRegistry } from 'react-native';
import TodoApp from './components/todo-app';

AppRegistry.registerComponent('ReactExample', () => TodoApp);
