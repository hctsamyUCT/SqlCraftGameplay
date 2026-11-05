const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

// Empêche l'ouverture de multiples instances simultanées
const gotTheLock = app.requestSingleInstanceLock();
let mainWindow = null;

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  function createWindow() {
    const iconPath = path.join(__dirname, '../build/icon.ico');

    mainWindow = new BrowserWindow({
      width: 1366,
      height: 768,
      minWidth: 1024,
      minHeight: 640,
      title: 'SQL Craft — Le Minecraft du BUT Science des Données',
      icon: iconPath,
      backgroundColor: '#0b1120',
      autoHideMenuBar: true,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true,
        spellcheck: false,
      },
    });

    // Supprime la barre de menu classique (Fichier, Édition...) pour une immersion totale
    Menu.setApplicationMenu(null);
    mainWindow.setMenuBarVisibility(false);

    // Charge la version buildée de Vite ou l'URL de dev
    const devServerUrl = process.env.VITE_DEV_SERVER_URL;
    if (devServerUrl) {
      mainWindow.loadURL(devServerUrl);
      mainWindow.webContents.openDevTools();
    } else {
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    // Affiche la fenêtre une fois prête pour éviter tout flash blanc
    mainWindow.once('ready-to-show', () => {
      mainWindow.show();
    });

    // Raccourcis clavier pratiques
    mainWindow.webContents.on('before-input-event', (event, input) => {
      // F11: Plein écran
      if (input.key === 'F11' && input.type === 'keyDown') {
        mainWindow.setFullScreen(!mainWindow.isFullScreen());
        event.preventDefault();
      }
      // F12: DevTools
      if (input.key === 'F12' && input.type === 'keyDown') {
        mainWindow.webContents.toggleDevTools();
        event.preventDefault();
      }
    });

    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  }

  app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
