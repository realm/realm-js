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

// Disables security warnings which spams the console
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = true;

const remote = require("@electron/remote");

// Use the main process console when logging
global.console = remote.getGlobal("console");
// If we're supposed to run in the renderer, start the mocha remote client
require("./mocha.js");
