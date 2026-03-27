/// <reference types="vite/client" />

interface ElectronAPI {
  getDefaultOutputDir: () => Promise<string>;
  selectFiles: (options: any) => Promise<string[] | null>;
  selectFolder: () => Promise<string | null>;
  selectOutputDir: () => Promise<string | null>;
  saveFile: (data: { filename: string; content: string; outputDir: string }) => Promise<{ success: boolean; path?: string; error?: string }>;
  saveBinaryFile: (data: { filename: string; buffer: number[]; outputDir: string }) => Promise<{ success: boolean; path?: string; error?: string }>;
  getDirname: (filePath: string) => Promise<string>;
  openFolder: (folderPath: string) => Promise<{ success: boolean; error?: string }>;
  openExternalUrl: (url: string) => Promise<{ success: boolean; error?: string; method?: string }>;
  generateSignature: (data: { nonce: string; timestamp: number }) => Promise<string>;
  getDeviceId: () => Promise<string>;
  getAppVersion: () => Promise<string>;
  getSoftwareId: () => Promise<string>;
  checkUpdate: () => Promise<any>;
  startUpdate: (data: { url: string; hash: string }) => Promise<{ success: boolean; error?: string }>;
  quitApp: () => Promise<void>;
  minimizeWindow: () => Promise<void>;
  toggleMaximizeWindow: () => Promise<{ isMaximized: boolean }>;
  closeWindow: () => Promise<void>;
  isWindowMaximized: () => Promise<boolean>;
}

declare global {
  interface Window {
    require?: any;
    electronAPI?: ElectronAPI;
  }
}

export {};
