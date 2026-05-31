import { useEffect } from "react";

const SITE_URL = "https://bookshop-rho-ebon.vercel.app";
const DEFAULT_DESCRIPTION = "Compra libros físicos con entregas, seguimiento claro y atención por WhatsApp.";
const DEFAULT_KEYWORDS = "librería, libros físicos, comprar libros RD, novelas, desarrollo personal, Librería SJ";
const DEFAULT_IMAGE = `${SITE_URL}/reference/libreria-sj-hero-scene.png`;

function ensureMetaTag(selector, attributes = {}) {
  let element = document.head.querySelector(selector);

  if (!element) {
    element = document.createElement("meta");
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
    document.head.appendChild(element);
  }

  return element;
}

function ensureCanonicalTag() {
  let element = document.head.querySelector('link[rel="canonical"]');

  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", "canonical");
    document.head.appendChild(element);
  }

  return element;
}

export default function usePageMeta({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords = DEFAULT_KEYWORDS,
  canonicalPath,
  robots = "index, follow",
  image = DEFAULT_IMAGE,
}) {
  useEffect(() => {
    const path = canonicalPath || window.location.pathname || "/";
    const canonicalUrl = `${SITE_URL}${path}`;
    const resolvedTitle = title ? `${title} | Librería SJ` : "Librería SJ | Libros físicos";

    document.title = resolvedTitle;

    const descriptionTag = ensureMetaTag('meta[name="description"]', { name: "description" });
    const keywordsTag = ensureMetaTag('meta[name="keywords"]', { name: "keywords" });
    const robotsTag = ensureMetaTag('meta[name="robots"]', { name: "robots" });
    const ogTitleTag = ensureMetaTag('meta[property="og:title"]', { property: "og:title" });
    const ogDescriptionTag = ensureMetaTag('meta[property="og:description"]', { property: "og:description" });
    const ogTypeTag = ensureMetaTag('meta[property="og:type"]', { property: "og:type" });
    const ogUrlTag = ensureMetaTag('meta[property="og:url"]', { property: "og:url" });
    const ogImageTag = ensureMetaTag('meta[property="og:image"]', { property: "og:image" });
    const twitterTitleTag = ensureMetaTag('meta[name="twitter:title"]', { name: "twitter:title" });
    const twitterDescriptionTag = ensureMetaTag('meta[name="twitter:description"]', {
      name: "twitter:description",
    });
    const twitterImageTag = ensureMetaTag('meta[name="twitter:image"]', { name: "twitter:image" });
    const canonicalTag = ensureCanonicalTag();

    descriptionTag.setAttribute("content", description);
    keywordsTag.setAttribute("content", keywords);
    robotsTag.setAttribute("content", robots);
    ogTitleTag.setAttribute("content", resolvedTitle);
    ogDescriptionTag.setAttribute("content", description);
    ogTypeTag.setAttribute("content", "website");
    ogUrlTag.setAttribute("content", canonicalUrl);
    ogImageTag.setAttribute("content", image);
    twitterTitleTag.setAttribute("content", resolvedTitle);
    twitterDescriptionTag.setAttribute("content", description);
    twitterImageTag.setAttribute("content", image);
    canonicalTag.setAttribute("href", canonicalUrl);
  }, [canonicalPath, description, image, keywords, robots, title]);
}
