import { useDeferredValue, useEffect, useMemo, useState } from "react";
import BookCard from "../components/BookCard";
import Navbar from "../components/Navbar";
import SearchBar from "../components/SearchBar";
import CartDrawer from "../components/CartDrawer";
import Footer from "../components/Footer";
import { getBooks, getCategories, getSiteContent } from "../services/api";
import usePageMeta from "../hooks/usePageMeta";

const FALLBACK_CATEGORIES = [
  "Todos",
  "Programación",
  "Tecnología",
  "Desarrollo personal",
  "Negocios",
  "Marketing",
  "Finanzas",
  "Psicología",
  "Romance",
  "Fantasía",
  "Ciencia ficción",
  "Misterio",
  "Thriller",
  "Historia",
  "Biografías",
  "Filosofía",
  "Ciencia",
  "Salud",
  "Educación",
  "Infantil",
];

const UPCOMING_COMBOS = [
  { label: "Lecturas 2x1", slug: "lecturas-2x1" },
];
const HOME_ABOUT_ITEMS_LIMIT = 6;

function isGenericCardTitle(value = "") {
  return normalizeText(value).trim() === "libreria sj";
}

function getCardTitle(item) {
  if (!item || typeof item !== "object") {
    return "";
  }

  const title = item.title || "";
  return title && !isGenericCardTitle(title) ? title : "";
}

function getCardBody(item) {
  if (!item) {
    return "";
  }

  return typeof item === "object" ? item.body || "" : item;
}

