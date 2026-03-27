const API_BASE_URL = "https://api-web.kunqiongai.com";
const SOFT_NUMBER = "10023"; // 软件编号

export interface Advertisement {
  soft_number: number;
  adv_position: string;
  adv_url: string;
  target_url: string;
  width: number;
  height: number;
}

/**
 * 获取广告
 */
export async function getAdvertisement(advPosition: string = "adv_position_01"): Promise<Advertisement | null> {
  try {
    const url = `${API_BASE_URL}/soft_desktop/get_adv`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `soft_number=${SOFT_NUMBER}&adv_position=${advPosition}`,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    if (result.code === 1 && result.data && result.data.length > 0) {
      return result.data[0];
    }
    return null;
  } catch (error) {
    console.error('获取广告失败:', error);
    return null;
  }
}

/**
 * 打开广告链接
 */
export function openAdvertisementLink(targetUrl: string) {
  if (window.electronAPI) {
    window.electronAPI.openExternalUrl(targetUrl);
  } else {
    window.open(targetUrl, '_blank');
  }
}
