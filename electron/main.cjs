const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron/main');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');

const SECRET_KEY = '7530bfb1ad6c41627b0f0620078fa5ed';
const SOFTWARE_ID = '10023';

let mainWindow;

function isWsl() {
  return process.platform === 'linux' && os.release().toLowerCase().includes('microsoft');
}

function openByCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      detached: true,
      stdio: 'ignore',
    });

    child.on('error', reject);
    child.on('spawn', () => {
      child.unref();
      resolve(true);
    });
  });
}

async function openExternalUrl(url) {
  if (!url || typeof url !== 'string') {
    throw new Error('Invalid URL');
  }

  if (isWsl()) {
    try {
      await openByCommand('powershell.exe', ['-NoProfile', '-Command', `Start-Process -FilePath '${url.replace(/'/g, "''")}'`]);
      return { success: true, method: 'wsl-powershell' };
    } catch (error) {
      console.warn('WSL powershell open failed, falling back to xdg-open:', error);
    }
  }

  try {
    await shell.openExternal(url);
    return { success: true, method: 'electron-shell' };
  } catch (error) {
    if (process.platform === 'linux') {
      try {
        await openByCommand('xdg-open', [url]);
        return { success: true, method: 'xdg-open' };
      } catch (fallbackError) {
        console.error('xdg-open fallback failed:', fallbackError);
      }
    }

    throw error;
  }
}

function getDefaultOutputDir() {
  const desktopPath = app.getPath('desktop');
  const defaultDir = path.join(desktopPath, 'VCF转换器');

  if (!fs.existsSync(defaultDir)) {
    fs.mkdirSync(defaultDir, { recursive: true });
  }

  return defaultDir;
}

function getIconPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app.asar', 'public', 'vcf-logo.ico');
  }
  return path.join(__dirname, '../public/vcf-logo.ico');
}

function createWindow() {
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 780,
    minWidth: 1150,
    minHeight: 720,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      devTools: false,
    },
    icon: getIconPath(),
    title: 'VCF转换器',
  });

  mainWindow.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });

  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; connect-src 'self' https://api-web.kunqiongai.com http://software.kunqiongai.com:8000; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; img-src 'self' data: https:;",
        ],
      },
    });
  });

  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    const devPort = process.env.VITE_DEV_PORT || 5173;
    mainWindow.loadURL(`http://localhost:${devPort}`);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

ipcMain.handle('get-default-output-dir', () => getDefaultOutputDir());

ipcMain.handle('select-files', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: options.filters || [],
  });
  return result.filePaths;
});

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });
  return result.filePaths[0];
});

ipcMain.handle('select-output-dir', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    defaultPath: getDefaultOutputDir(),
  });
  return result.filePaths[0];
});

ipcMain.handle('get-dirname', (event, filePath) => path.dirname(filePath));

