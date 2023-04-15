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

// This file is pretty much a copy of https://github.com/electron/electron-quick-start/blob/master/main.js
const electron = require("electron");
const { app, BrowserWindow } = electron;
// Needed to forward console logs
const remote = require("@electron/remote/main");
remote.initialize();

// Increasing memory
// app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096');

const path = require("path");

// Keep a global reference of the window object, if you don´t, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

app.on("ready", () => {
  console.log("Electron app is ready");
  const processType = process.argv[2];
  if (processType === "main") {
    require("./mocha.js");
  } else if (processType === "renderer") {
    const preload = path.resolve(__dirname, "renderer.js");
    mainWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        enableRemoteModule: true,
        preload,
      },
    });

    remote.enable(mainWindow.webContents);

    mainWindow.loadFile(path.join(__dirname, "index.html"));
  } else {
    console.error("Expected a process runtime argument");
    process.exit(1);
  }
});
