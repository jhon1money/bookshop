function CartDrawer({
  cartItems,
  isOpen,
  onClose,
  onNavigate,
  onUpdateQuantity,
  onRemoveItem,
}) {
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const total = cartItems.reduce((sum, item) => {
    const price = item.oferta && item.precio_oferta ? Number(item.precio_oferta) : Number(item.precio);
    return sum + price * item.quantity;
  }, 0);

  return (
    <div className={`cart-layer ${isOpen ? "open" : ""}`} aria-hidden={!isOpen}>
      <button type="button" className="cart-backdrop" onClick={onClose} aria-label="Cerrar carrito" />

      <aside className={`cart-drawer ${isOpen ? "open" : ""}`} role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title">
        <div className="cart-drawer-header">
          <div>
            <p className="section-label">Tu carrito</p>
            <h3 id="cart-drawer-title">{totalItems} libros elegidos</h3>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            Cerrar
          </button>
        </div>

        {cartItems.length === 0 ? (
          <p className="cart-empty">Todavía no agregaste libros al carrito.</p>
        ) : (
          <div className="cart-items">
            {cartItems.map((item) => {
              const price = item.oferta && item.precio_oferta ? Number(item.precio_oferta) : Number(item.precio);
              return (
              <article className="cart-item" key={item.id}>
                <img
                  src={item.imagen || "https://placehold.co/120x160/e6dccd/5e4632?text=Libro"}
                  alt=""
                  className="cart-item-thumb"
                />
                <div className="cart-item-copy">
                  <h4>{item.titulo}</h4>
                  <p>{item.autor}</p>
                  <span>RD$ {price.toFixed(2)} c/u</span>
                </div>

                <div className="cart-item-actions">
                  <div className="quantity-stepper">
                    <button type="button" onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}>
                      -
                    </button>
                    <span>{item.quantity}</span>
                    <button type="button" onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}>
                      +
                    </button>
                  </div>
                  <button type="button" className="text-button" onClick={() => onRemoveItem(item.id)}>
                    Quitar
                  </button>
                </div>
              </article>
            );
            })}
          </div>
        )}

        <div className="cart-summary">
          <div className="summary-row">
            <span>Total</span>
            <strong>RD$ {total.toFixed(2)}</strong>
          </div>

          <button
            type="button"
            className="primary-button"
            onClick={() => {
              onClose();
              onNavigate("cart");
            }}
            disabled={cartItems.length === 0}
          >
            Ver carrito completo
          </button>
        </div>
      </aside>
    </div>
  );
}

export default CartDrawer;
