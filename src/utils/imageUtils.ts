/**
 * Formats image URLs, converting Pixiv artwork page URLs and direct pximg.net image URLs
 * to public proxy URLs (like pixiv.cat) to bypass Pixiv's hotlink/referer restrictions.
 */
export function formatImageUrl(url: string): string {
  if (!url || typeof url !== 'string') return url;

  const trimmedUrl = url.trim();

  // 1. Pixiv Artwork page links (e.g. https://www.pixiv.net/artworks/113591033 or /en/artworks/113591033 or member_illust.php?illust_id=113591033)
  const pixivArtworkMatch = trimmedUrl.match(/pixiv\.net\/(?:[a-z]{2}\/)?(?:artworks\/|i\/|member_illust\.php\?.*illust_id=)(\d+)/i);
  if (pixivArtworkMatch) {
    const illustId = pixivArtworkMatch[1];
    return `https://pixiv.cat/${illustId}.jpg`;
  }

  // 2. Direct pximg.net image links (e.g. https://i.pximg.net/img-master/img/2023/11/21/18/42/08/113591033_p0_master1200.jpg)
  if (trimmedUrl.includes('pximg.net')) {
    const pximgMatch = trimmedUrl.match(/(\d+)_p(\d+)/i);
    if (pximgMatch) {
      const illustId = pximgMatch[1];
      const pageNum = parseInt(pximgMatch[2], 10);
      if (pageNum === 0) {
        return `https://pixiv.cat/${illustId}.jpg`;
      } else {
        return `https://pixiv.cat/${illustId}-${pageNum + 1}.jpg`;
      }
    }
    // Fallback if no _p tag found but has pximg.net and an illust ID
    const idMatch = trimmedUrl.match(/\/(\d{7,10})(?:[._-]|\b)/);
    if (idMatch) {
      return `https://pixiv.cat/${idMatch[1]}.jpg`;
    }
  }

  // 3. Fallback for any other Pixiv URL containing an illust ID (8-10 digits)
  if (trimmedUrl.toLowerCase().includes('pixiv')) {
    const idMatch = trimmedUrl.match(/(\d{8,10})/);
    if (idMatch) {
      return `https://pixiv.cat/${idMatch[1]}.jpg`;
    }
  }

  return trimmedUrl;
}