function normalizeText(value) {
  return value
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function toSlug(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function inferCategorySlugs(book, backendCategoryMap) {
  const categorySlugs = new Set();
  const haystack = normalizeText(`${book.titulo || ""} ${book.autor || ""} ${book.descripcion || ""}`);

  if (book.category_id && backendCategoryMap.has(book.category_id)) {
    categorySlugs.add(backendCategoryMap.get(book.category_id));
  }

  const keywordRules = [
    { slug: "programacion", keywords: ["code", "program", "python", "java", "javascript", "software"] },
    { slug: "tecnologia", keywords: ["tecnologia", "digital", "comput", "startup", "internet"] },
    { slug: "desarrollo-personal", keywords: ["habitos", "desarrollo", "crecimiento", "autoayuda", "liderazgo"] },
    { slug: "negocios", keywords: ["negocio", "empresa", "ventas", "emprend", "manager"] },
    { slug: "marketing", keywords: ["marketing", "marca", "publicidad", "copywriting"] },
    { slug: "finanzas", keywords: ["finanzas", "dinero", "inversion", "econom"] },
    { slug: "psicologia", keywords: ["psicolog", "mente", "emociones", "conducta"] },
    { slug: "romance", keywords: ["amor", "pareja", "romance"] },
    { slug: "fantasia", keywords: ["dragon", "magia", "reino", "fantasia"] },
    { slug: "ciencia-ficcion", keywords: ["galaxia", "espacio", "futuro", "robot", "ciencia ficcion"] },
    { slug: "misterio", keywords: ["misterio", "detective", "crimen", "secreto"] },
    { slug: "thriller", keywords: ["thriller", "suspenso", "asesino", "tension"] },
    { slug: "historia", keywords: ["historia", "guerra", "imperio", "siglo"] },
    { slug: "biografias", keywords: ["biografia", "memorias", "vida de", "autobiografia"] },
    { slug: "filosofia", keywords: ["filosofia", "etica", "stoic", "pensamiento"] },
    { slug: "ciencia", keywords: ["ciencia", "fisica", "quimica", "biologia"] },
    { slug: "salud", keywords: ["salud", "nutricion", "medicina", "bienestar"] },
    { slug: "educacion", keywords: ["educacion", "aprendizaje", "escuela"] },
    { slug: "infantil", keywords: ["ninos", "infantil", "cuento", "juvenil"] },
  ];

  keywordRules.forEach((rule) => {
    if (rule.keywords.some((keyword) => haystack.includes(keyword))) {
      categorySlugs.add(rule.slug);
    }
  });

  return Array.from(categorySlugs);
}

function LoadingBooksGrid() {
  return (
    <div className="books-grid loading-grid">
      {Array.from({ length: 6 }).map((_, index) => (
        <article key={`skeleton-${index}`} className="book-card skeleton-card">
          <div className="skeleton-pill" />
          <div className="skeleton-image" />
          <div className="skeleton-lines">
            <span />
            <span />
            <span className="short" />
          </div>
        </article>
      ))}
    </div>
  );
}

function BookStamp({ className = "", alt = "Libro abierto" }) {
  return <img src="/reference/book-icon.png" alt={alt} className={className} />;
}

function HeroIcon({ name }) {
  const icons = {
    leaf: (
      <>
        <path
          d="M7.2 17.2c3.4-0.1 6.3-1.4 8.2-3.6 2.7-3.2 3.2-7.3 3-10.8-3.3 0.3-7.2 1.1-10 3.9-2 2.1-3.2 4.9-3.2 8"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
        <path d="M11.2 9.7c1.4 2.1 3.1 4.5 4.6 7.7" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
        <path d="M7.5 14.1c1.1 0 2.2 0.3 3.4 0.9" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
      </>
    ),
    tag: (
      <>
        <path
          d="M4.5 11.5l6.4-6.4c0.3-0.3 0.8-0.5 1.2-0.5h6.4c0.9 0 1.6 0.7 1.6 1.6v6.4c0 0.4-0.2 0.8-0.5 1.2l-6.4 6.4c-0.6 0.6-1.7 0.6-2.3 0l-6.4-6.4c-0.6-0.6-0.6-1.7 0-2.3z"
          fill="none"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.7"
        />
        <circle cx="15.4" cy="8.7" r="1.2" fill="currentColor" />
      </>
    ),
    truck: (
      <>
        <path d="M3.4 8.6h11v8.2h-11z" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <path d="M14.4 11h3.5l2.7 2.9v2.9h-6.2z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" />
        <circle cx="8" cy="19.2" r="1.7" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="17.6" cy="19.2" r="1.7" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </>
    ),
    shield: (
      <>
        <path
          d="M12 3.8l7 2.8v5.2c0 4.2-2.6 7.6-7 8.9-4.4-1.3-7-4.7-7-8.9V6.6l7-2.8z"
          fill="none"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.7"
        />
        <path d="M9 12.4l2.1 2.2 4-4.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
      </>
    ),
    featureBook: (
      <>
        <path
          d="M5.1 6.5c0-0.9 0.8-1.7 1.7-1.7h4.1c1.2 0 2.3 0.5 3.1 1.2 0.8-0.8 1.9-1.2 3.1-1.2h0.1c0.9 0 1.7 0.8 1.7 1.7v11.2c0 0.8-0.7 1.3-1.5 1.1-1.3-0.4-2.4-0.6-3.5-0.6-1.4 0-2.7 0.3-3.9 0.9-1.2-0.6-2.5-0.9-3.9-0.9-1.1 0-2.2 0.2-3.5 0.6-0.8 0.2-1.5-0.3-1.5-1.1V6.5z"
          fill="none"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
        <path d="M12 5.8v12" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </>
    ),
    headset: (
      <>
        <path d="M5.2 13.2a6.8 6.8 0 0 1 13.6 0" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
        <path d="M6.4 13.3h1.8c0.9 0 1.6 0.7 1.6 1.6v2.8c0 0.9-0.7 1.6-1.6 1.6H6.9c-0.9 0-1.7-0.8-1.7-1.7v-2.6c0-0.9 0.3-1.7 1.2-1.7z" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <path d="M17.8 13.3h-1.8c-0.9 0-1.6 0.7-1.6 1.6v2.8c0 0.9 0.7 1.6 1.6 1.6h1.3c0.9 0 1.7-0.8 1.7-1.7v-2.6c0-0.9-0.3-1.7-1.2-1.7z" fill="none" stroke="currentColor" strokeWidth="1.7" />
      </>
    ),
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {icons[name]}
    </svg>
  );
}

function BenefitCard({ icon, title, copy }) {
  return (
    <article className="sj-benefit-card">
      <span className="sj-benefit-icon">
        {icon === "featureBook" ? <BookStamp className="book-stamp-image benefit-book-image" /> : <HeroIcon name={icon} />}
      </span>
      <div className="sj-benefit-copy">
        <strong>{title}</strong>
        <span>{copy}</span>
      </div>
    </article>
  );
}

function Home({
  cartItems,
  isCartOpen,
  onAddToCart,
  onCloseCart,
  onOpenCart,
  onNavigate,
  onBrandReset,
  onUpdateQuantity,
  onRemoveItem,
}) {
  const [books, setBooks] = useState([]);
  const [visibleBooks, setVisibleBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showOffersOnly, setShowOffersOnly] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [selectedCombo, setSelectedCombo] = useState("");
  const [categories, setCategories] = useState(
    FALLBACK_CATEGORIES.map((category) => ({ label: category, slug: toSlug(category) || "todos" })),
  );
  const [siteContent, setSiteContent] = useState({});
  const deferredSearchTerm = useDeferredValue(searchTerm);

  usePageMeta({
    title: "Inicio",
    description: "Compra libros físicos, descubre novedades editoriales y confirma tus pedidos por WhatsApp y correo.",
    keywords: "comprar libros físicos, librería online República Dominicana, novelas, negocios, desarrollo personal",
    canonicalPath: "/",
  });

  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true);
        setError("");

        const [booksResponse, categoriesResponse, siteResponse] = await Promise.allSettled([
          getBooks(),
          getCategories(),
          getSiteContent(),
        ]);

        if (booksResponse.status !== "fulfilled") {
          throw booksResponse.reason;
        }

        const loadedBooks = booksResponse.value.data || [];
        setBooks(loadedBooks);
        setVisibleBooks(loadedBooks);

        const backendCategories =
          categoriesResponse.status === "fulfilled" ? categoriesResponse.value.data || [] : [];
        const mergedCategories = [
          ...new Map(
            [
              ...FALLBACK_CATEGORIES.map((category) => ({
                label: category,
                slug: toSlug(category) || "todos",
              })),
              ...backendCategories.map((category) => ({
                label: category.nombre,
                slug: toSlug(category.nombre),
                id: category.id,
              })),
            ].map((category) => [category.slug, category]),
          ).values(),
        ];

        setCategories(mergedCategories);
        if (siteResponse.status === "fulfilled") {
          setSiteContent(siteResponse.value.data || {});
        }
      } catch (loadError) {
        setError(loadError.message || "No se cargó la tienda.");
      } finally {
        setLoading(false);
      }
    }

    loadInitialData();
  }, []);

  useEffect(() => {
    const normalizedSearch = normalizeText(deferredSearchTerm.trim());
    const backendCategoryMap = new Map(
      categories.filter((category) => category.id).map((category) => [category.id, category.slug]),
    );

    const filteredBooks = books.filter((book) => {
      const matchesSearch =
        !normalizedSearch ||
        normalizeText(book.titulo || "").includes(normalizedSearch) ||
        normalizeText(book.autor || "").includes(normalizedSearch);
      const matchesOffer = !showOffersOnly || book.oferta;
      const matchesCombo = selectedCombo !== "lecturas-2x1" || book.promo_2x1;
      const bookCategories = inferCategorySlugs(book, backendCategoryMap);
      const matchesCategory =
        selectedCategory === "todos" || bookCategories.includes(selectedCategory);

      return matchesSearch && matchesOffer && matchesCombo && matchesCategory;
    });

    setVisibleBooks(filteredBooks);
  }, [books, categories, deferredSearchTerm, selectedCategory, selectedCombo, showOffersOnly]);

  const aboutSection = siteContent.about || {};

  const featuredBooks = useMemo(() => {
    const destacados = books.filter((book) => book.destacado);
    return destacados.length ? destacados.slice(0, 4) : books.slice(0, 4);
  }, [books]);

  const newBooks = useMemo(() => {
    const novedades = books.filter((book) => book.novedad);
    return novedades.length ? novedades.slice(0, 4) : books.slice(0, 4);
  }, [books]);

  const recommendedBooks = useMemo(() => {
    const recommended = books.filter((book) => book.recomendado);
    return recommended.length ? recommended.slice(0, 4) : books.filter((book) => book.oferta).slice(0, 4);
  }, [books]);

  const offerBooks = useMemo(() => {
    const offers = books.filter((book) => book.oferta);
    return offers.length ? offers.slice(0, 4) : books.slice(0, 4);
  }, [books]);

  const promo2x1Books = useMemo(
    () => books.filter((book) => book.promo_2x1 && book.stock > 0).slice(0, 4),
    [books],
  );

  const aboutItems = aboutSection.items || [];
  const homeAboutItems = aboutItems.slice(0, HOME_ABOUT_ITEMS_LIMIT);
  const activeFiltersCount =
    Number(showOffersOnly) + Number(selectedCategory !== "todos") + Number(Boolean(selectedCombo));
  const booksById = useMemo(
    () => new Map(books.map((book) => [Number(book.id), book])),
    [books],
  );

  function resetFilters() {
    setSearchTerm("");
    setShowOffersOnly(false);
    setSelectedCategory("todos");
    setSelectedCombo("");
  }

  function scrollToSection(sectionId) {
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function showPromo2x1Offers() {
    setShowOffersOnly(false);
    setSelectedCategory("todos");
    setSelectedCombo("lecturas-2x1");
    scrollToSection("catalogo");
  }

  function handleAddToCart(book) {
    if (!book.promo_2x1 || !book.promo_2x1_partner_id) {
      onAddToCart(book);
      return;
    }

    const partnerBook = booksById.get(Number(book.promo_2x1_partner_id));
    if (!partnerBook || partnerBook.stock <= 0) {
      onAddToCart(book);
      return;
    }

    onAddToCart([book, partnerBook]);
  }

  return (
    <main className="page-shell">
      <Navbar
        cartItems={cartItems}
        onOpenCart={onOpenCart}
        onNavigate={onNavigate}
        onBrandReset={onBrandReset}
        activeView="home"
      />

      <section className="container sj-hero-shell">
        <div className="sj-hero-stage">
          <div className="sj-hero-panel">
            <span className="sj-hero-pattern sj-hero-pattern-top" aria-hidden="true" />
            <span className="sj-hero-pattern sj-hero-pattern-bottom" aria-hidden="true" />

            <div className="sj-hero-panel-inner">
              <span className="sj-hero-book-icon" aria-hidden="true">
                <BookStamp className="book-stamp-image hero-book-image" />
              </span>

              <div className="sj-hero-overline">
                <span />
                <p>Librería</p>
                <span />
              </div>

              <div className="sj-hero-monogram">
                <span className="sj-hero-monogram-copy">SJ</span>
                <span className="sj-hero-leaf" aria-hidden="true">
                  <HeroIcon name="leaf" />
                </span>
              </div>

              <div className="sj-hero-divider" aria-hidden="true">
                <span />
                <i />
                <span />
              </div>

              <h1 className="sj-hero-title">
                <span>Más que libros,</span>
                <em>
                  historias que te
                  <br />
                  transforman.
                </em>
              </h1>

              <p className="sj-hero-support">
                <span className="sj-hero-support-icon" aria-hidden="true">
                  <BookStamp className="book-stamp-image support-book-image" />
                </span>
                Conecta. Aprende. Inspírate.
              </p>

              <div className="sj-hero-actions">
                <button type="button" className="sj-hero-button filled" onClick={() => scrollToSection("catalogo")}>
                  <span className="sj-hero-button-icon" aria-hidden="true">
                    <BookStamp className="book-stamp-image button-book-image" />
                  </span>
                  Ver catálogo
                </button>

                <button
                  type="button"
                  className="sj-hero-button outline"
                  onClick={() => {
                    setShowOffersOnly(true);
                    scrollToSection("catalogo");
                  }}
                >
                  <span className="sj-hero-button-icon" aria-hidden="true">
                    <HeroIcon name="tag" />
                  </span>
                  Ofertas
                </button>
              </div>
            </div>
          </div>

          <div className="sj-hero-seam" aria-hidden="true">
            <span className="sj-hero-seam-glow" />
          </div>

          <div className="sj-hero-scene">
            <img
              src="/reference/libreria-sj-hero-scene.png"
              alt="Pila de libros físicos frente a una biblioteca"
              className="sj-hero-scene-image"
            />
          </div>

          {promo2x1Books.length ? (
            <button type="button" className="hero-promo-2x1-chip" onClick={showPromo2x1Offers}>
              <span>2x1</span>
              <strong>Oferta activa</strong>
              <small>Ver combos</small>
            </button>
          ) : null}
        </div>

        <div className="sj-benefits-row">
          <BenefitCard icon="truck" title="Envíos a todo" copy="el país" />
          <BenefitCard icon="shield" title="Compra 100%" copy="segura" />
          <BenefitCard icon="featureBook" title="Novedades" copy="cada semana" />
          <BenefitCard icon="headset" title="Atención" copy="personalizada" />
        </div>
      </section>

      {promo2x1Books.length ? (
        <section className="container promo-2x1-alert" aria-label="Ofertas 2x1 activas">
          <div className="promo-2x1-burst" aria-hidden="true">
            <span>2x1</span>
          </div>

          <div className="promo-2x1-copy">
            <p className="section-label">Oferta activa</p>
            <h2>Hay combos 2x1 disponibles ahora</h2>
            <p>Agrega un libro marcado y el sistema suma su pareja al carrito automaticamente.</p>
          </div>

          <div className="promo-2x1-books" aria-label="Libros con promocion 2x1">
            {promo2x1Books.slice(0, 3).map((book) => (
              <button type="button" key={`promo-2x1-${book.id}`} onClick={() => setSelectedBook(book)}>
                <span>{book.titulo}</span>
                <small>+ {book.promo_2x1_partner_title || "libro enlazado"}</small>
              </button>
            ))}
          </div>

          <button type="button" className="primary-button promo-2x1-button" onClick={showPromo2x1Offers}>
            Ver 2x1
          </button>
        </section>
      ) : null}

      <section className="container catalog-panel" id="catalogo">
        <div className="section-heading">
          <div>
            <p className="section-label">Catálogo</p>
            <h2>Libros disponibles</h2>
          </div>
        </div>

        <div id="categorias" className="section-anchor" />
        <SearchBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          showOffersOnly={showOffersOnly}
          onToggleOffers={() => setShowOffersOnly((currentValue) => !currentValue)}
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          combos={UPCOMING_COMBOS}
          selectedCombo={selectedCombo}
          onComboChange={setSelectedCombo}
          onClearFilters={resetFilters}
          activeFiltersCount={activeFiltersCount}
        />

        {loading ? <LoadingBooksGrid /> : null}
        {error ? <p className="status-box error-box">{error}</p> : null}
        {!loading && !error && visibleBooks.length === 0 ? (
          <p className="status-box">Sin resultados. Prueba otra búsqueda.</p>
        ) : null}

        {!loading && !error && visibleBooks.length > 0 ? (
          <div className="books-grid">
            {visibleBooks.map((book, index) => (
              <BookCard
                key={book.id}
                book={book}
                animationIndex={index}
                onAddToCart={handleAddToCart}
                onOpenDetails={setSelectedBook}
              />
            ))}
          </div>
        ) : null}
      </section>

      <section className="container editorial-strip" id="novedades">
        <article className="editorial-card">
          <p className="section-label">Destacados</p>
          <h2>Selecciones editoriales del momento</h2>
          <div className="editorial-list">
            {featuredBooks.map((book) => (
              <button
                type="button"
                key={`featured-${book.id}`}
                className="editorial-item"
                onClick={() => setSelectedBook(book)}
              >
                <span className="editorial-item-title">{book.titulo}</span>
                <span className="editorial-item-copy">Lectura destacada para compra física</span>
              </button>
            ))}
          </div>
        </article>

        <article className="editorial-card">
          <p className="section-label">Novedades</p>
          <h2>Recién llegados a la librería</h2>
          <div className="editorial-list">
            {newBooks.map((book) => (
              <button
                type="button"
                key={`new-${book.id}`}
                className="editorial-item"
                onClick={() => setSelectedBook(book)}
              >
                <span className="editorial-item-title">{book.titulo}</span>
                <span className="editorial-item-copy">Nueva edición física disponible</span>
              </button>
            ))}
          </div>
        </article>
      </section>

      <section className="container editorial-strip" id="ofertas">
        <article className="editorial-card">
          <p className="section-label">Ofertas</p>
          <h2>Títulos con precio especial</h2>
          <div className="editorial-list">
            {offerBooks.map((book) => (
              <button
                type="button"
                key={`offer-${book.id}`}
                className="editorial-item"
                onClick={() => setSelectedBook(book)}
              >
                <span className="editorial-item-title">{book.titulo}</span>
                <span className="editorial-item-copy">
                  {book.oferta && book.precio_oferta ? "Oferta activa para compra física" : "Consulta precio especial"}
                </span>
              </button>
            ))}
          </div>
        </article>

        <article className="editorial-card">
          <p className="section-label">Recomendados</p>
          <h2>Lecturas que vale la pena conservar</h2>
          <div className="editorial-list">
            {recommendedBooks.map((book) => (
              <button
                type="button"
                key={`recommended-${book.id}`}
                className="editorial-item"
                onClick={() => setSelectedBook(book)}
              >
                <span className="editorial-item-title">{book.titulo}</span>
                <span className="editorial-item-copy">Elegido por su calidad, ritmo y permanencia</span>
              </button>
            ))}
          </div>
        </article>
      </section>

      <section className="container contact-panel">
        <div className="contact-copy">
          <p className="section-label">{aboutSection.subtitle || "Sobre nosotros"}</p>
          <h2>{aboutSection.title || "Una librería online pensada para comprar con confianza"}</h2>
          <p>
            {aboutSection.body ||
              "Seleccionamos libros físicos con criterio editorial, atención cercana y seguimiento real de cada pedido."}
          </p>
          <div className="info-actions">
            <button type="button" className="primary-button" onClick={() => onNavigate("nosotros")}>
              Sobre nosotros
            </button>
            <button type="button" className="secondary-button" onClick={() => onNavigate("blog")}>
              Leer el blog
            </button>
          </div>
        </div>

        <div className="contact-grid">
          {homeAboutItems.length
            ? homeAboutItems.map((item, index) => {
                const title = getCardTitle(item);
                const body = getCardBody(item);

                return (
                  <article
                    key={`${title || body}-${index}`}
                    className="contact-card"
                    style={{ "--card-index": index }}
                  >
                    <span className="contact-card-number">{String(index + 1).padStart(2, "0")}</span>
                    {title ? <h3>{title}</h3> : null}
                    <p>{body}</p>
                  </article>
                );
              })
            : null}
        </div>
      </section>

      {selectedBook ? (
        <div className="book-modal-backdrop" onClick={() => setSelectedBook(null)}>
          <article className="book-modal" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="icon-button modal-close"
              onClick={() => setSelectedBook(null)}
            >
              Cerrar
            </button>

            <div className="book-modal-grid">
              <img
                src={selectedBook.imagen || "https://placehold.co/400x560/e6dccd/5e4632?text=Book"}
                alt={selectedBook.titulo}
                className="book-modal-image"
              />

              <div className="book-modal-copy">
                <p className="section-label">Detalle del libro</p>
                <h3>{selectedBook.titulo}</h3>
                <p className="modal-author">{selectedBook.autor}</p>

                <div className="modal-meta">
                  <span className={`stock-pill ${selectedBook.stock > 0 ? "in-stock" : "out-stock"}`}>
                    {selectedBook.stock > 0 ? `${selectedBook.stock} disponibles` : "Sin stock"}
                  </span>
                  {selectedBook.oferta ? <span className="book-badge">Oferta activa</span> : null}
                  {selectedBook.destacado ? <span className="book-flag-chip">Destacado</span> : null}
                  {selectedBook.novedad ? <span className="book-flag-chip">Novedad</span> : null}
                  {selectedBook.preventa ? <span className="book-flag-chip">Preventa</span> : null}
                  {selectedBook.recomendado ? <span className="book-flag-chip">Recomendado</span> : null}
                  {selectedBook.promo_2x1 ? (
                    <span className="book-badge promo-badge promo-badge-animated">2x1</span>
                  ) : null}
                </div>

                <p className="modal-description">
                  {selectedBook.descripcion || "Este libro aún no tiene descripción registrada."}
                </p>
                {selectedBook.promo_2x1 ? (
                  <p className="modal-promo-note">
                    Promo 2x1 enlazada con {selectedBook.promo_2x1_partner_title || "otro libro seleccionado"}.
                  </p>
                ) : null}

                <div className="book-prices modal-price">
                  <span className={selectedBook.oferta && selectedBook.precio_oferta ? "price-original" : "book-price"}>
                    RD$ {Number(selectedBook.precio).toFixed(2)}
                  </span>
                  {selectedBook.oferta && selectedBook.precio_oferta ? (
                    <span className="price-offer">RD$ {Number(selectedBook.precio_oferta).toFixed(2)}</span>
                  ) : null}
                </div>

                <button
                  type="button"
                  className="book-button modal-button"
                  onClick={() => handleAddToCart(selectedBook)}
                  disabled={selectedBook.stock <= 0}
                >
                  {selectedBook.stock > 0
                    ? selectedBook.promo_2x1 ? "Agregar combo 2x1" : "Agregar al carrito"
                    : "No disponible"}
                </button>
              </div>
            </div>
          </article>
        </div>
      ) : null}

      <CartDrawer
        cartItems={cartItems}
        isOpen={isCartOpen}
        onClose={onCloseCart}
        onNavigate={onNavigate}
        onUpdateQuantity={onUpdateQuantity}
        onRemoveItem={onRemoveItem}
      />
      <Footer onNavigate={onNavigate} />
    </main>
  );
}

export default Home;
