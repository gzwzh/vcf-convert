import { v4 as uuidv4 } from 'uuid';
import { t } from './i18n';
import { openExternalUrl } from './platform';

const isDesktop = !!window.electronAPI;
const API_BASE_URL = isDesktop ? 'https://api-web.kunqiongai.com' : '/api';
const SIGNING_SECRET_KEY = '7530bfb1ad6c41627b0f0620078fa5ed';

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

async function generateBrowserSignature(nonce: string, timestamp: number) {
  const encoder = new TextEncoder();
  const message = `${nonce}|${timestamp}`;
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(SIGNING_SECRET_KEY),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return bytesToBase64(new Uint8Array(signature));
}

export async function generateSignedNonce() {
  const nonce = uuidv4().replace(/-/g, '');
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = window.electronAPI?.generateSignature
    ? await window.electronAPI.generateSignature({ nonce, timestamp })
    : await generateBrowserSignature(nonce, timestamp);

  return {
    nonce,
    timestamp,
    signature,
  };
}

export function encodeSignedNonce(signedNonce: { nonce: string; timestamp: number; signature: string }) {
  const jsonStr = JSON.stringify(signedNonce);
  const base64Str = btoa(jsonStr);
  return base64Str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function getWebLoginUrl(): Promise<string> {
  const candidateUrls = isDesktop
    ? [
        '/api/auth/login-url',
        `${API_BASE_URL}/soft_desktop/get_web_login_url`,
      ]
    : [`${API_BASE_URL}/soft_desktop/get_web_login_url`];

  let lastError: unknown = null;

  for (const url of candidateUrls) {
    try {
      const response = await fetch(url, { method: 'POST' });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      if (result.code === 1 && result.data.login_url) {
        return result.data.login_url;
      }
      throw new Error(`${t('auth.get_login_url_fail')}: ${result.msg || t('common.unknown_error')}`);
    } catch (error) {
      lastError = error;
      console.error(`${t('auth.get_login_url_fail')} [${url}]:`, error);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(t('auth.get_login_url_fail'));
}

export async function startDesktopLoginProcess() {
  const signedNonce = await generateSignedNonce();
  const encodedNonce = encodeSignedNonce(signedNonce);
  const webLoginUrl = await getWebLoginUrl();
  const finalLoginUrl = `${webLoginUrl}?client_type=desktop&client_nonce=${encodedNonce}`;

  await openExternalUrl(finalLoginUrl);

  return { encodedNonce, finalLoginUrl };
}

export function pollToken(encodedNonce: string, timeout = 300000) {
  let intervalId: NodeJS.Timeout | null = null;

  const promise = new Promise<string>((resolve, reject) => {
    const startTime = Date.now();
    const pollUrl = `${API_BASE_URL}/user/desktop_get_token`;

    const poll = async () => {
      if (Date.now() - startTime > timeout) {
        if (intervalId) {
          clearInterval(intervalId);
        }
        reject(new Error(t('auth.login_timeout')));
        return;
      }

      try {
        const response = await fetch(pollUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `client_type=desktop&client_nonce=${encodedNonce}`,
        });

        if (response.ok) {
          const result = await response.json();
          if (result.code === 1 && result.data.token) {
            if (intervalId) {
              clearInterval(intervalId);
            }
            resolve(result.data.token);
          }
        }
      } catch (error) {
        console.error('poll error:', error);
      }
    };

    intervalId = setInterval(poll, 2000);
    poll();
  });

  const cancel = () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  };

  return { promise, cancel };
}

export async function getUserInfo(token: string) {
  const url = `${API_BASE_URL}/soft_desktop/get_user_info`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      token,
    },
  });
  const result = await response.json();
  if (result.code === 1) {
    return result.data.user_info;
  }
  throw new Error(result.msg || t('auth.get_user_info_fail'));
}

export async function checkLogin(token: string): Promise<boolean> {
  const url = `${API_BASE_URL}/user/check_login`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `token=${token}`,
  });
  const result = await response.json();
  return result.code === 1;
}

export async function logout(token: string) {
  const url = `${API_BASE_URL}/logout`;
  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      token,
    },
  });
}

export async function getCustomUrl(): Promise<string> {
  const url = `${API_BASE_URL}/soft_desktop/get_custom_url`;
  try {
    const response = await fetch(url, { method: 'POST' });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result = await response.json();
    if (result.code === 1 && result.data.url) {
      return result.data.url;
    }
    throw new Error(`${t('app.errors.get_custom_url_fail')}: ${result.msg || t('common.unknown_error')}`);
  } catch (error) {
    console.error(`${t('app.errors.get_custom_url_fail')}:`, error);
    throw error;
  }
}

export async function getFeedbackUrl(): Promise<string> {
  const url = `${API_BASE_URL}/soft_desktop/get_feedback_url`;
  const SOFT_NUMBER = '10023';
  try {
    const response = await fetch(url, { method: 'POST' });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result = await response.json();
    if (result.code === 1 && result.data.url) {
      return `${result.data.url}${SOFT_NUMBER}`;
    }
    throw new Error(`${t('app.errors.get_feedback_url_fail')}: ${result.msg || t('common.unknown_error')}`);
  } catch (error) {
    console.error(`${t('app.errors.get_feedback_url_fail')}:`, error);
    throw error;
  }
}
