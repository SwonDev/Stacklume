/**
 * Stacklume Extension — Content Script
 * Extrae metadatos de la página actual y los envía al popup.
 */

function getMeta(name) {
  const el =
    document.querySelector(`meta[property="${name}"]`) ||
    document.querySelector(`meta[name="${name}"]`);
  return el ? el.getAttribute("content") || "" : "";
}

function getCanonicalUrl() {
  const link = document.querySelector('link[rel="canonical"]');
  return link ? link.href : window.location.href;
}

function getFaviconUrl() {
  // Orden de preferencia: apple-touch-icon > icon (svg) > icon (png) > shortcut icon > /favicon.ico
  const selectors = [
    'link[rel="apple-touch-icon"]',
    'link[rel="icon"][type="image/svg+xml"]',
    'link[rel="icon"][sizes="32x32"]',
    'link[rel="icon"][sizes="16x16"]',
    'link[rel="icon"]',
    'link[rel="shortcut icon"]',
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.href) return el.href;
  }
  return `${window.location.origin}/favicon.ico`;
}

function getMetadata() {
  const url = getCanonicalUrl();
  const title =
    getMeta("og:title") ||
    getMeta("twitter:title") ||
    document.title ||
    "";
  const description =
    getMeta("og:description") ||
    getMeta("twitter:description") ||
    getMeta("description") ||
    "";
  const imageUrl =
    getMeta("og:image") ||
    getMeta("twitter:image") ||
    getMeta("twitter:image:src") ||
    "";
  const siteName =
    getMeta("og:site_name") ||
    getMeta("application-name") ||
    "";
  const author =
    getMeta("author") ||
    getMeta("article:author") ||
    "";
  const faviconUrl = getFaviconUrl();

  return { url, title, description, imageUrl, faviconUrl, siteName, author };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_METADATA") {
    sendResponse({ success: true, data: getMetadata() });
  }
  return true;
});
