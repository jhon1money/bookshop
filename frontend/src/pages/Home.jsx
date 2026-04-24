import { useDeferredValue, useEffect, useState } from "react";
import BookCard from "../components/BookCard";
import Navbar from "../components/Navbar";
import SearchBar from "../components/SearchBar";
import CartDrawer from "../components/CartDrawer";
import { getBooks, getCategories } from "../services/api";

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
    { slug: "finanzas", keywords: ["finanzas", "dinero", "inversion", "econom", "bolsa"] },
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
    { slug: "educacion", keywords: ["educacion", "aprendizaje", "escuela", "ense"] },
    { slug: "infantil", keywords: ["ninos", "infantil", "cuento", "juvenil"] },
  ];

  keywordRules.forEach((rule) => {
    if (rule.keywords.some((keyword) => haystack.includes(keyword))) {
      categorySlugs.add(rule.slug);
    }
  });

  return Array.from(categorySlugs);
}

function Home({
  cartItems,
  isCartOpen,
  onAddToCart,
  onCloseCart,
  onOpenCart,
  onNavigate,
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
  const deferredSearchTerm = useDeferredValue(searchTerm);

  useEffect(() => {
    async function loadBooks() {
      try {
        setLoading(true);
        setError("");

        const [booksResponse, categoriesResponse] = await Promise.allSettled([
          getBooks(),
          getCategories(),
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
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    }

    loadBooks();
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

  return (
    <main className="page-shell">
      <Navbar
        cartItems={cartItems}
        onOpenCart={onOpenCart}
        onNavigate={onNavigate}
      />

      <section className="hero-panel container">
        <p className="eyebrow">Libreria online</p>
        <h1>Descubre tu proxima lectura sin salir de casa</h1>
        <p className="hero-copy">
          Tu API ya esta respondiendo. Ahora el frontend muestra el catalogo real de libros
          con un diseno mas claro y listo para seguir creciendo.
        </p>
      </section>

      <section className="container catalog-panel">
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
          resultCount={visibleBooks.length}
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          combos={UPCOMING_COMBOS}
        />

        {loading ? <p className="status-box">Cargando libros...</p> : null}
        {error ? <p className="status-box error-box">{error}</p> : null}
        {!loading && !error && visibleBooks.length === 0 ? (
          <p className="status-box">No hay libros registrados todavia.</p>
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

      {selectedBook ? (
        <div className="book-modal-backdrop" onClick={() => setSelectedBook(null)}>
          <article
            className="book-modal"
            onClick={(event) => event.stopPropagation()}
          >
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
                  <span className="stock-pill in-stock">
                    {selectedBook.stock > 0
                      ? `${selectedBook.stock} disponibles`
                      : "Sin stock"}
                  </span>
                  {selectedBook.oferta ? <span className="book-badge">Oferta activa</span> : null}
                </div>

                <p className="modal-description">
                  {selectedBook.descripcion || "Este libro aun no tiene descripcion registrada."}
                </p>

                <div className="book-prices modal-price">
                  <span className="book-price">${Number(selectedBook.precio).toFixed(2)}</span>
                  {selectedBook.oferta && selectedBook.precio_oferta ? (
                    <span className="price-offer">
                      ${Number(selectedBook.precio_oferta).toFixed(2)}
                    </span>
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
