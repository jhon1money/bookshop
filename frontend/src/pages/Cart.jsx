import { useEffect, useMemo, useState } from "react";
import Footer from "../components/Footer";
import { createOrder, quoteOrder } from "../services/api";
import usePageMeta from "../hooks/usePageMeta";
import { calculateCartSummary, getPromoPairs } from "../utils/cartPromos";

function Cart({ cartItems, onBack, onNavigate, onUpdateQuantity, onRemoveItem, onClearCart, onOrderPlaced }) {
  const [customerData, setCustomerData] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    customer_address: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [customerWhatsappLink, setCustomerWhatsappLink] = useState("");
  const [checkoutSummary, setCheckoutSummary] = useState(() => calculateCartSummary(cartItems));

  usePageMeta({
    title: "Carrito",
    description: "Confirma tu pedido de libros físicos con checkout corto, WhatsApp y correo de seguimiento.",
    canonicalPath: "/carrito",
    robots: "noindex, follow",
  });

  const localSummary = useMemo(() => calculateCartSummary(cartItems), [cartItems]);
  const promoPairs = useMemo(() => getPromoPairs(cartItems), [cartItems]);
  const summary = checkoutSummary || localSummary;

  useEffect(() => {
    if (!cartItems.length) {
      setCheckoutSummary(calculateCartSummary([]));
      return undefined;
    }

    let cancelled = false;

    quoteOrder({
      items: cartItems.map((item) => ({
        book_id: item.id,
        quantity: item.quantity,
      })),
    })
      .then((response) => {
        if (!cancelled) {
          setCheckoutSummary(response.data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCheckoutSummary(localSummary);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [cartItems, localSummary]);

  async function handleSubmitOrder(event) {
    event.preventDefault();

    if (!cartItems.length) {
      setError("Tu carrito está vacío.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setFeedback("");
      setCustomerWhatsappLink("");

      const response = await createOrder({
        ...customerData,
        items: cartItems.map((item) => ({
          book_id: item.id,
          quantity: item.quantity,
        })),
      });

      setFeedback(
        `Pedido ${response.data.order_number} creado.${response.data.email_sent ? " Correo enviado." : ""}`,
      );
      setCheckoutSummary(response.data);
      setCustomerWhatsappLink(response.data.customer_whatsapp_link || "");

      if (response.data.owner_whatsapp_link || response.data.whatsapp_link) {
        window.open(response.data.owner_whatsapp_link || response.data.whatsapp_link, "_blank", "noopener,noreferrer");
      }

      window.setTimeout(() => {
        onOrderPlaced();
      }, 1200);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

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
            Tu carrito está vacío. Vuelve al catálogo y agrega algunos libros.
          </div>
        ) : (
          <div className="cart-layout">
            <section className="cart-list">
              {promoPairs.length ? (
                <div className="cart-promo-pairs">
                  {promoPairs.map((pair) => (
                    <div key={pair.key} className="cart-promo-pair">
                      <span>Combo 2x1</span>
                      <strong>
                        {pair.first.titulo} + {pair.partner.titulo}
                      </strong>
                      <small>
                        {pair.pairs} par{pair.pairs > 1 ? "es" : ""} enlazado{pair.pairs > 1 ? "s" : ""}
                      </small>
                    </div>
                  ))}
                </div>
              ) : null}

              {cartItems.map((item) => (
                <article className="cart-line" key={item.id}>
                  <img
                    src={item.imagen || "https://placehold.co/120x160/e6dccd/5e4632?text=Libro"}
                    alt=""
                    className="cart-line-thumb"
                  />
                  <div className="cart-line-copy">
                    <h3>{item.titulo}</h3>
                    <p>{item.autor}</p>
                    <span>
                      RD$ {item.oferta && item.precio_oferta ? item.precio_oferta : item.precio} por unidad
                    </span>
                    {item.promo_2x1 ? (
                      <span className="cart-promo-note">
                        2x1 con {item.promo_2x1_partner_title || "libro enlazado"}
                      </span>
                    ) : null}
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
              <p className="section-label">Checkout</p>
              <h2>Finaliza tu pedido</h2>
              <p className="checkout-note">
                Te contactaremos por WhatsApp para confirmar disponibilidad, entrega y forma de pago.
              </p>
              <div className="summary-row">
                <span>Libros</span>
                <strong>{summary.total_units || 0}</strong>
              </div>
              <div className="summary-row">
                <span>Subtotal</span>
                <strong>RD$ {Number(summary.subtotal || 0).toFixed(2)}</strong>
              </div>
              {Number(summary.promo_discount_amount || 0) > 0 ? (
                <div className="summary-row discount-row">
                  <span>Promo 2x1</span>
                  <strong>-RD$ {Number(summary.promo_discount_amount).toFixed(2)}</strong>
                </div>
              ) : null}
              {Number(summary.discount_amount || 0) > 0 ? (
                <div className="summary-row discount-row">
                  <span>Descuento {Math.round(Number(summary.discount_rate || 0) * 100)}%</span>
                  <strong>-RD$ {Number(summary.discount_amount).toFixed(2)}</strong>
                </div>
              ) : null}
              {summary.promotions?.length ? (
                <div className="checkout-promo-list">
                  {summary.promotions.map((promotion) => (
                    <span key={promotion.label}>{promotion.label}</span>
                  ))}
                </div>
              ) : null}
              <div className="summary-row summary-total-row">
                <span>Total</span>
                <strong>RD$ {Number(summary.total || 0).toFixed(2)}</strong>
              </div>

              <form className="checkout-form" onSubmit={handleSubmitOrder}>
                <div className="checkout-grid">
                  <label className="checkout-field">
                    <span>Nombre completo</span>
                    <input
                      type="text"
                      value={customerData.customer_name}
                      onChange={(event) =>
                        setCustomerData((currentValue) => ({
                          ...currentValue,
                          customer_name: event.target.value,
                        }))
                      }
                      required
                    />
                  </label>

                  <label className="checkout-field">
                    <span>Correo electrónico</span>
                    <input
                      type="email"
                      value={customerData.customer_email}
                      onChange={(event) =>
                        setCustomerData((currentValue) => ({
                          ...currentValue,
                          customer_email: event.target.value,
                        }))
                      }
                      required
                    />
                  </label>

                  <label className="checkout-field">
                    <span>Teléfono</span>
                    <input
                      type="tel"
                      value={customerData.customer_phone}
                      onChange={(event) =>
                        setCustomerData((currentValue) => ({
                          ...currentValue,
                          customer_phone: event.target.value,
                        }))
                      }
                      required
                    />
                  </label>
                </div>

                <label className="checkout-field">
                  <span>Dirección de entrega</span>
                  <textarea
                    rows="3"
                    value={customerData.customer_address}
                    onChange={(event) =>
                      setCustomerData((currentValue) => ({
                        ...currentValue,
                        customer_address: event.target.value,
                      }))
                    }
                    required
                  />
                </label>

                {error ? <p className="checkout-error">{error}</p> : null}
                {feedback ? <p className="checkout-success">{feedback}</p> : null}
                {customerWhatsappLink ? (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => window.open(customerWhatsappLink, "_blank", "noopener,noreferrer")}
                  >
                    Abrir seguimiento del cliente
                  </button>
                ) : null}

                <div className="checkout-submit-bar">
                  <div className="checkout-submit-copy">
                    <span>Total</span>
                    <strong>RD$ {Number(summary.total || 0).toFixed(2)}</strong>
                  </div>
                  <button type="submit" className="primary-button checkout-submit-button" disabled={submitting}>
                    {submitting ? "Procesando..." : "Confirmar pedido"}
                  </button>
                </div>
              </form>

              <div className="checkout-secondary-actions">
                <button type="button" className="secondary-button" onClick={onClearCart}>
                  Vaciar carrito
                </button>
                <button type="button" className="secondary-button" onClick={() => onNavigate("politicas")}>
                  Ver políticas
                </button>
              </div>
            </aside>
          </div>
        )}
      </section>
      <Footer onNavigate={onNavigate} />
    </main>
  );
}

export default Cart;
