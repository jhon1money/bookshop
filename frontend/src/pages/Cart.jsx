import { useState } from "react";
import { createOrder } from "../services/api";
import usePageMeta from "../hooks/usePageMeta";

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

  usePageMeta({
    title: "Carrito",
    description: "Confirma tu pedido de libros fisicos con checkout corto, WhatsApp y correo de seguimiento.",
  });

  const total = cartItems.reduce((sum, item) => {
    const price = item.oferta && item.precio_oferta ? Number(item.precio_oferta) : Number(item.precio);
    return sum + price * item.quantity;
  }, 0);

  async function handleSubmitOrder(event) {
    event.preventDefault();

    if (!cartItems.length) {
      setError("Tu carrito esta vacio.");
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
        `Pedido ${response.data.order_number} creado correctamente.${response.data.email_sent ? " Tambien enviamos un correo de confirmacion." : ""}`,
      );
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
                      RD$ {item.oferta && item.precio_oferta ? item.precio_oferta : item.precio} por unidad
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
              <p className="section-label">Checkout</p>
              <h2>Finaliza tu pedido</h2>
              <div className="summary-row">
                <span>Productos</span>
                <strong>{cartItems.length}</strong>
              </div>
              <div className="summary-row">
                <span>Total</span>
                <strong>RD$ {total.toFixed(2)}</strong>
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
                    <span>Correo electronico</span>
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
                    <span>Telefono</span>
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
                  <span>Direccion de entrega</span>
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
                    <strong>RD$ {total.toFixed(2)}</strong>
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
                  Ver politicas
                </button>
              </div>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}

export default Cart;
