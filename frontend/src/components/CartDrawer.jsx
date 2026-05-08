function CartDrawer({
  cartItems,
  isOpen,
  onClose,
  onNavigate,
  onUpdateQuantity,
  onRemoveItem,
}) {
  const total = cartItems.reduce((sum, item) => {
    const price = item.oferta && item.precio_oferta ? Number(item.precio_oferta) : Number(item.precio);
    return sum + price * item.quantity;
  }, 0);

  return (
    <aside className={`cart-drawer ${isOpen ? "open" : ""}`}>
      <div className="cart-drawer-header">
        <div>
          <p className="section-label">Tu carrito</p>
          <h3>{cartItems.length} libros elegidos</h3>
        </div>
        <button type="button" className="icon-button" onClick={onClose}>
          Cerrar
        </button>
      </div>

      {cartItems.length === 0 ? (
        <p className="cart-empty">Todavia no agregaste libros al carrito.</p>
      ) : (
        <div className="cart-items">
          {cartItems.map((item) => (
            <article className="cart-item" key={item.id}>
              <div>
                <h4>{item.titulo}</h4>
                <p>{item.autor}</p>
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
          ))}
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
  );
}

export default CartDrawer;
