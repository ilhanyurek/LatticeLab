// Electron ana surec — Windows masaustu (.exe) icin web uygulamasini sarar.
const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 360,
    minHeight: 560,
    backgroundColor: '#0f1419',
    icon: path.join(__dirname, '..', 'build', 'icon.ico'),
    title: 'LatticeLab',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.removeMenu(); // varsayilan menu cubugunu gizle

  // Disa donuk baglantilar (mailto vb.) sistem tarayicisinda acilsin
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
