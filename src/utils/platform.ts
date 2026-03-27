export async function openExternalUrl(url: string): Promise<void> {
  if (window.electronAPI?.openExternalUrl) {
    const result = await window.electronAPI.openExternalUrl(url);
    if (!result?.success) {
      throw new Error(result?.error || 'Failed to open external URL');
    }
    return;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
}
