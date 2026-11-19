'use strict';

const {app, BrowserWindow, dialog, shell, session, ipcMain} = require('electron');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {allowedExternal, sameDocument} = require('./navigation.cjs');

app.setName('Slayer Target Planner');
app.setAppUserModelId('OwenWelch.SlayerTargetPlanner');
let mainWindow;
const {lookup}=require('./hiscores.cjs');
ipcMain.handle('public-hiscores',async(event,name)=>{
  const expected=pathToFileURL(path.join(__dirname,'web','index.html')).href;
  if(!mainWindow||event.sender!==mainWindow.webContents||!sameDocument(event.senderFrame.url,expected))throw Error('Unknown request source.');
  return lookup(name);
});

function openSource(url) {
  if (allowedExternal(url)) {
    shell.openExternal(url).catch(() => dialog.showErrorBox('Cannot open link', 'Open this source from your web browser instead.'));
  }
}

function createWindow() {
  const documentPath = path.join(__dirname, 'web', 'index.html');
  const documentUrl = pathToFileURL(documentPath).href;
  mainWindow = new BrowserWindow({
    title: 'Slayer Target Planner', width: 1440, height: 980,
    minWidth: 420, minHeight: 620, backgroundColor: '#0c1512',
    icon: path.join(__dirname, 'assets', 'icon.ico'), show: false,
    autoHideMenuBar: true,
    webPreferences: {preload:path.join(__dirname,'preload.cjs'),nodeIntegration: false, contextIsolation: true, sandbox: true,
      webSecurity: true, devTools: false, spellcheck: false},
  });
  mainWindow.setMenu(null);
  mainWindow.webContents.setWindowOpenHandler(({url}) => {
    openSource(url);
    return {action: 'deny'};
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!sameDocument(url, documentUrl)) {event.preventDefault(); openSource(url);}
  });
  mainWindow.webContents.on('will-attach-webview', event => event.preventDefault());
  mainWindow.webContents.on('did-fail-load', (_event, code) => {
    if (code !== -3) dialog.showErrorBox('Planner could not load', 'Extract the entire ZIP into a folder, then run Slayer Target Planner.exe from that folder.');
  });
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; });
  mainWindow.loadFile(documentPath);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show(); mainWindow.focus();
  });
  app.whenReady().then(() => {
    session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    session.defaultSession.setPermissionCheckHandler(() => false);
    createWindow();
  });
  app.on('window-all-closed', () => app.quit());
}
