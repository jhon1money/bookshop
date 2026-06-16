import { useEffect, useMemo, useState } from "react";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import { getSiteContent } from "../services/api";
import usePageMeta from "../hooks/usePageMeta";

const INFO_SECTION_MAP = {
  nosotros: "about",
  preguntas: "faq",
  politicas: "policies",
  envios: "shipping",
  contacto: "about",
};

const PAGE_META = {
  nosotros: {
    title: "Nosotros",
    description: "Conoce la historia y la propuesta de nuestra librería de libros físicos.",
  },
  preguntas: {
    title: "Preguntas frecuentes",
    description: "Resuelve dudas sobre órdenes, entregas y seguimiento de libros físicos.",
  },
  politicas: {
    title: "Políticas",
    description: "Consulta políticas de compra, stock, confirmación y atención postventa.",
  },
  envios: {
    title: "Envíos",
    description: "Información de envíos, entregas y coordinación de libros físicos.",
  },
  contacto: {
    title: "Sobre nosotros",
    description: "Conoce nuestra librería y la forma en que acompañamos cada compra.",
  },
};

function normalizeCardTitle(value = "") {
  return value
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function getSectionItemTitle(item) {
  if (!item || typeof item !== "object") {
    return "";
  }

  const title = item.title || "";
  return normalizeCardTitle(title) === "libreria sj" ? "" : title;
}

function getSectionItemBody(item) {
  if (!item) {
    return "";
  }

  return typeof item === "object" ? item.body || "" : item;
}

function renderSectionItems(items) {
  if (!items?.length) {
    return null;
  }

  return (
    <div className="info-items">
      {items.map((item, index) => {
        const title = getSectionItemTitle(item);
        const body = getSectionItemBody(item);

        return (
          <article
            key={`${title || body}-${index}`}
            className="info-card"
            style={{ "--card-index": index }}
          >
            <span className="info-card-number">{String(index + 1).padStart(2, "0")}</span>
            {title ? <h3>{title}</h3> : null}
            <p>{body}</p>
          </article>
        );
      })}
    </div>
  );
}

function InfoPage({ slug, cartItems, onOpenCart, onNavigate, onBrandReset, activeView }) {
  const [sections, setSections] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const meta = PAGE_META[slug] || PAGE_META.nosotros;
  usePageMeta({
    ...meta,
    canonicalPath: `/${slug}`,
  });

  useEffect(() => {
    async function loadContent() {
      try {
        setLoading(true);
        setError("");
        const response = await getSiteContent();
        setSections(response.data || {});
      } catch (loadError) {
        setError(loadError.message || "No se cargó la página.");
      } finally {
        setLoading(false);
      }
    }

    loadContent();
  }, [slug]);

  const section = useMemo(() => sections[INFO_SECTION_MAP[slug]] || null, [sections, slug]);
  const ctaView = section?.cta_link?.startsWith("/#")
    ? "home"
    : section?.cta_link?.replace("/", "") || "home";

  function handleCtaNavigation() {
    if (section?.cta_link?.startsWith("/#")) {
      const sectionId = section.cta_link.replace("/#", "");
      onNavigate("home");
      window.requestAnimationFrame(() => {
        window.setTimeout(() => {
          document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 120);
      });
      return;
    }

    onNavigate(ctaView);
  }

  return (
    <main className="page-shell">
      <Navbar
        cartItems={cartItems}
        onOpenCart={onOpenCart}
        onNavigate={onNavigate}
        onBrandReset={onBrandReset}
        activeView={activeView}
      />

      <section className="container info-page-shell">
        <article className="info-hero">
          <p className="section-label">{section?.subtitle || meta.title}</p>
          <h1>{section?.title || meta.title}</h1>
          <p className="hero-copy">{section?.body || meta.description}</p>
        </article>

        {loading ? <div className="status-box shimmer-block">Cargando contenido...</div> : null}
        {error ? <p className="status-box error-box">{error}</p> : null}

        {!loading && !error && section ? (
          <>
            {renderSectionItems(section.items)}
            <div className="info-actions">
              {section.cta_link ? (
                <button
                  type="button"
                  className="primary-button"
                  onClick={handleCtaNavigation}
                >
                  {section.cta_text || "Volver a la tienda"}
                </button>
              ) : null}
              <button type="button" className="secondary-button" onClick={() => onNavigate("home")}>
                Ir al catálogo
              </button>
            </div>
          </>
        ) : null}
      </section>
      <Footer onNavigate={onNavigate} />
    </main>
  );
}

export default InfoPage;
