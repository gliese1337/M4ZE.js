const { app, BrowserWindow } = require('electron');
const path = require('path');
const url = require('url');

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: { nodeIntegration: true },
  });
  
  win.setMenu(null);

  //win.webContents.openDevTools();

  win.loadURL(url.format({
    pathname: path.join(__dirname, 'webgl.html'),
    protocol: 'file:',
    slashes: true
  }));

  win.on('closed', () => { win = null; });
}

app.on('ready', createWindow)
app.on('window-all-closed', () => app.quit());

app.on('activate', () => {
  if (win === null) {
    createWindow();
  }
});