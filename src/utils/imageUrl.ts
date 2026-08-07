export function getSafeImageUrl(url?: string): string {
  if (!url) return '';
  let cleanUrl = url.trim();

  // Convert postimg viewer page link (e.g. postimg.cc/23hY7Btq) to direct image link
  const pageMatch = cleanUrl.match(/https?:\/\/(?:www\.)?postimg\.cc\/([a-zA-Z0-9]+)\/?$/);
  if (pageMatch) {
    cleanUrl = `https://i.postimg.cc/${pageMatch[1]}/apresentacao-viral-creator.png`;
  }

  // wsrv.nl proxies the image to bypass hotlink blocks in ultra HD quality
  if (cleanUrl.includes('postimg.cc') || cleanUrl.includes('postimg.org')) {
    return `https://wsrv.nl/?url=${encodeURIComponent(cleanUrl)}&output=webp&q=98`;
  }

  return cleanUrl;
}


