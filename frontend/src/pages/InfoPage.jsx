import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import { getSiteContent } from "../services/api";
import usePageMeta from "../hooks/usePageMeta";

const INFO_SECTION_MAP = {
  nosotros: "about",
  preguntas: "faq",
  politicas: "policies",
  envios: "shipping",
  contacto: "contact",
};

const PAGE_META = {
  nosotros: {
    title: "Nosotros",
    description: "Conoce la historia y la propuesta de nuestra libreria de libros fisicos.",
  },
  preguntas: {
    title: "Preguntas frecuentes",
    description: "Resuelve dudas sobre ordenes, entregas y seguimiento de libros fisicos.",
  },
  politicas: {
    title: "Politicas",
    description: "Consulta politicas de compra, stock, confirmacion y atencion postventa.",
  },
  envios: {
    title: "Envios",
    description: "Informacion de envios, entregas y coordinacion de libros fisicos.",
  },
  contacto: {
    title: "Contacto",
    description: "Contacta a BookShop por WhatsApp o correo para ayuda y seguimiento.",
  },
};

function renderSectionItems(items) {
  if (!items?.length) {
    return null;
  }

  const isObjectList = typeof items[0] === "object";

  return (
    <div className="info-items">
      {items.map((item, index) =>
        isObjectList ? (
          <article key={`${item.title}-${index}`} className="info-card">
            <h3>{item.title}</h3>
            <p>{item.body}</p>
          </article>
        ) : (
          <article key={`${item}-${index}`} className="info-card">
            <p>{item}</p>
          </article>
        ),
      )}
    </div>
  );
}

function InfoPage({ slug, cartItems, onOpenCart, onNavigate, onBrandReset }) {
  const [sections, setSections] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const meta = PAGE_META[slug] || PAGE_META.nosotros;
  usePageMeta(meta);

  useEffect(() => {
    async function loadContent() {
      try {
        setLoading(true);
        setError("");
        const response = await getSiteContent();
        setSections(response.data || {});
      } catch (loadError) {
        setError(loadError.message || "No se pudo cargar esta pagina");
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

  return (
    <main className="page-shell">
      <Navbar
        cartItems={cartItems}
        onOpenCart={onOpenCart}
        onNavigate={onNavigate}
        onBrandReset={onBrandReset}
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
                  onClick={() => onNavigate(ctaView)}
                >
                  {section.cta_text || "Volver a la tienda"}
                </button>
              ) : null}
              <button type="button" className="secondary-button" onClick={() => onNavigate("home")}>
                Ir al catalogo
              </button>
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}

export default InfoPage;
