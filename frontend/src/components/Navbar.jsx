function Navbar({ cartItems, onOpenCart, onNavigate }) {
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <header className="container topbar">
      <button type="button" className="brand-mark" onClick={() => onNavigate("home")}>
        BookShop
      </button>

      <nav className="topnav">
        <button type="button" className="nav-link" onClick={() => onNavigate("home")}>
          Inicio
        </button>
        <button type="button" className="nav-link" onClick={() => onNavigate("admin")}>
          Admin
        </button>
        <button type="button" className="cart-link" onClick={onOpenCart}>
          Carrito
          <span className="cart-counter">{totalItems}</span>
        </button>
      </nav>
    </header>
  );
}

export default Navbar;
