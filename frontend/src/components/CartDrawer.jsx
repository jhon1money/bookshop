import { calculateCartSummary, getCartItemPrice, getPromoPairs } from "../utils/cartPromos";

function CartDrawer({
  cartItems,
  isOpen,
  onClose,
  onNavigate,
  onUpdateQuantity,
  onRemoveItem,
}) {
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const summary = calculateCartSummary(cartItems);
  const promoPairs = getPromoPairs(cartItems);

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
            {promoPairs.length ? (
              <div className="cart-drawer-promo-pairs">
                {promoPairs.map((pair) => (
                  <span key={pair.key}>
                    2x1: {pair.first.titulo} + {pair.partner.titulo}
                  </span>
                ))}
              </div>
            ) : null}

            {cartItems.map((item) => {
              const price = getCartItemPrice(item);
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
                  {item.promo_2x1 ? (
                    <span className="cart-promo-note">
                      2x1 con {item.promo_2x1_partner_title || "libro enlazado"}
                    </span>
                  ) : null}
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
          {Number(summary.promo_discount_amount || 0) > 0 ? (
            <div className="summary-row discount-row">
              <span>Promo 2x1</span>
              <strong>-RD$ {Number(summary.promo_discount_amount).toFixed(2)}</strong>
            </div>
          ) : null}

          {Number(summary.discount_amount || 0) > 0 ? (
            <div className="summary-row discount-row">
              <span>Descuento</span>
              <strong>-RD$ {Number(summary.discount_amount).toFixed(2)}</strong>
            </div>
          ) : null}

          <div className="summary-row">
            <span>Total</span>
            <strong>RD$ {Number(summary.total || 0).toFixed(2)}</strong>
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
