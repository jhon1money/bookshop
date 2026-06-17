const WHATSAPP_NUMBER = "18294475730";
const STORE_EMAIL = "Cristofer25suarez@gmail.com";
const WHATSAPP_MESSAGE = "Hola, estoy interesado en comprar libros";
const CREATOR_URL = "https://jhonmon.pythonanywhere.com/";

function Footer({ onNavigate }) {
  const whatsappLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

  function goTo(view) {
    if (onNavigate) {
      onNavigate(view);
    }
  }

  return (
    <footer className="site-footer" aria-labelledby="footer-brand-title">
      <div className="container footer-grid">
        <section className="footer-brand">
          <span className="footer-brand-mark">SJ</span>
          <div>
            <h3 id="footer-brand-title">Librería SJ</h3>
            <p>
              Libros físicos seleccionados con atención cercana y seguimiento claro.
            </p>
            <div className="footer-proof-list">
              <span>Orden confirmada</span>
              <span>Libros físicos</span>
            </div>
          </div>
        </section>

        <nav className="footer-column" aria-label="Enlaces del footer">
          <h3>Explorar</h3>
          <button type="button" onClick={() => goTo("home")}>
            Inicio
          </button>
          <button type="button" onClick={() => goTo("nosotros")}>
            Sobre nosotros
          </button>
          <button type="button" onClick={() => goTo("blog")}>
            Blog de lectores
          </button>
          <button type="button" onClick={() => goTo("envios")}>
            Envíos y entregas
          </button>
          <button type="button" onClick={() => goTo("politicas")}>
            Políticas de compra
          </button>
        </nav>

        <section className="footer-column footer-about-card">
          <h3>Sobre nosotros</h3>
          <p>
            Una librería online para comprar fácil, con catálogo curado y atención humana.
          </p>
          <button type="button" onClick={() => goTo("nosotros")}>
            Conocer la tienda
          </button>
        </section>

        <section className="footer-column">
          <h3>Pago y confianza</h3>
          <div className="payment-tags">
            <span>Transferencia</span>
            <span>Efectivo coordinado</span>
            <span>Confirmación por orden</span>
            <span>Seguimiento por WhatsApp</span>
          </div>
          <div className="social-links" aria-label="Canales rápidos">
            <a href={whatsappLink} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
            <a href={`mailto:${STORE_EMAIL}`}>Correo</a>
          </div>
        </section>
      </div>

      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} Librería SJ. Todos los derechos reservados.</span>
        <span>Compra segura de libros físicos en República Dominicana.</span>
        <a
          className="creator-credit"
          href={CREATOR_URL}
          target="_blank"
          rel="noreferrer"
          aria-label="Visitar página de Jhon Jimenez, CEO de Quisqueya Tech Labs"
        >
          <span className="creator-credit-copy">
            <small>Creado por</small>
            <strong>Jhon Jimenez</strong>
            <em>CEO Quisqueya Tech Labs</em>
          </span>
          <span className="creator-credit-gif" aria-hidden="true">
            <img
              src="/reference/quisqueya-tech-labs-badge.gif"
              alt=""
              width="92"
              height="65"
              loading="lazy"
              decoding="async"
            />
          </span>
        </a>
      </div>
    </footer>
  );
}

export default Footer;
