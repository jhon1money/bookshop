import { useDeferredValue, useEffect, useMemo, useState } from "react";
import BookCard from "../components/BookCard";
import Navbar from "../components/Navbar";
import SearchBar from "../components/SearchBar";
import CartDrawer from "../components/CartDrawer";
import TrendingFeed from "../components/TrendingFeed";
import { getBooks, getCategories, getSiteContent } from "../services/api";
import usePageMeta from "../hooks/usePageMeta";

const FALLBACK_CATEGORIES = [
  "Todos",
  "Programacion",
  "Tecnologia",
  "Desarrollo personal",
  "Negocios",
  "Marketing",
  "Finanzas",
  "Psicologia",
  "Romance",
  "Fantasia",
  "Ciencia ficcion",
  "Misterio",
  "Thriller",
  "Historia",
  "Biografias",
  "Filosofia",
  "Ciencia",
  "Salud",
  "Educacion",
  "Infantil",
];

const UPCOMING_COMBOS = [
  { label: "Combo programacion", slug: "combo-programacion" },
  { label: "Pack romance", slug: "pack-romance" },
  { label: "Saga fantasia", slug: "saga-fantasia" },
  { label: "Lecturas 2x1", slug: "lecturas-2x1" },
];

function toSlug(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function inferCategorySlugs(book, backendCategoryMap) {
  const categorySlugs = new Set();
  const haystack = `${book.titulo || ""} ${book.autor || ""} ${book.descripcion || ""}`.toLowerCase();

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
  const [categories, setCategories] = useState(
    FALLBACK_CATEGORIES.map((category) => ({ label: category, slug: toSlug(category) || "todos" })),
  );
  const [siteContent, setSiteContent] = useState({});
  const deferredSearchTerm = useDeferredValue(searchTerm);

  usePageMeta({
    title: "Inicio",
    description: "Compra libros fisicos, descubre novedades editoriales y confirma tus pedidos por WhatsApp y correo.",
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
        setError(loadError.message || "No se pudo cargar la tienda");
      } finally {
        setLoading(false);
      }
    }

    loadInitialData();
  }, []);

  useEffect(() => {
    const normalizedSearch = deferredSearchTerm.trim().toLowerCase();
    const backendCategoryMap = new Map(
      categories.filter((category) => category.id).map((category) => [category.id, category.slug]),
    );

    const filteredBooks = books.filter((book) => {
      const matchesSearch =
        !normalizedSearch ||
        book.titulo.toLowerCase().includes(normalizedSearch) ||
        book.autor.toLowerCase().includes(normalizedSearch);
      const matchesOffer = !showOffersOnly || book.oferta;
      const bookCategories = inferCategorySlugs(book, backendCategoryMap);
      const matchesCategory =
        selectedCategory === "todos" || bookCategories.includes(selectedCategory);

      return matchesSearch && matchesOffer && matchesCategory;
    });

    setVisibleBooks(filteredBooks);
  }, [books, categories, deferredSearchTerm, selectedCategory, showOffersOnly]);

  const heroSection = siteContent.hero || {};
  const bannerPrimary = siteContent.banner_primary || {};
  const bannerSecondary = siteContent.banner_secondary || {};
  const contactSection = siteContent.contact || {};

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

  const preorderBooks = useMemo(() => books.filter((book) => book.preventa).slice(0, 4), [books]);

  const contactItems = contactSection.items || [];
  const activeFiltersCount = Number(showOffersOnly) + Number(selectedCategory !== "todos");

  function resetFilters() {
    setSearchTerm("");
    setShowOffersOnly(false);
    setSelectedCategory("todos");
  }

  return (
    <main className="page-shell">
      <Navbar
        cartItems={cartItems}
        onOpenCart={onOpenCart}
        onNavigate={onNavigate}
        onBrandReset={onBrandReset}
      />

      <section className="hero-panel container">
        <div className="hero-grid">
          <div className="hero-copy-block">
            <p className="eyebrow">{heroSection.subtitle || "Libreria online"}</p>
            <h1>{heroSection.title || "Descubre tu proxima lectura sin salir de casa"}</h1>
            <p className="hero-copy">
              {heroSection.body ||
                "Explora recomendaciones, ofertas y tus proximas compras en una experiencia ligera, moderna y agradable de usar."}
            </p>

            {(heroSection.items || []).length ? (
              <div className="hero-highlights">
                {(heroSection.items || []).slice(0, 3).map((item, index) => (
                  <span key={`${item}-${index}`} className="hero-highlight-pill">
                    {item}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <TrendingFeed />
        </div>
      </section>

      <section className="container banner-strip">
        <article className="banner-card">
          <p className="section-label">{bannerPrimary.subtitle || "Colecciones"}</p>
          <h2>{bannerPrimary.title || "Colecciones destacadas"}</h2>
          <p>{bannerPrimary.body || "Destaca autores, sagas y secciones clave desde el admin."}</p>
          <div className="banner-tags">
            {(bannerPrimary.items || []).map((item, index) => (
              <span key={`${item}-${index}`} className="banner-tag">
                {item}
              </span>
            ))}
          </div>
        </article>

        <article className="banner-card banner-card-secondary">
          <p className="section-label">{bannerSecondary.subtitle || "Experiencia"}</p>
          <h2>{bannerSecondary.title || "Compra con seguimiento claro"}</h2>
          <p>{bannerSecondary.body || "Resumen por correo, orden numerada y mensajes listos para WhatsApp."}</p>
          <button type="button" className="secondary-button" onClick={() => onNavigate("politicas")}>
            {bannerSecondary.cta_text || "Ver mas"}
          </button>
        </article>
      </section>

      <section className="container catalog-panel" id="catalogo">
        <div className="section-heading">
          <div>
            <p className="section-label">Catalogo</p>
            <h2>Libros disponibles</h2>
          </div>
          <span className="book-count">{visibleBooks.length} resultados</span>
        </div>

        <SearchBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          showOffersOnly={showOffersOnly}
          onToggleOffers={() => setShowOffersOnly((currentValue) => !currentValue)}
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          combos={UPCOMING_COMBOS}
          onClearFilters={resetFilters}
          activeFiltersCount={activeFiltersCount}
        />

        {loading ? <LoadingBooksGrid /> : null}
        {error ? <p className="status-box error-box">{error}</p> : null}
        {!loading && !error && visibleBooks.length === 0 ? (
          <p className="status-box">No encontramos libros con esos filtros. Prueba otra busqueda.</p>
        ) : null}

        {!loading && !error && visibleBooks.length > 0 ? (
          <div className="books-grid">
            {visibleBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onAddToCart={onAddToCart}
                onOpenDetails={setSelectedBook}
              />
            ))}
          </div>
        ) : null}
      </section>

      <section className="container editorial-strip" id="destacados">
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
                <span className="editorial-item-copy">Lectura destacada para compra fisica</span>
              </button>
            ))}
          </div>
        </article>

        <article className="editorial-card">
          <p className="section-label">Novedades</p>
          <h2>Recien llegados a la libreria</h2>
          <div className="editorial-list">
            {newBooks.map((book) => (
              <button
                type="button"
                key={`new-${book.id}`}
                className="editorial-item"
                onClick={() => setSelectedBook(book)}
              >
                <span className="editorial-item-title">{book.titulo}</span>
                <span className="editorial-item-copy">Nueva edicion fisica disponible</span>
              </button>
            ))}
          </div>
        </article>
      </section>

      <section className="container editorial-strip">
        <article className="editorial-card">
          <p className="section-label">Recomendados</p>
          <h2>Libros para volver a leer</h2>
          <div className="editorial-list">
            {recommendedBooks.map((book) => (
              <button
                type="button"
                key={`recommended-${book.id}`}
                className="editorial-item"
                onClick={() => setSelectedBook(book)}
              >
                <span className="editorial-item-title">{book.titulo}</span>
                <span className="editorial-item-copy">Elegido por su calidad y demanda</span>
              </button>
            ))}
          </div>
        </article>

        <article className="editorial-card">
          <p className="section-label">Preventa</p>
          <h2>Proximas ediciones para reservar</h2>
          <div className="editorial-list">
            {(preorderBooks.length ? preorderBooks : newBooks).map((book) => (
              <button
                type="button"
                key={`preorder-${book.id}`}
                className="editorial-item"
                onClick={() => setSelectedBook(book)}
              >
                <span className="editorial-item-title">{book.titulo}</span>
                <span className="editorial-item-copy">
                  {book.preventa ? "Reserva anticipada disponible" : "Consulta disponibilidad"}
                </span>
              </button>
            ))}
          </div>
        </article>
      </section>

      <section className="container contact-panel">
        <div className="contact-copy">
          <p className="section-label">{contactSection.subtitle || "Contacto"}</p>
          <h2>{contactSection.title || "Te ayudamos a encontrar tu siguiente libro fisico"}</h2>
          <p>
            {contactSection.body ||
              "Atendemos pedidos por WhatsApp, coordinamos entregas y confirmamos cada compra con un numero de orden por correo."}
          </p>
          <div className="info-actions">
            <button type="button" className="primary-button" onClick={() => onNavigate("contacto")}>
              Ir a contacto
            </button>
            <button type="button" className="secondary-button" onClick={() => onNavigate("envios")}>
              Ver envios
            </button>
          </div>
        </div>

        <div className="contact-grid">
          {contactItems.length
            ? contactItems.map((item, index) => (
                <article key={`${item.title || item}-${index}`} className="contact-card">
                  <h3>{item.title || "Contacto"}</h3>
                  <p>{item.body || item}</p>
                </article>
              ))
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
                </div>

                <p className="modal-description">
                  {selectedBook.descripcion || "Este libro aun no tiene descripcion registrada."}
                </p>

                <div className="book-prices modal-price">
                  <span className="book-price">RD$ {Number(selectedBook.precio).toFixed(2)}</span>
                  {selectedBook.oferta && selectedBook.precio_oferta ? (
                    <span className="price-offer">RD$ {Number(selectedBook.precio_oferta).toFixed(2)}</span>
                  ) : null}
                </div>

                <button
                  type="button"
                  className="book-button modal-button"
                  onClick={() => onAddToCart(selectedBook)}
                  disabled={selectedBook.stock <= 0}
                >
                  {selectedBook.stock > 0 ? "Agregar al carrito" : "No disponible"}
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
    </main>
  );
}

export default Home;