ipcMain.handle('save-file', async (event, { filename, content, outputDir }) => {
  try {
    if (!filename || typeof filename !== 'string') {
      return { success: false, error: '无效的文件名' };
    }

    if (typeof content !== 'string') {
      return { success: false, error: '无效的文件内容' };
    }

    if (filename.includes('../') || filename.includes('..\\')) {
      return { success: false, error: '文件名包含非法字符' };
    }

    let targetDir = outputDir;
    if (!targetDir || targetDir === 'default') {
      targetDir = getDefaultOutputDir();
    } else if (typeof targetDir !== 'string' || targetDir.includes('../') || targetDir.includes('..\\')) {
      return { success: false, error: '输出目录路径不安全' };
    }

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    let filePath = path.join(targetDir, filename);
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filename);
      const name = path.basename(filename, ext);
      let counter = 1;
      while (fs.existsSync(filePath)) {
        filePath = path.join(targetDir, `${name}(${counter})${ext}`);
        counter++;
      }
    }

    const resolvedPath = path.resolve(filePath);
    const resolvedTargetDir = path.resolve(targetDir);
    if (!resolvedPath.startsWith(resolvedTargetDir)) {
      return { success: false, error: '路径不安全' };
    }

    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true, path: filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-binary-file', async (event, { filename, buffer, outputDir }) => {
  try {
    if (!filename || typeof filename !== 'string') {
      return { success: false, error: '无效的文件名' };
    }

    if (!Array.isArray(buffer) && !Buffer.isBuffer(buffer)) {
      return { success: false, error: '无效的文件内容' };
    }

    if (filename.includes('../') || filename.includes('..\\')) {
      return { success: false, error: '文件名包含非法字符' };
    }

    let targetDir = outputDir;
    if (!targetDir || targetDir === 'default') {
      targetDir = getDefaultOutputDir();
    } else if (typeof targetDir !== 'string' || targetDir.includes('../') || targetDir.includes('..\\')) {
      return { success: false, error: '输出目录路径不安全' };
    }

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    let filePath = path.join(targetDir, filename);
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filename);
      const name = path.basename(filename, ext);
      let counter = 1;
      while (fs.existsSync(filePath)) {
        filePath = path.join(targetDir, `${name}(${counter})${ext}`);
        counter++;
      }
    }

    const resolvedPath = path.resolve(filePath);
    const resolvedTargetDir = path.resolve(targetDir);
    if (!resolvedPath.startsWith(resolvedTargetDir)) {
      return { success: false, error: '路径不安全' };
    }

    fs.writeFileSync(filePath, Buffer.from(buffer));
    return { success: true, path: filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('open-folder', async (event, folderPath) => {
  try {
    let targetPath = folderPath;
    if (!targetPath || targetPath === 'default') {
      targetPath = getDefaultOutputDir();
    }

    if (fs.existsSync(targetPath)) {
      await shell.openPath(targetPath);
      return { success: true };
    }

    return { success: false, error: '文件夹不存在' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('open-external-url', async (event, url) => {
  try {
    console.log('Received open-external-url event with URL:', url);
    return await openExternalUrl(url);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('generate-signature', (event, { nonce, timestamp }) => {
  const message = `${nonce}|${timestamp}`;
  const hmac = crypto.createHmac('sha256', SECRET_KEY);
  hmac.update(message);
  return hmac.digest('base64');
});

ipcMain.handle('get-device-id', async () => {
  const nodeMachineId = await import('node-machine-id');
  const { machineIdSync } = nodeMachineId.default || nodeMachineId;
  return machineIdSync();
});

ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('get-software-id', () => SOFTWARE_ID);

ipcMain.handle('check-update', async () => {
  const version = app.getVersion();
  const url = `http://software.kunqiongai.com:8000/api/v1/updates/check/?software=${SOFTWARE_ID}&version=${version}`;

  console.log('Main process checking update:', url);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log('Main process update check result:', data);
    return data;
  } catch (error) {
    console.error('Main process check update error:', error);
    return { has_update: false, error: error.message };
  }
});

ipcMain.handle('start-update', async (event, { url, hash }) => {
  const isPackaged = app.isPackaged;
  const appPath = isPackaged ? path.dirname(app.getPath('exe')) : app.getAppPath();
  const updaterExeName = 'updater.exe';

  let updaterPath;
  if (isPackaged) {
    updaterPath = path.join(process.resourcesPath, updaterExeName);
  } else {
    updaterPath = path.join(__dirname, '../public', updaterExeName);
  }

  const mainExe = path.basename(app.getPath('exe'));
  const currentPid = process.pid.toString();

  if (!fs.existsSync(updaterPath)) {
    return { success: false, error: `更新程序未找到: ${updaterPath}` };
  }

  const args = ['--url', url, '--hash', hash, '--dir', appPath, '--exe', mainExe, '--pid', currentPid];
  const subprocess = spawn(updaterPath, args, {
    detached: true,
    stdio: 'ignore',
  });

  subprocess.unref();
  app.quit();
  return { success: true };
});

ipcMain.handle('quit-app', () => {
  app.quit();
});

ipcMain.handle('window-minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window-toggle-maximize', () => {
  if (!mainWindow) return { isMaximized: false };

  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }

  return { isMaximized: mainWindow.isMaximized() };
});

ipcMain.handle('window-close', () => {
  mainWindow?.close();
});

ipcMain.handle('window-is-maximized', () => mainWindow?.isMaximized() ?? false);
