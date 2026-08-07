export function getSafeImageUrl(url?: string): string {
  if (!url) return '';
  const cleanUrl = url.trim();
  if (!cleanUrl) return '';

  return cleanUrl;
}



