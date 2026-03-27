const API_BASE_URL = "https://api-web.kunqiongai.com";
const SOFT_NUMBER = "10023";
const AUTH_CODE_STORAGE_KEY = "auth_code";
const DEVICE_ID_STORAGE_KEY = "device_id";

// 缓存设备ID，避免重复获取
let cachedDeviceId: string | null = null;

/**
 * 获取设备ID
 */
export async function getDeviceId(): Promise<string> {
  // 优先使用缓存
  if (cachedDeviceId) {
    return cachedDeviceId;
  }

  if (window.electronAPI?.getDeviceId) {
    cachedDeviceId = await window.electronAPI.getDeviceId();
    return cachedDeviceId;
  }
  
  // 浏览器环境下使用 localStorage 中的 UUID
  let deviceId = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_STORAGE_KEY, deviceId);
  }
  cachedDeviceId = deviceId;
  return deviceId;
}

/**
 * 获取软件编号
 */
export function getSoftNumber(): string {
  return SOFT_NUMBER;
}

/**
 * 检查是否需要授权码
 * @param forceCheck 是否强制检查（忽略本地缓存）
 */
export async function checkNeedAuthCode(forceCheck = false): Promise<{ 
  needAuth: boolean; 
  authCodeUrl?: string;
  deviceId?: string;
}> {
  try {
    const deviceId = await getDeviceId();
    
    // 如果不是强制检查，先验证本地存储的授权码
    if (!forceCheck) {
      const storedAuthCode = getStoredAuthCode();
      if (storedAuthCode) {
        const isValid = await verifyStoredAuthCode(storedAuthCode);
        if (isValid) {
          return { needAuth: false, deviceId };
        }
        // 本地授权码无效，清除它
        clearStoredAuthCode();
      }
    }

    const url = `${API_BASE_URL}/soft_desktop/check_get_auth_code`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `device_id=${encodeURIComponent(deviceId)}&soft_number=${encodeURIComponent(SOFT_NUMBER)}`,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    if (result.code === 1) {
      const needAuth = result.data.is_need_auth_code === 1;
      // 拼接完整的授权码获取URL，包含设备ID和软件编号
      let authCodeUrl = result.data.auth_code_url;
      if (authCodeUrl && needAuth) {
        const separator = authCodeUrl.includes('?') ? '&' : '?';
        authCodeUrl = `${authCodeUrl}${separator}device_id=${encodeURIComponent(deviceId)}&software_code=${encodeURIComponent(SOFT_NUMBER)}`;
      }
      return {
        needAuth,
        authCodeUrl,
        deviceId,
      };
    }
    throw new Error(result.msg || '检查授权状态失败');
  } catch (error) {
    console.error('检查授权状态异常:', error);
    throw error;
  }
}

/**
 * 静默验证本地存储的授权码（不抛出异常）
 */
async function verifyStoredAuthCode(authCode: string): Promise<boolean> {
  try {
    const deviceId = await getDeviceId();
    const url = `${API_BASE_URL}/soft_desktop/check_auth_code_valid`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `device_id=${encodeURIComponent(deviceId)}&soft_number=${encodeURIComponent(SOFT_NUMBER)}&auth_code=${encodeURIComponent(authCode)}`,
    });

    if (!response.ok) {
      return false;
    }

    const result = await response.json();
    return result.code === 1 && result.data.auth_code_status === 1;
  } catch {
    return false;
  }
}

/**
 * 验证授权码
 */
export async function verifyAuthCode(authCode: string): Promise<boolean> {
  try {
    const deviceId = await getDeviceId();
    const url = `${API_BASE_URL}/soft_desktop/check_auth_code_valid`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `device_id=${encodeURIComponent(deviceId)}&soft_number=${encodeURIComponent(SOFT_NUMBER)}&auth_code=${encodeURIComponent(authCode)}`,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    if (result.code === 1 && result.data.auth_code_status === 1) {
      // 保存授权码到本地
      localStorage.setItem(AUTH_CODE_STORAGE_KEY, authCode);
      return true;
    }
    return false;
  } catch (error) {
    console.error('验证授权码异常:', error);
    throw error;
  }
}

/**
 * 获取本地保存的授权码
 */
export function getStoredAuthCode(): string | null {
  return localStorage.getItem(AUTH_CODE_STORAGE_KEY);
}

/**
 * 清除本地保存的授权码
 */
export function clearStoredAuthCode(): void {
  localStorage.removeItem(AUTH_CODE_STORAGE_KEY);
}

/**
 * 复制设备ID到剪贴板
 */
export async function copyDeviceIdToClipboard(): Promise<boolean> {
  try {
    const deviceId = await getDeviceId();
    await navigator.clipboard.writeText(deviceId);
    return true;
  } catch {
    return false;
  }
}
