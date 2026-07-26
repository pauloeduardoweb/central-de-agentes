export function getSafeImageUrl(url?: string): string {
  if (!url) return '';
  // postimg.cc blocks hotlinking from external sites like Vercel.
  // wsrv.nl proxies the image and bypasses hotlink restrictions.
  if (url.includes('postimg.cc') || url.includes('postimg.org')) {
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}`;
  }
  return url;
}


