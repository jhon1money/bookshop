function Cart({ cartItems, onBack, onUpdateQuantity, onRemoveItem, onClearCart }) {
  const total = cartItems.reduce((sum, item) => {
    const price = item.oferta && item.precio_oferta ? Number(item.precio_oferta) : Number(item.precio);
    return sum + price * item.quantity;
  }, 0);

  return (
    <main className="page-shell">
      <section className="container cart-page">
        <div className="cart-page-header">
          <div>
            <p className="section-label">Resumen</p>
            <h1>Tu carrito</h1>
          </div>
          <button type="button" className="nav-link" onClick={onBack}>
            Seguir comprando
          </button>
        </div>

        {cartItems.length === 0 ? (
          <div className="status-box">
            Tu carrito esta vacio. Vuelve al catalogo y agrega algunos libros.
          </div>
        ) : (
          <div className="cart-layout">
            <section className="cart-list">
              {cartItems.map((item) => (
                <article className="cart-line" key={item.id}>
                  <div className="cart-line-copy">
                    <h3>{item.titulo}</h3>
                    <p>{item.autor}</p>
                    <span>
                      ${item.oferta && item.precio_oferta ? item.precio_oferta : item.precio} por unidad
                    </span>
                  </div>

                  <div className="cart-line-controls">
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
                      Eliminar
                    </button>
                  </div>
                </article>
              ))}
            </section>

            <aside className="checkout-card">
              <p className="section-label">Pago</p>
              <h2>Resumen del pedido</h2>
              <div className="summary-row">
                <span>Productos</span>
                <strong>{cartItems.length}</strong>
              </div>
              <div className="summary-row">
                <span>Total</span>
                <strong>${total.toFixed(2)}</strong>
              </div>
              <button type="button" className="primary-button" disabled>
                Checkout proximamente
              </button>
              <button type="button" className="secondary-button" onClick={onClearCart}>
                Vaciar carrito
              </button>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}

export default Cart;
