import { useState } from "react";

function Icon({ name }) {
  const icons = {
    chevron: (
      <path
        d="M7.25 9.5L12 14.25L16.75 9.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="6.1" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M15.6 15.6L20 20" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8.2" r="3.1" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M5.5 19.2C6.9 16.3 9.1 14.9 12 14.9C14.9 14.9 17.1 16.3 18.5 19.2"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.8"
        />
      </>
    ),
    cart: (
      <>
        <path
          d="M2.8 5.5H5.7L7.3 13.7H17.4L19.2 7H7.7"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <circle cx="9.3" cy="18.5" r="1.15" fill="currentColor" />
        <circle cx="16.8" cy="18.5" r="1.15" fill="currentColor" />
      </>
    ),
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {icons[name]}
    </svg>
  );
}

function Navbar({ cartItems, onOpenCart, onNavigate, onBrandReset, activeView = "home" }) {
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  function closeMenu() {
    setIsMenuOpen(false);
  }

  function handleNavigate(view) {
    onNavigate(view);
    closeMenu();
  }

  function navigateToSection(sectionId) {
    onNavigate("home");
    closeMenu();

    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 120);
    });
  }

  return (
    <header className="container topbar">
      <button type="button" className="brand-cluster" onClick={onBrandReset} aria-label="Ir al inicio">
        <span className="brand-seal" aria-hidden="true">
          <span className="brand-seal-book">
            <img src="/reference/book-icon.png" alt="" className="brand-seal-book-image" />
          </span>
          <span className="brand-seal-copy">SJ</span>
        </span>
        <span className="brand-wordmark">Librería SJ</span>
      </button>

      <nav className={`topnav ${isMenuOpen ? "open" : ""}`} aria-label="Principal">
        <div className="topnav-links">
          <button
            type="button"
            className={`nav-link ${activeView === "home" ? "active" : ""}`}
            onClick={onBrandReset}
          >
            Inicio
          </button>
          <button type="button" className="nav-link" onClick={() => navigateToSection("catalogo")}>
            Libros
            <span className="nav-chevron">
              <Icon name="chevron" />
            </span>
          </button>
          <button type="button" className="nav-link" onClick={() => navigateToSection("categorias")}>
            Categorías
            <span className="nav-chevron">
              <Icon name="chevron" />
            </span>
          </button>
          <button type="button" className="nav-link" onClick={() => navigateToSection("novedades")}>
            Novedades
          </button>
          <button type="button" className="nav-link" onClick={() => navigateToSection("ofertas")}>
            Ofertas
          </button>
          <button
            type="button"
            className={`nav-link ${activeView === "blog" ? "active" : ""}`}
            onClick={() => handleNavigate("blog")}
          >
            Blog
          </button>
          <button
            type="button"
            className={`nav-link ${activeView === "nosotros" ? "active" : ""}`}
            onClick={() => handleNavigate("nosotros")}
          >
            Nosotros
          </button>
        </div>
      </nav>

      <div className="topnav-utilities">
        <button
          type="button"
          className="utility-link"
          aria-label="Buscar en el catálogo"
          onClick={() => navigateToSection("catalogo")}
        >
          <Icon name="search" />
        </button>
        <button
          type="button"
          className="utility-link"
          aria-label="Conocer la librería"
          onClick={() => handleNavigate("nosotros")}
        >
          <Icon name="user" />
        </button>
        <button
          type="button"
          className="utility-link utility-cart"
          aria-label="Abrir carrito"
          onClick={() => {
            onOpenCart();
            closeMenu();
          }}
        >
          <Icon name="cart" />
          <span className="cart-counter">{totalItems}</span>
        </button>
      </div>

      <button
        type="button"
        className={`menu-toggle ${isMenuOpen ? "active" : ""}`}
        onClick={() => setIsMenuOpen((currentValue) => !currentValue)}
        aria-expanded={isMenuOpen}
        aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
      >
        <span />
        <span />
        <span />
      </button>
    </header>
  );
}

export default Navbar;
