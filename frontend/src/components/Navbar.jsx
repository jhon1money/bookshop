import { useState } from "react";

function Navbar({ cartItems, onOpenCart, onNavigate, onBrandReset }) {
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  function handleNavigate(view) {
    onNavigate(view);
    setIsMenuOpen(false);
  }

  return (
    <header className="container topbar">
      <div className="brand-cluster">
        <button type="button" className="brand-mark" onClick={onBrandReset}>
          BookShop
        </button>
        <span className="brand-badge">libros fisicos</span>
      </div>

      <button
        type="button"
        className={`menu-toggle ${isMenuOpen ? "active" : ""}`}
        onClick={() => setIsMenuOpen((currentValue) => !currentValue)}
        aria-label="Abrir menu"
      >
        <span />
        <span />
        <span />
      </button>

      <nav className={`topnav ${isMenuOpen ? "open" : ""}`}>
        <button type="button" className="nav-link" onClick={() => handleNavigate("home")}>
          Inicio
        </button>
        <button type="button" className="nav-link" onClick={() => handleNavigate("nosotros")}>
          Nosotros
        </button>
        <button type="button" className="nav-link" onClick={() => handleNavigate("preguntas")}>
          FAQ
        </button>
        <button type="button" className="nav-link" onClick={() => handleNavigate("envios")}>
          Envios
        </button>
        <button type="button" className="nav-link" onClick={() => handleNavigate("contacto")}>
          Contacto
        </button>
        <button
          type="button"
          className="cart-link"
          onClick={() => {
            onOpenCart();
            setIsMenuOpen(false);
          }}
        >
          Carrito
          <span className="cart-counter">{totalItems}</span>
        </button>
      </nav>
    </header>
  );
}

export default Navbar;
