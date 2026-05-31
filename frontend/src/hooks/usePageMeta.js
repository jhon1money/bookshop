import { useEffect } from "react";

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

export default function usePageMeta({
  title,
  description,
  image = "https://bookshop-rho-ebon.vercel.app/reference/libreria-sj-hero-scene.png",
}) {
  useEffect(() => {
    const resolvedTitle = title ? `${title} | Librería SJ` : "Librería SJ | Libros físicos";
    document.title = resolvedTitle;

    const descriptionTag = ensureMetaTag('meta[name="description"]', { name: "description" });
    const ogTitleTag = ensureMetaTag('meta[property="og:title"]', { property: "og:title" });
    const ogDescriptionTag = ensureMetaTag('meta[property="og:description"]', { property: "og:description" });
    const ogTypeTag = ensureMetaTag('meta[property="og:type"]', { property: "og:type" });
    const ogImageTag = ensureMetaTag('meta[property="og:image"]', { property: "og:image" });

    descriptionTag.setAttribute("content", description || "Compra libros físicos con entregas y seguimiento claro.");
    ogTitleTag.setAttribute("content", resolvedTitle);
    ogDescriptionTag.setAttribute(
      "content",
      description || "Compra libros físicos con entregas y seguimiento claro.",
    );
    ogTypeTag.setAttribute("content", "website");
    ogImageTag.setAttribute("content", image);
  }, [description, image, title]);
}
