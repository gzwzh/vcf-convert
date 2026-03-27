import * as electron from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { spawn } from 'child_process';

const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = electron;

const SECRET_KEY = "7530bfb1ad6c41627b0f0620078fa5ed";
const SOFTWARE_ID = "10023";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// 获取默认输出目录（桌面/VCF转换器）
function getDefaultOutputDir() {
  const desktopPath = app.getPath('desktop');
  const defaultDir = path.join(desktopPath, 'VCF转换器');
  
  // 如果目录不存在则创建
  if (!fs.existsSync(defaultDir)) {
    fs.mkdirSync(defaultDir, { recursive: true });
  }
  
  return defaultDir;
}

// 获取图标路径（开发环境和生产环境不同）
function getIconPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app.asar', 'public', 'vcf-logo.ico');
  }
  return path.join(__dirname, '../public/vcf-logo.ico');
}

function createWindow() {
  // 移除调试菜单，使用默认或空菜单
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
      devTools: false, // 禁用开发者工具
    },
    icon: getIconPath(),
    title: 'VCF转换器',
  });

  // 禁用默认的拖拽行为，允许自定义拖拽
  mainWindow.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });
  
  // 设置拖拽文件的处理
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self'; connect-src 'self' https://api-web.kunqiongai.com http://software.kunqiongai.com:8000; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; img-src 'self' data: https:;"]
      }
    });
  });

  // 开发环境加载本地服务，生产环境加载打包文件
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

// 获取默认输出目录
ipcMain.handle('get-default-output-dir', () => {
  return getDefaultOutputDir();
});

// 选择文件对话框
ipcMain.handle('select-files', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: options.filters || [],
  });
  return result.filePaths;
});

// 选择文件夹对话框
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });
  return result.filePaths[0];
});

// 选择保存目录
ipcMain.handle('select-output-dir', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    defaultPath: getDefaultOutputDir(),
  });
  return result.filePaths[0];
});

// 获取文件所在目录
ipcMain.handle('get-dirname', (event, filePath) => {
  return path.dirname(filePath);
});

// 保存文件到指定目录
ipcMain.handle('save-file', async (event, { filename, content, outputDir }) => {
  try {
    // 验证输入参数
    if (!filename || typeof filename !== 'string') {
      return { success: false, error: '无效的文件名' };
    }
    
    if (typeof content !== 'string') {
      return { success: false, error: '无效的文件内容' };
    }
    
    // 验证文件名安全性，防止路径遍历
    if (filename.includes('../') || filename.includes('..\\')) {
      return { success: false, error: '文件名包含非法字符' };
    }
    
    let targetDir = outputDir;
    
    // 如果是默认目录，使用桌面/VCF转换器
    if (!targetDir || targetDir === 'default') {
      targetDir = getDefaultOutputDir();
    } else {
      // 验证输出目录的安全性
      if (typeof targetDir !== 'string' || targetDir.includes('../') || targetDir.includes('..\\')) {
        return { success: false, error: '输出目录路径不安全' };
      }
    }
    
    // 确保目录存在
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    let filePath = path.join(targetDir, filename);

    // 如果文件已存在，自动重命名: filename(1).ext
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filename);
      const name = path.basename(filename, ext);
      let counter = 1;
      while (fs.existsSync(filePath)) {
        filePath = path.join(targetDir, `${name}(${counter})${ext}`);
        counter++;
      }
    }
    
    // 验证最终路径是否在允许的目录内（防止路径遍历）
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

// 保存二进制文件（如 Excel）
ipcMain.handle('save-binary-file', async (event, { filename, buffer, outputDir }) => {
  try {
    // 验证输入参数
    if (!filename || typeof filename !== 'string') {
      return { success: false, error: '无效的文件名' };
    }
    
    if (!Array.isArray(buffer) && !Buffer.isBuffer(buffer)) {
      return { success: false, error: '无效的文件内容' };
    }
    
    // 验证文件名安全性，防止路径遍历
    if (filename.includes('../') || filename.includes('..\\')) {
      return { success: false, error: '文件名包含非法字符' };
    }
    
    let targetDir = outputDir;
    
    if (!targetDir || targetDir === 'default') {
      targetDir = getDefaultOutputDir();
    } else {
      // 验证输出目录的安全性
      if (typeof targetDir !== 'string' || targetDir.includes('../') || targetDir.includes('..\\')) {
        return { success: false, error: '输出目录路径不安全' };
      }
    }
    
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    let filePath = path.join(targetDir, filename);

    // 如果文件已存在，自动重命名: filename(1).ext
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filename);
      const name = path.basename(filename, ext);
      let counter = 1;
      while (fs.existsSync(filePath)) {
        filePath = path.join(targetDir, `${name}(${counter})${ext}`);
        counter++;
      }
    }
    
    // 验证最终路径是否在允许的目录内（防止路径遍历）
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


// 打开文件夹
ipcMain.handle('open-folder', async (event, folderPath) => {
  try {
    let targetPath = folderPath;
    if (!targetPath || targetPath === 'default') {
      targetPath = getDefaultOutputDir();
    }
    
    if (fs.existsSync(targetPath)) {
      await shell.openPath(targetPath);
      return { success: true };
    } else {
      return { success: false, error: '文件夹不存在' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 打开外部URL
ipcMain.handle('open-external-url', async (event, url) => {
  try {
    console.log('Received open-external-url event with URL:', url);
    return await openExternalUrl(url);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 生成签名
ipcMain.handle('generate-signature', (event, { nonce, timestamp }) => {
  const message = `${nonce}|${timestamp}`;
  const hmac = crypto.createHmac('sha256', SECRET_KEY);
  hmac.update(message);
  return hmac.digest('base64');
});

// 获取设备ID（基于机器信息生成唯一标识）
ipcMain.handle('get-device-id', async () => {
  const nodeMachineId = await import('node-machine-id');
  const { machineIdSync } = nodeMachineId.default || nodeMachineId;
  return machineIdSync();
});

// 获取应用版本
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// 获取软件ID
ipcMain.handle('get-software-id', () => {
  return SOFTWARE_ID;
});

// 检查更新
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

// 启动更新程序
ipcMain.handle('start-update', async (event, { url, hash }) => {
  const isPackaged = app.isPackaged;
  const appPath = isPackaged ? path.dirname(app.getPath('exe')) : app.getAppPath();
  const updaterExeName = 'updater.exe';
  
  let updaterPath;
  if (isPackaged) {
    // 生产环境下，使用 extraResources 配置，文件会在 resources 目录下
    updaterPath = path.join(process.resourcesPath, updaterExeName);
  } else {
    // 开发环境下
    updaterPath = path.join(__dirname, '../public', updaterExeName);
  }

  const mainExe = path.basename(app.getPath('exe'));
  const currentPid = process.pid.toString();

  console.log('Starting update with:', {
    updaterPath,
    url,
    hash,
    appPath,
    mainExe,
    currentPid
  });

  if (!fs.existsSync(updaterPath)) {
    return { success: false, error: `更新程序未找到: ${updaterPath}` };
  }

  const args = [
    '--url', url,
    '--hash', hash,
    '--dir', appPath,
    '--exe', mainExe,
    '--pid', currentPid
  ];

  const subprocess = spawn(updaterPath, args, {
    detached: true,
    stdio: 'ignore'
  });

  subprocess.unref();
  app.quit();
  return { success: true };
});

// 退出应用
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

ipcMain.handle('window-is-maximized', () => {
  return mainWindow?.isMaximized() ?? false;
});
