const { app, BrowserWindow } = require("electron");
const path = require("node:path");

let mainWindow;

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    // In order to use Realm and `@realm/react` in the rendering process, it is
    // required to enable the `nodeIntegration` and disable `contextIsolation`.
    webPreferences: { nodeIntegration: true, contextIsolation: false },
  });
  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, "../build/index.html"));
  mainWindow?.webContents.openDevTools();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  // MacOS apps generally continue running even without any windows open, and
  // activating the app when no windows are available should open a new one.
  app.on('activate', () => {
    const noWindowsOpened = BrowserWindow.getAllWindows().length === 0;
    if (noWindowsOpened) {
      createWindow();
    }
  })
})

// On Windows and Linux, exiting all windows generally quits an application
// entirely. Because windows cannot be created before the `ready` event, you
// should only listen for activate events after your app is initialized. Thus,
// we attach the event listener from within this `whenReady()` callback.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
