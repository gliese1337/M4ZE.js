const { app, BrowserWindow } = require('electron');
const path = require('path');

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  
  win.setMenu(null);

  win.webContents.openDevTools();

  win.loadURL(`file://${path.join(__dirname, 'webgl.html')}`);

  win.on('closed', () => { win = null; });
}

app.on('ready', createWindow)
app.on('window-all-closed', () => app.quit());

app.on('activate', () => {
  if (win === null) {
    createWindow();
  }
});